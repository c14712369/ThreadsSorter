export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 })
  }

  try {
    const referer = imageUrl.includes('cdninstagram') || imageUrl.includes('fbcdn')
      ? 'https://www.instagram.com/'
      : 'https://www.threads.net/'

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': referer,
      }
    })

    if (!response.ok) {
      return new Response('Failed to fetch image', { status: response.status })
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg'

    // 直接串流，不 buffer 進記憶體 → 更快、更省記憶體
    return new Response(response.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    })
  } catch (error: any) {
    return new Response('Error fetching image', { status: 500 })
  }
}
