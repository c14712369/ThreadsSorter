'use client'

import { X, ExternalLink, Calendar, User, Tag, MessageCircle, Trash2, Star, Archive, Pencil, Folder, Loader2 } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import IconRenderer from './IconRenderer'

export function MemoDetailModal({ 
  memo, 
  isOpen, 
  onClose,
  categoryName,
  categoryIcon,
  onDelete,
  onToggleEssential,
  onToggleArchive,
  onEdit
}: { 
  memo: any, 
  isOpen: boolean, 
  onClose: () => void,
  categoryName?: string,
  categoryIcon?: string,
  onDelete: (id: string) => void,
  onToggleEssential: (id: string, is_essential: boolean) => void,
  onToggleArchive: (id: string, is_archived: boolean) => void,
  onEdit: (memo: any) => void
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isImgLoaded, setIsImgLoaded] = useState(false)

  if (!isOpen || !memo) return null

  const getImageUrl = (url?: string) => {
    if (!url) return null
    if (url.includes('supabase.co')) return url
    return `/api/image-proxy?url=${encodeURIComponent(url)}`
  }

  const imageUrl = getImageUrl(memo.preview_image)
  const isParsing = !memo.author_handle

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[50vh] animate-in zoom-in-95 duration-300">
        {/* Header Image Area */}
        <div className="w-full h-[30vh] relative bg-slate-950 overflow-hidden shrink-0 flex items-center justify-center border-b border-slate-800">
          {isParsing ? (
             <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center gap-4 animate-pulse">
               <Loader2 size={40} className="text-primary/70 animate-spin" />
               <span className="text-primary/70 text-sm font-bold tracking-widest uppercase">正在提取原文資訊...</span>
             </div>
          ) : (
            <>
              {!isImgLoaded && memo.preview_image && (
                <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
                  <MessageCircle size={32} className="text-slate-700 opacity-50" />
                </div>
              )}
              
              {imageUrl ? (
                <>
                  <div 
                    className={cn(
                      "absolute inset-0 opacity-40 blur-xl scale-110 pointer-events-none transition-opacity duration-700",
                      isImgLoaded ? "opacity-40" : "opacity-0"
                    )}
                    style={{ 
                      backgroundImage: `url(${imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                  <img 
                    src={imageUrl}
                    alt="Preview" 
                    onLoad={() => setIsImgLoaded(true)}
                    className={cn(
                      "relative z-10 w-full h-full object-contain transition-all duration-700",
                      isImgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
                    )}
                  />
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                  <MessageCircle size={48} className="text-slate-700 opacity-50" />
                </div>
              )}
            </>
          )}
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-xl transition-colors z-20 shadow-lg border border-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Metadata Bar */}
          {isParsing ? (
            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                 <div className="w-20 h-4 bg-slate-800 rounded animate-pulse" />
                 <div className="w-24 h-4 bg-slate-800 rounded animate-pulse" />
              </div>
              <div className="w-full h-20 bg-slate-800/60 rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <div className="flex items-center gap-1.5 text-primary">
                    <User size={12} />
                    {memo.author_handle}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    {new Date(memo.created_at).toLocaleDateString()}
                  </div>
                  {categoryName && (
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      <IconRenderer name={categoryIcon || 'Tag'} size={10} />
                      {categoryName}
                    </div>
                  )}
                </div>
                
                {memo.author_bio && (
                  <p className="text-[11px] text-slate-400 leading-relaxed bg-white/5 p-2.5 rounded-lg border border-white/5 italic">
                    {memo.author_bio}
                  </p>
                )}
              </div>

              {/* AI Summary Section */}
              {memo.ai_summary && (
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl relative group">
                  <div className="absolute -top-2.5 left-3 px-1.5 py-0.5 bg-primary text-primary-foreground text-[8px] font-black rounded uppercase tracking-tighter">Summary</div>
                  <p className="text-base text-slate-200 leading-snug font-medium">
                    {memo.ai_summary}
                  </p>
                </div>
              )}

              {/* Snippet & Tags */}
              <div className="space-y-3 pt-1">
                {memo.content_snippet && (
                  <p className="text-slate-400 text-xs leading-relaxed italic opacity-80 line-clamp-2">
                    {memo.content_snippet}
                  </p>
                )}
                
                {memo.ai_tags && memo.ai_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {memo.ai_tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[9px] font-bold border border-slate-700">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 若有個人註解，隨時顯示 */}
          {memo.personal_note && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl relative mt-4">
              <div className="absolute -top-2.5 left-3 px-1.5 py-0.5 bg-slate-700 text-slate-200 text-[8px] font-black rounded uppercase tracking-tighter shadow-sm">備註</div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {memo.personal_note}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* 珍藏按鈕 */}
            <Button 
              variant="ghost" 
              size="icon"
              className={cn(
                "transition-colors",
                memo.is_essential ? "text-amber-500 hover:text-amber-600" : "text-slate-500 hover:text-amber-400"
              )}
              onClick={() => onToggleEssential(memo.id, !memo.is_essential)}
            >
              <Star size={18} fill={memo.is_essential ? "currentColor" : "none"} />
            </Button>

            {/* 封存按鈕 */}
            <Button 
              variant="ghost" 
              size="icon"
              className={cn(
                "transition-colors",
                memo.is_archived ? "text-emerald-500 hover:text-emerald-600" : "text-slate-500 hover:text-emerald-400"
              )}
              onClick={() => {
                onToggleArchive(memo.id, !memo.is_archived)
                onClose()
              }}
              title={memo.is_archived ? "取消封存" : "封存"}
            >
              <Archive size={18} />
            </Button>

            {/* 編輯按鈕 - 找回來了！ */}
            <Button 
              variant="ghost" 
              size="icon"
              className="text-slate-500 hover:text-primary transition-colors"
              onClick={() => {
                onEdit(memo)
              }}
              title="編輯分類與內容"
            >
              <Pencil size={18} />
            </Button>

            {/* 刪除按鈕 */}
            <Button 
              variant="ghost" 
              size="icon"
              className="text-slate-500 hover:text-rose-400"
              disabled={isDeleting}
              onClick={async () => {
                if (confirm('確定要刪除這篇珍藏嗎？')) {
                  setIsDeleting(true)
                  await onDelete(memo.id)
                  setIsDeleting(false)
                  onClose()
                }
              }}
            >
              <Trash2 size={18} />
            </Button>
          </div>

          <a 
            href={memo.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:scale-105 transition-transform"
          >
            <ExternalLink size={16} />
            開啟原文
          </a>
        </div>
      </Card>
    </div>
  )
}
