'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Tag, Star, Trash2, ExternalLink, MessageCircle } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { supabase } from '@/lib/supabase'

export function EditMemoModal({ 
  isOpen, 
  onClose, 
  memo, 
  onUpdate,
  onDelete
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  memo: any, 
  onUpdate: (data: any) => void,
  onDelete: (id: string) => void
}) {
  const [categoryId, setCategoryId] = useState('')
  const [personalNote, setPersonalNote] = useState('')
  const [isEssential, setIsEssential] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [imgError, setImgError] = useState(false)

  const getImageUrl = (url?: string) => {
    if (!url) return null
    return `/api/image-proxy?url=${encodeURIComponent(url)}`
  }

  useEffect(() => {
    if (memo) {
      setCategoryId(memo.category_id || '')
      setPersonalNote(memo.personal_note || '')
      setIsEssential(memo.is_essential || false)
      setImgError(false)
    }
    if (isOpen) {
      fetchCategories()
    }
  }, [memo, isOpen])

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    if (data) setCategories(data)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const { data, error } = await supabase
      .from('memos')
      .update({
        category_id: categoryId || null,
        personal_note: personalNote,
        is_essential: isEssential
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
    if (!error) {
      onDelete(memo.id)
      onClose()
    }
  }

  if (!isOpen || !memo) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-lg p-6 space-y-6 shadow-2xl border-primary/20 bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            編輯精華
          </h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-500/10" onClick={handleDelete}>
              <Trash2 size={20} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>
        </div>

        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Preview Info (Static) */}
          <div className="flex gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 relative group">
            <div className="w-16 h-16 shrink-0">
              {memo.preview_image && !imgError ? (
                <img 
                  src={getImageUrl(memo.preview_image)!}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full rounded-lg object-cover border border-slate-700 shadow-md" 
                />
              ) : (
                <div className="w-full h-full rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-600">
                  <MessageCircle size={24} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="text-primary font-black text-sm tracking-tight">@{memo.author_handle}</div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-[10px] gap-1 text-slate-400 hover:text-white hover:bg-slate-700"
                  onClick={() => window.open(memo.url, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink size={10} /> 查看原文
                </Button>
              </div>
              <p className="text-slate-400 text-xs line-clamp-2 mt-1.5 leading-relaxed italic">
                {memo.content_snippet}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={12} /> 修改分類
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
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">心得備註</label>
              <textarea 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary min-h-[100px]"
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-10 h-6 rounded-full transition-colors relative ${isEssential ? 'bg-primary' : 'bg-slate-700'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isEssential ? 'translate-x-4' : ''}`} />
              </div>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={isEssential} 
                onChange={(e) => setIsEssential(e.target.checked)} 
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors flex items-center gap-1.5">
                <Star size={14} className={isEssential ? 'text-primary' : ''} fill={isEssential ? 'currentColor' : 'none'} />
                標記為精華文章
              </span>
            </label>
          </div>

          <div className="flex gap-4 pt-2">
            <Button variant="secondary" className="flex-1 py-3" onClick={onClose}>
              取消
            </Button>
            <Button className="flex-[2] py-3 shadow-lg shadow-primary/20" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin" /> : '更新資料'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
