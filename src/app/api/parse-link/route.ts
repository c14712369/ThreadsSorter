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

    // 4. 抓取作者 Bio
    let authorBio = ''
    if (authorHandle && isThreads) {
      try {
        const pRes = await fetch(`https://www.threads.net/@${authorHandle}`, {
          headers: { 'User-Agent': 'facebookexternalhit/1.1' }
        })
        if (pRes.ok) {
          const $p = cheerio.load(await pRes.text())
          const raw = $p('meta[property="og:description"]').attr('content') || ''
          // 格式: "3.7K Followers • 7.8K Threads • 真正的自我介紹 See the latest..."
          // 以 • 分割後，前兩段是追蹤數統計，第三段起才是自介
          const parts = raw.split('•')
          const bioRaw = parts.length >= 3
            ? parts.slice(2).join('•')  // 保留自介中可能含有的 • 符號
            : raw
          // 移除結尾的 "See the latest conversations..." 說明文字
          authorBio = bioRaw.replace(/\s*See the latest\b.*/i, '').trim()
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
