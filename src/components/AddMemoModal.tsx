'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Link2, Loader2, Sparkles, Star, Folder, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface AddMemoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialUrl?: string
}

export function AddMemoModal({ isOpen, onClose, onSuccess, initialUrl }: AddMemoModalProps) {
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

  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [aiTags, setAiTags] = useState<string[]>([])

  const getImageUrl = (u?: string) => {
    if (!u) return null
    return `/api/image-proxy?url=${encodeURIComponent(u)}`
  }

  const isSupportedUrl = (u: string) =>
    u.includes('threads.net') || u.includes('instagram.com') || u.includes('threads.com')

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
      if (initialUrl && isSupportedUrl(initialUrl)) {
        setUrl(initialUrl)
        fetchMetadata(initialUrl)
      } else {
        // FAB 的剪貼簿讀取在手機上可能失敗，modal 開啟時再試一次
        navigator.clipboard.readText().then((text) => {
          if (text && isSupportedUrl(text)) {
            setUrl(text)
            fetchMetadata(text)
          }
        }).catch(() => {})
      }
    } else {
      setUrl('')
      setPreview(null)
      setError('')
      setImgError(false)
      setPersonalNote('')
      setIsEssential(false)
      setCategoryId('')
      setAiSummary('')
      setAiTags([])
      setIsLoading(false)
      setIsGeneratingAI(false)
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
    setPreview(null)
    setAiSummary('')
    setAiTags([])
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
      // 解析完自動觸發 AI
      generateAI(data)
    } catch (err: any) {
      setError(err.message || '解析失敗')
    } finally {
      setIsLoading(false)
    }
  }

  const generateAI = async (parsedData: any) => {
    if (!parsedData?.content_snippet) return
    setIsGeneratingAI(true)
    try {
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: parsedData.url,
          snippet: parsedData.content_snippet,
          title: parsedData.author_handle
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const { data: cats } = await supabase.from('categories').select('*')
      const allCats = cats || []
      const matchedCat = allCats.find((c: any) =>
        data.tags?.some((t: string) =>
          t.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(t.toLowerCase())
        )
      )
      // 直接套用，不詢問
      setAiSummary(data.summary)
      setAiTags(data.tags || [])
      if (matchedCat?.id) setCategoryId(matchedCat.id)
    } catch {
      // Silent fail
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleSave = async () => {
    if (!user || !preview) return
    setIsSaving(true)
    setError('')

    const { error: insertError } = await supabase.from('memos').insert([{
      user_id: user.id,
      ...preview,
      url: url || preview.url,
      category_id: categoryId || null,
      personal_note: personalNote || null,
      is_essential: isEssential,
      ai_summary: aiSummary || null,
      ai_tags: aiTags
    }])

    if (insertError) {
      setError(insertError.message)
      setIsSaving(false)
      return
    }

    onSuccess()
    onClose()
    setIsSaving(false)
  }

  const isThreadsSrc = url.includes('threads.net') || url.includes('threads.com')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-[#0B1120] flex flex-col">

      {/* ── Header ── */}
      <div
        className="shrink-0 flex items-center justify-between px-5 border-b border-white/[0.06]"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingBottom: '16px' }}
      >
        <button
          onClick={onClose}
          aria-label="返回"
          className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors rounded-xl active:scale-95"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-black text-white tracking-tight">快速新增</h1>
        <button
          onClick={handleSave}
          disabled={!preview || isSaving}
          className="px-5 py-2 bg-primary text-[#0B1120] rounded-full text-sm font-black disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : '儲存'}
        </button>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' } as any}>
        <div
          className="px-5 pt-5 space-y-6"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}
        >

          {/* 連結 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Link2 size={14} className="text-primary" strokeWidth={2.5} />
              <span className="text-sm font-black tracking-wider text-primary">連結</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-800/60 border border-white/[0.06] rounded-2xl px-4 py-3.5">
              <Link2 size={15} className="text-slate-600 shrink-0" />
              <input
                type="url"
                placeholder="https://www.threads.net/..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none min-w-0"
                value={url}
                onChange={(e) => {
                  const v = e.target.value
                  setUrl(v)
                  if (v.includes('threads.net') || v.includes('threads.com') || v.includes('instagram.com')) {
                    fetchMetadata(v)
                  }
                }}
              />
            </div>
          </section>

          {/* Loading skeleton */}
          {isLoading && (
            <div className="rounded-2xl bg-slate-800/40 border border-white/[0.06] overflow-hidden animate-pulse">
              <div className="h-52 bg-slate-800/80" />
              <div className="p-4 space-y-3">
                <div className="h-3 w-16 bg-slate-700 rounded-full" />
                <div className="h-4 w-2/3 bg-slate-700 rounded-full" />
                <div className="h-3 w-full bg-slate-700/50 rounded-full" />
                <div className="h-3 w-4/5 bg-slate-700/40 rounded-full" />
              </div>
            </div>
          )}

          {/* Preview Card */}
          {!isLoading && preview && (
            <section className="rounded-2xl bg-slate-800/40 border border-white/[0.06] overflow-hidden">
              {preview.preview_image && !imgError ? (
                <div className="w-full h-52 bg-slate-800 overflow-hidden">
                  <img
                    src={getImageUrl(preview.preview_image)!}
                    alt="Preview"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-32 bg-slate-800/80 flex items-center justify-center text-slate-700">
                  <MessageCircle size={40} />
                </div>
              )}
              <div className="p-4 space-y-2">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-primary/10 text-primary border border-primary/20 tracking-wider">
                  {isThreadsSrc ? 'Threads' : 'Instagram'}
                </span>
                <p className="text-white text-sm font-semibold leading-snug">
                  {preview.author_handle}
                  {preview.author_bio && (
                    <span className="text-slate-400 font-normal"> · {preview.author_bio}</span>
                  )}
                </p>
                {preview.content_snippet && (
                  <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">{preview.content_snippet}</p>
                )}
              </div>
            </section>
          )}

          {/* AI 摘要 */}
          {!isLoading && preview && (isGeneratingAI || aiSummary) && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary" strokeWidth={2.5} />
                <span className="text-sm font-black tracking-wider text-primary">AI 摘要</span>
              </div>
              {isGeneratingAI ? (
                <div className="rounded-2xl bg-slate-800/40 border border-white/[0.06] p-4 flex items-center gap-3">
                  <Loader2 size={16} className="animate-spin text-primary shrink-0" />
                  <span className="text-sm text-slate-500">正在生成…</span>
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-800/40 border border-primary/10 px-4 py-3 space-y-2.5">
                  <p className="text-slate-200 text-sm italic leading-relaxed">{aiSummary}</p>
                  {aiTags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {aiTags.map(tag => (
                        <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ─── Form fields (shown after parse) ─── */}
          {!isLoading && preview && (
            <>
              {/* 標題 */}
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-primary font-mono">T</span>
                  <span className="text-sm font-black tracking-wider text-primary">標題</span>
                </div>
                <textarea
                  className="w-full bg-slate-800/60 border border-white/[0.06] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none leading-relaxed min-h-[80px] transition-colors"
                  value={preview.content_snippet}
                  onChange={(e) => setPreview({ ...preview, content_snippet: e.target.value })}
                />
              </section>

              {/* 註解 */}
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black tracking-wider text-primary">📝</span>
                  <span className="text-sm font-black tracking-wider text-primary">註解</span>
                  <span className="text-[10px] text-slate-600 font-bold px-1.5 py-0.5 bg-slate-800 rounded-md tracking-wider">選填</span>
                </div>
                <textarea
                  className="w-full bg-slate-800/60 border border-white/[0.06] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none leading-relaxed min-h-[80px] transition-colors"
                  placeholder="加入你的想法或備註…"
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                />
              </section>

              {/* 分類 */}
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <Folder size={14} className="text-primary" strokeWidth={2.5} />
                  <span className="text-sm font-black tracking-wider text-primary">分類</span>
                </div>
                <div className="relative inline-block">
                  <select
                    className="bg-slate-800/60 border border-white/[0.06] rounded-full pl-4 pr-9 py-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 appearance-none transition-colors"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">選擇分類</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <Folder size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </section>

              {/* 精華 */}
              <section>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${isEssential ? 'bg-primary' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isEssential ? 'translate-x-5' : ''}`} />
                  </div>
                  <input type="checkbox" className="hidden" checked={isEssential} onChange={(e) => setIsEssential(e.target.checked)} />
                  <span className={`text-sm font-medium flex items-center gap-1.5 transition-colors ${isEssential ? 'text-amber-400' : 'text-slate-400'}`}>
                    <Star size={14} className={isEssential ? 'text-amber-400' : ''} fill={isEssential ? 'currentColor' : 'none'} />
                    標記精華
                  </span>
                </label>
              </section>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-sm">
              {error}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
