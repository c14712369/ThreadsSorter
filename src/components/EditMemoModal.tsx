'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, Star, Trash2, ExternalLink, MessageCircle, Folder, Sparkles, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function EditMemoModal({
  isOpen,
  onClose,
  memo,
  onUpdate,
  onDelete
}: {
  isOpen: boolean
  onClose: () => void
  memo: any
  onUpdate: (data: any) => void
  onDelete: (id: string) => void
}) {
  const [contentSnippet, setContentSnippet] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [personalNote, setPersonalNote] = useState('')
  const [isEssential, setIsEssential] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [imgError, setImgError] = useState(false)

  // AI 狀態
  const [aiSummary, setAiSummary] = useState('')
  const [aiTags, setAiTags] = useState<string[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  const getImageUrl = (url?: string) => {
    if (!url) return null
    return `/api/image-proxy?url=${encodeURIComponent(url)}`
  }

  useEffect(() => {
    if (isOpen && memo) {
      setContentSnippet(memo.content_snippet || '')
      setCategoryId(memo.category_id || '')
      setPersonalNote(memo.personal_note || '')
      setIsEssential(memo.is_essential || false)
      setImgError(false)
      setAiSummary(memo.ai_summary || '')
      setAiTags(memo.ai_tags || [])
      fetchCategories().then((cats) => {
        // 沒有 ai_summary 時自動觸發 AI
        if (!memo.ai_summary && memo.content_snippet) {
          generateAI(memo, cats)
        }
      })
    }
  }, [isOpen, memo?.id])

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    if (data) setCategories(data)
    return data || []
  }

  const generateAI = async (targetMemo: any, cats?: any[]) => {
    if (!targetMemo?.content_snippet) return
    setIsGeneratingAI(true)
    try {
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetMemo.url,
          snippet: targetMemo.content_snippet,
          title: targetMemo.author_handle
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const allCats = cats || categories
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
    setIsSaving(true)
    const { data, error } = await supabase
      .from('memos')
      .update({
        content_snippet: contentSnippet,
        category_id: categoryId || null,
        personal_note: personalNote || null,
        is_essential: isEssential,
        ai_summary: aiSummary || null,
        ai_tags: aiTags
      })
      .eq('id', memo.id)
      .select()

    if (!error && data) {
      onUpdate(data[0])
      onClose()
    }
    setIsSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('確定要刪除此收藏嗎？')) return
    const { error } = await supabase.from('memos').delete().eq('id', memo.id)
    if (!error) { onDelete(memo.id); onClose() }
  }

  const isThreadsSrc = memo?.url?.includes('threads.net') || memo?.url?.includes('threads.com')

  if (!isOpen || !memo) return null

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
        <h1 className="text-lg font-black text-white tracking-tight">編輯收藏</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            aria-label="刪除"
            className="p-2 text-slate-600 hover:text-rose-400 transition-colors rounded-xl active:scale-95"
          >
            <Trash2 size={19} />
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-primary text-[#0B1120] rounded-full text-sm font-black disabled:opacity-50 flex items-center gap-1.5 active:scale-95 transition-transform ml-1"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : '儲存'}
          </button>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' } as any}>
        <div
          className="px-5 pt-5 space-y-6"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}
        >

          {/* Preview (read-only) */}
          <section className="rounded-2xl bg-slate-800/40 border border-white/[0.06] overflow-hidden">
            {memo.preview_image && !imgError ? (
              <div className="w-full h-52 bg-slate-800 overflow-hidden">
                <img
                  src={getImageUrl(memo.preview_image)!}
                  referrerPolicy="no-referrer"
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
              <div className="flex items-center justify-between">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-primary/10 text-primary border border-primary/20 tracking-wider">
                  {isThreadsSrc ? 'Threads' : 'Instagram'}
                </span>
                <button
                  onClick={() => window.open(memo.url, '_blank', 'noopener,noreferrer')}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-primary transition-colors"
                >
                  <ExternalLink size={11} /> 查看原文
                </button>
              </div>
              <p className="text-white text-sm font-semibold leading-snug">
                @{memo.author_handle}
                {memo.author_bio && (
                  <span className="text-slate-400 font-normal"> · {memo.author_bio}</span>
                )}
              </p>
              {memo.content_snippet && (
                <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 italic">{memo.content_snippet}</p>
              )}
            </div>
          </section>

          {/* ── AI 建議 ── */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary" strokeWidth={2.5} />
                <span className="text-sm font-black tracking-wider text-primary">AI 建議</span>
              </div>
              {!isGeneratingAI && (
                <button
                  onClick={() => generateAI(memo)}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-primary transition-colors"
                >
                  <RotateCcw size={11} /> 重新生成
                </button>
              )}
            </div>

            {isGeneratingAI ? (
              <div className="rounded-2xl bg-slate-800/40 border border-white/[0.06] p-4 flex items-center gap-3">
                <Loader2 size={16} className="animate-spin text-primary shrink-0" />
                <span className="text-sm text-slate-500">正在生成…</span>
              </div>
            ) : aiSummary ? (
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
            ) : (
              <button
                onClick={() => generateAI(memo)}
                className="w-full rounded-2xl bg-slate-800/40 border border-dashed border-white/[0.08] py-4 text-sm text-slate-600 hover:text-slate-400 hover:border-primary/30 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles size={14} /> 產生 AI 摘要
              </button>
            )}
          </section>

          {/* 標題 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-primary font-mono">T</span>
              <span className="text-sm font-black tracking-wider text-primary">標題</span>
            </div>
            <textarea
              className="w-full bg-slate-800/60 border border-white/[0.06] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none leading-relaxed min-h-[80px] transition-colors"
              value={contentSnippet}
              onChange={(e) => setContentSnippet(e.target.value)}
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
                <option value="">未分類</option>
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

        </div>
      </div>
    </div>
  )
}
