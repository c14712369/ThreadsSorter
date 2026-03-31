import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createClient } from '@/lib/supabase-server'
import crypto from 'crypto'

const BOT_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
const FB_UA = 'facebookexternalhit/1.1'

async function uploadToSupabase(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, { headers: { 'User-Agent': BOT_UA } })
    if (!response.ok) return null

    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'
    const hash = crypto.createHash('md5').update(imageUrl).digest('hex')
    const fileName = `${hash}.${ext}`

    const supabase = await createClient()
    const { error } = await supabase.storage
      .from('memos')
      .upload(fileName, buffer, { contentType, upsert: true })
    if (error) throw error

    const { data: { publicUrl } } = supabase.storage.from('memos').getPublicUrl(fileName)
    return publicUrl
  } catch (err: any) {
    console.error('uploadToSupabase error:', err?.message || err)
    return null
  }
}

/** 用 Jina AI Reader 取得 Threads 貼文內文（突破 JS 渲染限制） */
async function fetchViaJina(url: string): Promise<{ content: string; description: string; images: string[] }> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return { content: '', description: '', images: [] }
    const json = await res.json()

    const description: string = json.data?.description || ''
    const content: string = json.data?.content || ''

    // 從 content 中找出所有 CDN 圖片（貼文圖，排除頭像 -19）
    const imgMatches: string[] = (content.match(/https:\/\/scontent[^\s)"\]]+/g) || [])
      .filter((u: string) => !u.includes('t51.82787-19') && !u.includes('rsrc.php'))
      .map((u: string) => u.replace(/&amp;/g, '&'))

    return { content, description, images: imgMatches }
  } catch {
    return { content: '', description: '', images: [] }
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: '無效連結' }, { status: 400 })

    const cleanUrl = url.split('?')[0]
    const urlObj = new URL(cleanUrl)
    const isThreads = urlObj.hostname.includes('threads.net') || urlObj.hostname.includes('threads.com')
    const isIG = urlObj.hostname.includes('instagram.com')

    if (!isThreads && !isIG) {
      return NextResponse.json({ error: '僅支援 Threads 或 Instagram 連結' }, { status: 400 })
    }

    // 從 URL 解析作者 handle
    const pathParts = urlObj.pathname.split('/')
    const handlePart = pathParts.find(p => p.startsWith('@'))
    const authorHandle = handlePart ? handlePart.replace('@', '') : '未知作者'

    // 並行：Jina 抓內文 + 抓作者 bio + 抓頭像
    const [jinaResult, profileResult] = await Promise.allSettled([
      fetchViaJina(cleanUrl),
      (async () => {
        const profileDomain = isIG ? 'instagram.com' : 'threads.com'
        const pRes = await fetch(`https://www.${profileDomain}/@${authorHandle}`, {
          headers: { 'User-Agent': FB_UA },
          redirect: 'follow',
        })
        if (!pRes.ok) return { bio: '', avatar: '' }
        const html = await pRes.text()
        const $ = cheerio.load(html)

        // Bio
        const raw = $('meta[property="og:description"]').attr('content') || ''
        const isLoginPrompt = raw.includes('Join Threads') || raw.toLowerCase().includes('log in') || raw.toLowerCase().includes('sign up')
        let bio = ''
        if (!isLoginPrompt && raw) {
          const parts = raw.split('•')
          if (parts.length >= 3) {
            bio = parts.slice(2).join('•').replace(/\s*See the latest\b.*/i, '').trim()
              || `${parts[0].trim()} · ${parts[1].trim()}`
          } else {
            bio = raw.replace(/\s*See the latest\b.*/i, '').trim()
          }
        }

        // Avatar
        const ogImg = $('meta[property="og:image"]').attr('content')?.replace(/&amp;/g, '&') || ''
        const avatar = ogImg && !ogImg.includes('rsrc.php') ? ogImg : ''

        return { bio, avatar }
      })()
    ])

    const jina = jinaResult.status === 'fulfilled' ? jinaResult.value : { content: '', description: '', images: [] }
    const profile = profileResult.status === 'fulfilled' ? profileResult.value : { bio: '', avatar: '' }

    const authorBio = profile.bio || ''

    // 貼文內文：優先用 Jina description（最乾淨），再 fallback content 開頭
    let contentSnippet = jina.description || ''
    if (!contentSnippet && jina.content) {
      // 取第一段（去掉 markdown 格式）
      const firstLine = jina.content.split('\n').find(l => l.replace(/[#\[\]()]/g, '').trim().length > 10) || ''
      contentSnippet = firstLine.replace(/^#+\s*/, '').trim()
    }
    if (contentSnippet.length > 50) contentSnippet = contentSnippet.substring(0, 50) + '...'

    // 圖片：優先貼文圖，沒有才用頭像
    let previewImage: string | null = null
    const postImages = jina.images
    const candidateUrl = postImages.length > 0 ? postImages[0] : profile.avatar || ''

    if (candidateUrl) {
      const storageUrl = await uploadToSupabase(candidateUrl)
      previewImage = storageUrl || candidateUrl
    }

    return NextResponse.json({
      author_handle: authorHandle,
      author_bio: authorBio,
      content_snippet: contentSnippet,
      preview_image: previewImage,
      url: cleanUrl
    })

  } catch (error: any) {
    console.error('parse-link error:', error)
    return NextResponse.json({ error: '解析失敗' }, { status: 500 })
  }
}
