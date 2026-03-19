import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

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

    // 標準化網址，去掉 query string
    const cleanUrl = url.split('?')[0].replace('threads.com', 'threads.net')
    const urlObj = new URL(cleanUrl)
    const isThreads = urlObj.hostname.includes('threads.net')

    let previewImage = ''
    let title = ''
    let description = ''

    // --- 策略 A: Threads /embed/ 頁面（最可靠，能拿到多圖的第一張）---
    if (isThreads) {
      try {
        const embedUrl = cleanUrl.replace(/\/$/, '') + '/embed/'
        const embedRes = await fetch(embedUrl, {
          headers: { 'User-Agent': BOT_UA }
        })
        if (embedRes.ok) {
          const embedHtml = await embedRes.text()
          previewImage = extractPostImage(embedHtml)
        }
      } catch (e) {
        console.log('embed fetch failed:', e)
      }
    }

    // --- 策略 B: 主頁面爬蟲（取 title / description，順帶再試一次圖片）---
    if (!description) {
      try {
        const response = await fetch(cleanUrl, {
          headers: {
            'User-Agent': BOT_UA,
            'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8'
          }
        })
        if (response.ok) {
          const html = await response.text()
          const $ = cheerio.load(html)

          title = $('meta[property="og:title"]').attr('content') || $('title').text() || ''
          description = $('meta[property="og:description"]').attr('content') || ''

          // 若 embed 沒抓到圖，從主頁 HTML 再試
          if (!previewImage) {
            previewImage = extractPostImage(html)
          }

          // 最後 fallback：og:image（但 Threads 通常給大頭貼，需過濾）
          if (!previewImage) {
            const ogImg = $('meta[property="og:image"]').attr('content') || ''
            if (ogImg && !ogImg.includes('t51.2885-19') && !ogImg.includes('-19/')) {
              previewImage = ogImg
            }
          }
        }
      } catch (e) {
        console.log('main page fetch failed:', e)
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
        const pRes = await fetch(`https://www.threads.net/@${authorHandle}`, {
          headers: { 'User-Agent': 'facebookexternalhit/1.1' }
        })
        if (pRes.ok) {
          const profileHtml = await pRes.text()
          const $p = cheerio.load(profileHtml)
          const raw = $p('meta[property="og:description"]').attr('content') || ''

          // 格式: "3.7K Followers • 7.8K Threads • 真正的自我介紹 See the latest..."
          // 以 • 分割後，前兩段是追蹤數統計，第三段起才是自介
          const parts = raw.split('•')
          if (parts.length >= 3) {
            const bioRaw = parts.slice(2).join('•')
            const bioClean = bioRaw.replace(/\s*See the latest\b.*/i, '').trim()
            if (bioClean) {
              authorBio = bioClean
            } else {
              // 無自介，改用追蹤數與發文數作為替代資訊
              const followers = parts[0].trim()
              const posts = parts[1].trim()
              authorBio = `${followers} · ${posts}`
            }
          } else {
            authorBio = raw.replace(/\s*See the latest\b.*/i, '').trim()
          }

          // 大頭貼：從 og:image 抓（-19/ 路徑即為大頭貼）
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
