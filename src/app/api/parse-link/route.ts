import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createClient } from '@/lib/supabase-server'
import crypto from 'crypto'

const BOT_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
const FB_UA = 'facebookexternalhit/1.1'

/** 從 HTML 字串中提取第一張貼文圖（排除大頭貼） */
function extractPostImage(html: string): string {
  const cdnMatches = html.match(/https:\/\/scontent[^"' )\\]+?t51\.82787-15[^"' )\\]+/g)
  if (cdnMatches && cdnMatches.length > 0) {
    return cdnMatches[0].replace(/&amp;/g, '&').replace(/\\u0026/g, '&').replace(/\\/g, '')
  }

  const fbcdnMatches = html.match(/https:\/\/[^"'\\]+?\.fbcdn\.net\/[^"'\\]+/g)
  if (fbcdnMatches) {
    const postImg = fbcdnMatches.find(u => u.includes('-15/') && !u.includes('-19/') && !u.includes('profile'))
    if (postImg) return postImg.replace(/\\u0026/g, '&').replace(/\\/g, '')
  }

  return ''
}

async function uploadToSupabase(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': BOT_UA }
    })
    if (!response.ok) return null

    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const extension = contentType.split('/')[1] || 'jpg'
    
    // 使用 URL 的 hash 作為檔名，避免重複上傳同一張圖
    const hash = crypto.createHash('md5').update(imageUrl).digest('hex')
    const fileName = `${hash}.${extension}`

    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from('memos')
      .upload(fileName, buffer, {
        contentType,
        upsert: true
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('memos')
      .getPublicUrl(fileName)

    return publicUrl
  } catch (err) {
    console.error('Storage upload error:', err)
    return null
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: '無效連結' }, { status: 400 })

    const cleanUrl = url.split('?')[0].replace('threads.com', 'threads.net')
    const cacheBuster = `?t=${Date.now()}`
    const urlObj = new URL(cleanUrl)
    const isThreads = urlObj.hostname.includes('threads.net')

    const embedUrl = cleanUrl.replace(/\/$/, '') + '/embed/' + cacheBuster

    const [embedResult, mainResult] = await Promise.allSettled([
      isThreads
        ? fetch(embedUrl, { headers: { 'User-Agent': BOT_UA }, cache: 'no-store' }).then(r => r.ok ? r.text() : '')
        : Promise.resolve(''),
      fetch(cleanUrl + cacheBuster, {
        headers: { 'User-Agent': BOT_UA, 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8' },
        cache: 'no-store'
      }).then(r => r.ok ? r.text() : '')
    ])

    const embedHtml = embedResult.status === 'fulfilled' ? embedResult.value : ''
    const mainHtml  = mainResult.status  === 'fulfilled' ? mainResult.value  : ''

    let previewImage = extractPostImage(embedHtml)
    let title = ''
    let description = ''

    if (mainHtml) {
      const $ = cheerio.load(mainHtml)
      title       = $('meta[property="og:title"]').attr('content') || $('title').text() || ''
      description = $('meta[property="og:description"]').attr('content') || ''

      if (!previewImage) previewImage = extractPostImage(mainHtml)
      if (!previewImage) {
        const ogImg = $('meta[property="og:image"]').attr('content') || ''
        if (ogImg && !ogImg.includes('t51.2885-19') && !ogImg.includes('-19/')) {
          previewImage = ogImg
        }
      }
    }

    // 嘗試上傳到 Supabase Storage
    if (previewImage) {
      const storageUrl = await uploadToSupabase(previewImage)
      if (storageUrl) previewImage = storageUrl
    }

    let authorHandle = ''
    const handleMatch = title.match(/@([a-zA-Z0-9._]+)/)
    if (handleMatch) {
      authorHandle = handleMatch[1]
    } else {
      const parts = urlObj.pathname.split('/')
      const hp = parts.find(p => p.startsWith('@'))
      if (hp) authorHandle = hp.replace('@', '')
    }

    let authorBio = ''
    let authorAvatar = ''
    if (authorHandle && isThreads) {
      try {
        const pRes = await fetch(`https://www.threads.net/@${authorHandle}${cacheBuster}`, {
          headers: { 'User-Agent': FB_UA },
          cache: 'no-store'
        })
        if (pRes.ok) {
          const profileHtml = await pRes.text()
          const $p = cheerio.load(profileHtml)
          const raw = $p('meta[property="og:description"]').attr('content') || ''
          const parts = raw.split('•')
          if (parts.length >= 3) {
            const bioRaw = parts.slice(2).join('•')
            const bioClean = bioRaw.replace(/\s*See the latest\b.*/i, '').trim()
            authorBio = bioClean || `${parts[0].trim()} · ${parts[1].trim()}`
          } else {
            authorBio = raw.replace(/\s*See the latest\b.*/i, '').trim()
          }
          const ogImg = $p('meta[property="og:image"]').attr('content') || ''
          if (ogImg) authorAvatar = ogImg
        }
      } catch (e) {}
    }

    description = description.trim().replace(/\s+/g, ' ')
    if (description.length > 50) description = description.substring(0, 50) + '...'

    if (!previewImage && authorAvatar) {
      const avatarStorageUrl = await uploadToSupabase(authorAvatar)
      previewImage = avatarStorageUrl || authorAvatar
    }

    return NextResponse.json({
      author_handle: authorHandle || '未知作者',
      author_bio: authorBio || '',
      content_snippet: description || '',
      preview_image: previewImage,
      url: cleanUrl
    })

  } catch (error: any) {
    return NextResponse.json({ error: '解析失敗' }, { status: 500 })
  }
}
