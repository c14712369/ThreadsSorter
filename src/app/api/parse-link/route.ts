import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

const BOT_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
const FB_UA = 'facebookexternalhit/1.1'

/** 從 HTML 字串中提取第一張貼文圖（排除大頭貼）
 *  Instagram/Threads 貼文圖：t51.82787-15
 *  大頭貼：t51.2885-19  → 排除
 */
function extractPostImage(html: string): string {
  // 優先抓 cdninstagram.com 貼文圖（embed 頁面會出現）
  const cdnMatches = html.match(/https:\/\/scontent[^"' )\\]+?t51\.82787-15[^"' )\\]+/g)
  if (cdnMatches && cdnMatches.length > 0) {
    return cdnMatches[0].replace(/&amp;/g, '&').replace(/\\u0026/g, '&').replace(/\\/g, '')
  }

  // 次選：fbcdn.net 貼文圖（-15/ 路徑，排除 -19/ 大頭貼）
  const fbcdnMatches = html.match(/https:\/\/[^"'\\]+?\.fbcdn\.net\/[^"'\\]+/g)
  if (fbcdnMatches) {
    const postImg = fbcdnMatches.find(u => u.includes('-15/') && !u.includes('-19/') && !u.includes('profile'))
    if (postImg) return postImg.replace(/\\u0026/g, '&').replace(/\\/g, '')
  }

  return ''
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: '無效連結' }, { status: 400 })

    // 標準化網址，加上隨機參數避免快取
    const cleanUrl = url.split('?')[0].replace('threads.com', 'threads.net')
    const cacheBuster = `?t=${Date.now()}`
    const urlObj = new URL(cleanUrl)
    const isThreads = urlObj.hostname.includes('threads.net')

    // --- 策略 A & B 並行 ---
    const embedUrl = cleanUrl.replace(/\/$/, '') + '/embed/' + cacheBuster

    const [embedResult, mainResult] = await Promise.allSettled([
      // 策略 A: embed 頁面
      isThreads
        ? fetch(embedUrl, { headers: { 'User-Agent': BOT_UA }, cache: 'no-store' }).then(r => r.ok ? r.text() : '')
        : Promise.resolve(''),
      // 策略 B: 主頁面
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

    // 3. 提取帳號
    let authorHandle = ''
    const handleMatch = title.match(/@([a-zA-Z0-9._]+)/)
    if (handleMatch) {
      authorHandle = handleMatch[1]
    } else {
      const parts = urlObj.pathname.split('/')
      const hp = parts.find(p => p.startsWith('@'))
      if (hp) authorHandle = hp.replace('@', '')
    }

    // 4. 抓取作者 Bio 與大頭貼
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
            if (bioClean) {
              authorBio = bioClean
            } else {
              authorBio = `${parts[0].trim()} · ${parts[1].trim()}`
            }
          } else {
            authorBio = raw.replace(/\s*See the latest\b.*/i, '').trim()
          }

          const ogImg = $p('meta[property="og:image"]').attr('content') || ''
          if (ogImg) authorAvatar = ogImg
        }
      } catch (e) {}
    }

    // 5. 清理描述
    description = description.trim().replace(/\s+/g, ' ')
    if (description.length > 50) description = description.substring(0, 50) + '...'

    // 6. 清理圖片 URL（移除強制下載參數）
    if (previewImage) {
      previewImage = previewImage.replace(/[&?]dl=1/g, '').replace(/\)+$/, '')
    }

    // 若無貼文圖，改用作者大頭貼作為 preview_image
    if (!previewImage && authorAvatar) {
      previewImage = authorAvatar
    }

    // 直接儲存 URL，由前端 image-proxy 處理 CORS
    // 不轉 base64 → 避免 DB 欄位肥大導致查詢緩慢
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
