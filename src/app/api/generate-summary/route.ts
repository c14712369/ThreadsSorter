import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// 初始化 Gemini API (需要環境變數 GEMINI_API_KEY)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { url, snippet, title } = await request.json()
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: '尚未設定 GEMINI_API_KEY 環境變數，無法使用 AI 功能' },
        { status: 400 }
      )
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" })

    const prompt = `
你是一個專門替社群貼文（Threads / Instagram）整理摘要的 AI 助手。
使用者提供了一篇貼文的片段或標題，請你：
1. 用「繁體中文」**一句話**總結這篇貼文的核心重點 (50字以內)。
2. 從內容中提取出 1~3 個最適合的分類標籤 (Tags)，每個標籤不超過 5 個字。

貼文標題：${title || '無'}
貼文片段：${snippet || '無'}
貼文網址：${url || '無'}

請嚴格使用以下 JSON 格式回傳，不要加上 \`\`\`json 等任何 Markdown 標記語法：
{
  "summary": "一句話重點摘要",
  "tags": ["標籤1", "標籤2", "標籤3"]
}
`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    // 嘗試解析 JSON (移除可能的 markdown 區塊)
    let cleanedText = responseText.trim()
    if (cleanedText.startsWith('\`\`\`json')) {
      cleanedText = cleanedText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim()
    } else if (cleanedText.startsWith('\`\`\`')) {
      cleanedText = cleanedText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim()
    }

    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
       throw new Error('AI 回傳格式錯誤：找不到 JSON 結構')
    }

    const aiData = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      summary: aiData.summary,
      tags: aiData.tags
    })

  } catch (error: any) {
    console.error('Gemini API Error:', error)
    return NextResponse.json(
      { error: error.message || 'AI 摘要產生失敗' },
      { status: 500 }
    )
  }
}
