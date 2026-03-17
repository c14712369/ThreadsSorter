const url = 'https://www.threads.net/@lijiajia7402/post/DV8K114D2k_'

async function test() {
  console.log('Fetching:', url)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      }
    })
    console.log('Status:', res.status)
    const text = await res.text()
    console.log('Content Length:', text.length)
    
    const handle = 'lijiajia7402'
    console.log(`Contains "${handle}"?`, text.includes(handle))
    
    if (text.includes(handle)) {
      const index = text.indexOf(handle)
      console.log('Context around handle:', text.substring(index - 100, index + 100))
    }
  } catch (e) {
    console.error('Error:', e)
  }
}

test()
