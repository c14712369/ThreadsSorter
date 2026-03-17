import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(req: Request) {
  try {
    const { url } = await req.json()

    if (!url || (!url.includes('threads.net') && !url.includes('threads.com') && !url.includes('instagram.com'))) {
      return NextResponse.json({ error: '無效的連結 (僅支援 Threads 或 Instagram)' }, { status: 400 })
    }

    // Normalize threads.com to threads.net and strip query params
    let targetUrl = url
    if (url.includes('threads.com') || url.includes('threads.net')) {
      const parsed = new URL(url)
      parsed.hostname = parsed.hostname.replace('threads.com', 'threads.net')
      parsed.search = '' // Strip all trackers (?xmt=...)
      targetUrl = parsed.toString()
    }

    // Try to extract handle from URL path as primary fallback
    let authorHandleFromUrl = ''
    if (targetUrl.includes('threads.net')) {
      const parts = new URL(targetUrl).pathname.split('/')
      const handlePart = parts.find(p => p.startsWith('@'))
      if (handlePart) authorHandleFromUrl = handlePart.replace('@', '')
    }

    console.log('--- Final Target URL:', targetUrl)

    const response = await fetch(targetUrl, {
      headers: {
        // Many social sites provide better OG tags to known crawlers
        'User-Agent': 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      next: { revalidate: 3600 } 
    })

    if (!response.ok) {
      console.error('Fetch failed for URL:', targetUrl, 'Status:', response.status)
      // If Slackbot fails, try common browser UA as fallback
      const retryRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
      })
      if (!retryRes.ok) throw new Error(`無法存取網頁 (${response.status})`)
      return await handleHtml(await retryRes.text(), targetUrl, authorHandleFromUrl)
    }

    return await handleHtml(await response.text(), targetUrl, authorHandleFromUrl)

  } catch (error: any) {
    console.error('Parse API Error:', error.message)
    return NextResponse.json({ error: error.message || '解析失敗' }, { status: 500 })
  }
}

async function handleHtml(html: string, originalUrl: string, handleFallback: string) {
  const $ = cheerio.load(html)

  // 1. Try Title (Multiple variants)
  let title = $('meta[property="og:title"]').attr('content') || 
              $('meta[name="twitter:title"]').attr('content') || 
              $('title').text() || ''

  // 2. Try Description (Multiple variants)
  let description = $('meta[property="og:description"]').attr('content') || 
                    $('meta[name="twitter:description"]').attr('content') || 
                    $('meta[name="description"]').attr('content') || ''

  // 3. Try Image (Filter out obvious video formats)
  let previewImage = $('meta[property="og:image"]').attr('content') || 
                     $('meta[name="twitter:image"]').attr('content') || 
                     $('meta[name="image"]').attr('content') ||
                     $('link[rel="image_src"]').attr('href') || ''

  // Filter out videos/mp4 if they sneak into image tags
  if (previewImage.toLowerCase().endsWith('.mp4') || previewImage.toLowerCase().endsWith('.mov')) {
    previewImage = ''
  }

  // Fallback if no meta image or it was a video
  if (!previewImage) {
    $('img').each((_, el) => {
      const src = $(el).attr('src')
      if (src && !src.startsWith('data:') && !src.toLowerCase().endsWith('.mp4') && !src.toLowerCase().endsWith('.mov')) {
        previewImage = src
        return false // Break loop
      }
    })
  }

  // Resolve relative URLs
  if (previewImage && !previewImage.startsWith('http')) {
    try {
      const baseUrl = new URL(originalUrl)
      previewImage = new URL(previewImage, baseUrl.origin).toString()
    } catch (e) {
      // ignore
    }
  }

  // 4. JSON-LD Fallback
  if (!description) {
    try {
      $('script[type="application/ld+json"]').each((_, el) => {
        const json = JSON.parse($(el).html() || '{}')
        description = description || json.articleBody || json.description || ''
        title = title || json.author?.name || ''
      })
    } catch (e) {}
  }

  // 5. Cleanup description (remove extra spaces/newlines)
  description = description.trim().replace(/\s+/g, ' ')

  // 1. Try URL Path (Most reliable for Threads)
  let authorHandle = handleFallback || ''

  // 2. Try OG Title (Look for "@handle" pattern)
  if (!authorHandle) {
    const handleMatch = title.match(/@([a-zA-Z0-9._]+)/)
    if (handleMatch) {
      authorHandle = handleMatch[1]
    }
  }

  // 3. Try "Author Name on Threads" pattern (Only if short)
  if (!authorHandle && originalUrl.includes('threads')) {
    const parts = title.split(' on Threads')
    if (parts.length > 1 && parts[0].length < 30) {
      authorHandle = parts[0].trim()
    }
  }

  // 4. Try Instagram Pattern
  if (!authorHandle && originalUrl.includes('instagram')) {
    const parts = title.split(' on Instagram')
    if (parts.length > 1 && parts[0].length < 30) {
      authorHandle = parts[0].trim()
    }
  }

  console.log('Final Result:', { author: authorHandle, descLength: description?.length })

  return NextResponse.json({
    author_handle: authorHandle || '未知作者',
    content_snippet: description || '',
    preview_image: previewImage,
    url: originalUrl
  })
}
