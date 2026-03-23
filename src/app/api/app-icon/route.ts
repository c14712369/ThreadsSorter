import { NextRequest, NextResponse } from 'next/server'
import * as LucideIcons from 'lucide-react'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const iconName = searchParams.get('icon') || 'Zap'
  const color = '#6366F1' // Thorter Primary Color

  // @ts-ignore
  const IconComponent = LucideIcons[iconName] || LucideIcons.Zap

  // 建立一個簡單的 SVG 包裝
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect width="24" height="24" rx="6" fill="${color}10" stroke="none" />
      <g transform="translate(4, 4) scale(0.66)">
        ${renderIconToPath(iconName)}
      </g>
    </svg>
  `

  return new NextResponse(svgString, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

// 由於伺服器端環境限制，我們手動定義一些常用圖示的路徑，或者簡單回傳一個圓圈作為 fallback
function renderIconToPath(name: string) {
  // 這裡為了快速實作，先提供幾個熱門圖示的 path
  const paths: Record<string, string> = {
    'Zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
    'Star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
    'Heart': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>',
    'Rocket': '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3"></path><path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5"></path>',
  }
  return paths[name] || paths['Zap']
}
