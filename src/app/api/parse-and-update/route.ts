import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createClient } from '@/lib/supabase-server'
import crypto from 'crypto'
import { GoogleGenerativeAI } from '@google/generative-ai'

const BOT_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
const FB_UA = 'facebookexternalhit/1.1'

// 初始化 Gemini API (需要環境變數 GEMINI_API_KEY)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

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

async function fetchViaJina(url: string): Promise<{ content: string; description: string; images: string[] }> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return { content: '', description: '', images: [] }
    const json = await res.json()

    const description: string = json.data?.description || ''
    const content: string = json.data?.content || ''

    const allUrls = content.match(/https:\/\/[^\s)"\]]+/g) || []
    const imgMatches: string[] = allUrls
      .filter((u: string) => {
        if (u.includes('rsrc.php')) return false
        if (/t51\.\d+-15/.test(u)) return true
        if (u.includes('fbcdn.net/emg1')) return true
        return false
      })
      .map((u: string) => u.replace(/&amp;/g, '&'))

    return { content, description, images: imgMatches }
  } catch {
    return { content: '', description: '', images: [] }
  }
}

async function generateSummary(url: string, snippet: string, title: string) {
  if (!process.env.GEMINI_API_KEY) return { summary: null, tags: [] }
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" })
    const hasContent = snippet && snippet.trim().length > 5
    const prompt = hasContent
      ? `
你是一個專門替社群貼文（Threads / Instagram）整理摘要的 AI 助手。
使用者提供了一篇貼文的片段，請你：
1. 用「繁體中文」**一句話**總結這篇貼文的核心重點 (50字以內)。
2. 從內容中提取出 1~3 個最適合的分類標籤 (Tags)，每個標籤不超過 5 個字。

作者：${title || '未知'}
貼文片段：${snippet}
貼文網址：${url || '無'}

請嚴格使用以下 JSON 格式回傳，不要加上 \`\`\`json 等任何 Markdown 標記語法：
{"summary": "一句話重點摘要", "tags": ["標籤1", "標籤2"]}
`
      : `
你是一個社群貼文書籤助手。
使用者儲存了一篇 Threads 貼文，但系統無法取得貼文內文。

請根據以下資訊，為這篇書籤產生一個簡短的**預設標題**（20字以內，繁體中文），以及 1~2 個分類 tags。
- 作者：${title || '未知帳號'}
- 貼文網址：${url || '無'}

回傳格式（嚴格 JSON，不加 markdown）：
{"summary": "預設標題", "tags": ["標籤1"]}
`
    const result = await model.generateContent(prompt)
    let cleanedText = result.response.text().trim()
    if (cleanedText.startsWith('\`\`\`json')) cleanedText = cleanedText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim()
    else if (cleanedText.startsWith('\`\`\`')) cleanedText = cleanedText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim()
    
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { summary: null, tags: [] }
    return JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('generateSummary err:', err)
    return { summary: null, tags: [] }
  }
}

export async function POST(req: Request) {
  let requestData: { id?: string, url?: string } = {}
  try {
    requestData = await req.json()
    const { id, url } = requestData
    if (!id || !url) return NextResponse.json({ error: '無效參數' }, { status: 400 })

    const cleanUrl = url.split('?')[0]
    const urlObj = new URL(cleanUrl)
    const isThreads = urlObj.hostname.includes('threads.net') || urlObj.hostname.includes('threads.com')
    const isIG = urlObj.hostname.includes('instagram.com')

    if (!isThreads && !isIG) {
      // 標註為解析失敗
      const supabase = await createClient()
      await supabase.from('memos').update({ author_handle: '解析失敗' }).eq('id', id)
      return NextResponse.json({ error: '不支援的連結' }, { status: 400 })
    }

    const pathParts = urlObj.pathname.split('/')
    const handlePart = pathParts.find(p => p.startsWith('@'))
    const authorHandle = handlePart ? handlePart.replace('@', '') : '未知作者'

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
        const raw = $('meta[property="og:description"]').attr('content') || ''
        const isLoginPrompt = raw.includes('Join Threads') || raw.toLowerCase().includes('log in') || raw.toLowerCase().includes('sign up')
        let bio = ''
        if (!isLoginPrompt && raw) {
          const parts = raw.split('•')
          if (parts.length >= 3) {
            bio = parts.slice(2).join('•').replace(/\s*See the latest\b.*/i, '').trim() || `${parts[0].trim()} · ${parts[1].trim()}`
          } else {
            bio = raw.replace(/\s*See the latest\b.*/i, '').trim()
          }
        }
        const ogImg = $('meta[property="og:image"]').attr('content')?.replace(/&amp;/g, '&') || ''
        const avatar = ogImg && !ogImg.includes('rsrc.php') ? ogImg : ''
        return { bio, avatar }
      })()
    ])

    const jina = jinaResult.status === 'fulfilled' ? jinaResult.value : { content: '', description: '', images: [] }
    const profile = profileResult.status === 'fulfilled' ? profileResult.value : { bio: '', avatar: '' }
    const authorBio = profile.bio || ''

    let contentSnippet = jina.description || ''
    if (!contentSnippet && jina.content) {
      const firstLine = jina.content.split('\n').find(l => l.replace(/[#\[\]()]/g, '').trim().length > 10) || ''
      contentSnippet = firstLine.replace(/^#+\s*/, '').trim()
    }
    contentSnippet = contentSnippet.replace(/\s+/g, ' ').trim()
    const chars = Array.from(contentSnippet)
    if (chars.length > 150) contentSnippet = chars.slice(0, 150).join('') + '...'

    let previewImage: string | null = null
    const postImages = jina.images
    const candidateUrl = postImages.length > 0 ? postImages[0] : profile.avatar || ''

    if (candidateUrl) {
      const storageUrl = await uploadToSupabase(candidateUrl)
      previewImage = storageUrl || candidateUrl
    }

    // AI summary
    const aiResult = await generateSummary(cleanUrl, contentSnippet, authorHandle)

    // Update the DB record
    const updateData = {
      author_handle: authorHandle,
      author_bio: authorBio,
      content_snippet: contentSnippet || aiResult.summary || '',
      preview_image: previewImage,
      ai_summary: aiResult.summary,
      ai_tags: aiResult.tags || []
    }

    const supabase = await createClient()
    const { error: updateError } = await supabase.from('memos').update(updateData).eq('id', id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, memo: { ...updateData, id } })

  } catch (error: any) {
    console.error('parse-and-update error:', error)
    // 如果發生嚴重錯誤，我們也給 author_handle 一個假值，免得卡在 loading 狀態
    try {
        if (requestData.id) {
            const supabase = await createClient()
            await supabase.from('memos').update({ author_handle: '解析失敗' }).eq('id', requestData.id)
        }
    } catch(e) {}
    return NextResponse.json({ error: '解析與更新失敗' }, { status: 500 })
  }
}
