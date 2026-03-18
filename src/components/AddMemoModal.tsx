'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Sparkles, Tag, Star, User, MessageCircle } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { supabase } from '@/lib/supabase'

import { useAuth } from '@/hooks/useAuth'

export function AddMemoModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const { user } = useAuth()
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [imgError, setImgError] = useState(false)
  
  const [categoryId, setCategoryId] = useState('')
  const [personalNote, setPersonalNote] = useState('')
  const [isEssential, setIsEssential] = useState(false)
  const [categories, setCategories] = useState<any[]>([])

  const [isManualMode, setIsManualMode] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  const getImageUrl = (url?: string) => {
    if (!url) return null
    return `/api/image-proxy?url=${encodeURIComponent(url)}`
  }

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
      
      // 自動讀取剪貼簿並填寫
      navigator.clipboard.readText()
        .then(text => {
          if (text && (text.includes('threads.net') || text.includes('instagram.com'))) {
            setUrl(text)
            fetchMetadata(text)
          }
        })
        .catch(err => {
          console.log('無法讀取剪貼簿 (可能用戶未授權):', err)
        })
    } else {
      // 關閉時清空狀態，避免下次打開時殘留
      setUrl('')
      setPreview(null)
      setError('')
      setImgError(false)
      setIsGeneratingAI(false)
      setPersonalNote('')
      setIsEssential(false)
    }
  }, [isOpen])

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    if (data) setCategories(data)
  }

  const fetchMetadata = async (targetUrl: string) => {
    if (!targetUrl) return
    setIsLoading(true)
    setError('')
    setImgError(false)
    try {
      const isThreads = targetUrl.includes('threads.net') || targetUrl.includes('threads.com')
      const isIG = targetUrl.includes('instagram.com')
      if (!isThreads && !isIG) throw new Error('僅支援 Threads 或 Instagram 連結')

      const res = await fetch('/api/parse-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPreview(data)
    } catch (err: any) {
      setError(err.message || '解析失敗')
      setPreview({
        author_handle: '',
        content_snippet: '',
        preview_image: '',
        url: targetUrl
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualEntry = () => {
    setPreview({
      author_handle: '',
      content_snippet: '',
      preview_image: '',
      url: url || ''
    })
    setImgError(false)
  }

  const handleGenerateSummary = async () => {
    if (!preview) return
    setIsGeneratingAI(true)
    setError('')
    try {
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: preview.url || url, 
          snippet: preview.content_snippet,
          title: preview.author_handle
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI 摘要產生失敗')

      setPersonalNote(data.summary)

      if (data.tags && data.tags.length > 0) {
        const matchedCategory = categories.find(c => 
          data.tags.some((t: string) => t.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(t.toLowerCase()))
        )
        if (matchedCategory) {
          setCategoryId(matchedCategory.id)
        }
      }
    } catch (err: any) {
      setError(err.message || 'AI 處理錯誤')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleSave = async () => {
    if (!user || !preview) return
    setIsSaving(true)
    setError('')

    const { error: insertError } = await supabase
      .from('memos')
      .insert([
        {
          user_id: user.id,
          ...preview,
          url: url || preview?.url,
          category_id: categoryId || null,
          personal_note: personalNote,
          is_essential: isEssential,
          ai_tags: [] 
        }
      ])

    if (insertError) {
      setError(insertError.message)
      setIsSaving(false)
      return
    }

    onSuccess()
    
    // Reset state
    setPreview(null)
    setCategoryId('')
    setPersonalNote('')
    setIsEssential(false)
    setUrl('')
    setError('')
    setImgError(false)
    setIsSaving(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-lg p-6 space-y-6 shadow-2xl border-primary/20 bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="text-primary" size={24} />
            新增精華
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="space-y-4">
          {!preview ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400 font-medium tracking-wide">貼上連結 (Threads / IG)</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="https://www.threads.net/..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all text-sm"
                    value={url}
                    onChange={(e) => {
                      const newUrl = e.target.value
                      setUrl(newUrl)
                      if (newUrl.includes('threads.net') || newUrl.includes('instagram.com')) {
                        fetchMetadata(newUrl)
                      }
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && fetchMetadata(url)}
                  />
                  <Button 
                    onClick={() => fetchMetadata(url)} 
                    disabled={isLoading || !url}
                    className="shrink-0 px-6 rounded-xl font-bold"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : '解析'}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-600 font-medium uppercase tracking-widest">或</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <Button 
                variant="ghost" 
                className="w-full py-4 border border-dashed border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 rounded-xl text-xs font-bold transition-all"
                onClick={handleManualEntry}
              >
                直接手動輸入資訊
              </Button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
              {/* Preview & Edit Box */}
              <div className="space-y-4 p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                <div className="flex gap-5">
                  <div className="shrink-0">
                    {preview.preview_image && !imgError ? (
                      <img 
                        src={getImageUrl(preview.preview_image)!}
                        referrerPolicy="no-referrer"
                        onError={() => setImgError(true)}
                        className="w-20 h-20 rounded-xl object-cover border border-slate-700 shadow-xl" 
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-700">
                        <MessageCircle size={32} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-primary/80 uppercase font-black tracking-widest flex items-center gap-1">
                        <User size={10} /> 作者帳號 (可修改)
                      </label>
                      <input 
                        type="text"
                        className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-primary transition-all ring-offset-slate-900 focus:ring-1 focus:ring-primary/30"
                        placeholder="@username"
                        value={preview.author_handle || ''}
                        onChange={(e) => setPreview({ ...preview, author_handle: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1">
                        <Sparkles size={10} /> 內容摘要
                      </label>
                      <textarea 
                        className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-primary min-h-[100px] leading-relaxed transition-all"
                        placeholder="擷取到的內容將顯示在此..."
                        value={preview.content_snippet}
                        onChange={(e) => setPreview({ ...preview, content_snippet: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                    <Tag size={12} /> 選擇分類
                  </label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary appearance-none"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">未分類</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">備註</label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10 gap-1 rounded-md"
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingAI || !preview.content_snippet}
                    >
                      {isGeneratingAI ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                      AI 總結與分類
                    </Button>
                  </div>
                  <textarea 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary min-h-[80px]"
                    placeholder="輸入個人心得或重點描述..."
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${isEssential ? 'bg-primary' : 'bg-amber-500/20'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isEssential ? 'translate-x-4' : ''}`} />
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={isEssential} 
                    onChange={(e) => setIsEssential(e.target.checked)} 
                  />
                  <span className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${isEssential ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-300'}`}>
                    <Star size={14} className={isEssential ? 'text-amber-400' : ''} fill={isEssential ? 'currentColor' : 'none'} />
                    標記為精華
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <Button variant="secondary" className="w-full py-3" onClick={() => { setPreview(null); setImgError(false) }}>
                  重新輸入
                </Button>
                <Button className="w-full py-3 shadow-lg shadow-primary/20" onClick={handleSave}>
                  確認儲存
                </Button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-primary" size={32} />
              <span className="ml-3 text-slate-400">正在解析內容...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
