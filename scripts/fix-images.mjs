/**
 * 修復舊文章圖片腳本
 * 將資料庫中過期的 Threads/Instagram CDN 圖片，重新上傳到 Supabase Storage
 *
 * 使用方式：node scripts/fix-images.mjs
 *
 * 注意：需要 SUPABASE_SERVICE_ROLE_KEY（在 Supabase Dashboard → Settings → API）
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = 'https://kvhfoenyxisbtpvhtpim.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2aGZvZW55eGlzYnRwdmh0cGltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc0MjQ2MSwiZXhwIjoyMDg5MzE4NDYxfQ.X7Ks-ihMp41hTQ1O2QuI8B3MQ4OyZTHW6auPNq4cUDE'

if (!SERVICE_ROLE_KEY) {
  console.error('❌ 請設定 SUPABASE_SERVICE_ROLE_KEY 環境變數')
  console.error('   取得方式：Supabase Dashboard → Settings → API → service_role key')
  console.error('   執行方式：SUPABASE_SERVICE_ROLE_KEY=你的key node scripts/fix-images.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const BOT_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

async function uploadToStorage(imageUrl) {
  try {
    const res = await fetch(imageUrl, { headers: { 'User-Agent': BOT_UA } })
    if (!res.ok) return null

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'
    const hash = crypto.createHash('md5').update(imageUrl).digest('hex')
    const fileName = `${hash}.${ext}`

    const { error } = await supabase.storage
      .from('memos')
      .upload(fileName, buffer, { contentType, upsert: true })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage.from('memos').getPublicUrl(fileName)
    return publicUrl
  } catch (err) {
    return null
  }
}

function isCdnUrl(url) {
  if (!url) return false
  // 已上傳到 Supabase Storage 的不需要重新處理
  if (url.includes('supabase.co/storage')) return false
  // Threads/IG CDN 圖片
  return url.includes('cdninstagram.com') || url.includes('fbcdn.net') || url.includes('scontent')
}

async function main() {
  console.log('🔍 讀取所有文章...')

  const { data: memos, error } = await supabase
    .from('memos')
    .select('id, preview_image')
    .not('preview_image', 'is', null)

  if (error) {
    console.error('❌ 讀取失敗：', error.message)
    process.exit(1)
  }

  const targets = memos.filter(m => isCdnUrl(m.preview_image))
  console.log(`📋 共 ${memos.length} 筆文章，其中 ${targets.length} 筆需要修復圖片\n`)

  if (targets.length === 0) {
    console.log('✅ 所有圖片都已經是 Supabase Storage，無需修復')
    return
  }

  let success = 0
  let failed = 0

  for (let i = 0; i < targets.length; i++) {
    const memo = targets[i]
    process.stdout.write(`[${i + 1}/${targets.length}] 處理 ${memo.id}... `)

    const newUrl = await uploadToStorage(memo.preview_image)

    if (!newUrl) {
      console.log('⚠️  圖片已過期，無法下載（跳過）')
      failed++
      continue
    }

    const { error: updateError } = await supabase
      .from('memos')
      .update({ preview_image: newUrl })
      .eq('id', memo.id)

    if (updateError) {
      console.log('❌ 更新失敗：', updateError.message)
      failed++
    } else {
      console.log('✅ 完成')
      success++
    }
  }

  console.log(`\n🎉 完成！成功 ${success} 筆，失敗/過期 ${failed} 筆`)
}

main()
