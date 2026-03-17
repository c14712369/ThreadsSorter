'use client'

import { X, ExternalLink, Calendar, User, Tag, MessageCircle, Copy, Check, Trash2 } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { useState } from 'react'

export function MemoDetailModal({ 
  memo, 
  isOpen, 
  onClose,
  categoryName,
  onDelete,
  onToggleEssential,
  onEdit
}: { 
  memo: any, 
  isOpen: boolean, 
  onClose: () => void,
  categoryName?: string,
  onDelete: (id: string) => void,
  onToggleEssential: (id: string, is_essential: boolean) => void,
  onEdit: (memo: any) => void
}) {
  const [copied, setCopied] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen || !memo) return null

  const handleCopy = () => {
    const text = `【AI 摘要】\n${memo.ai_summary || memo.personal_note}\n\n【原文連結】\n${memo.url}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        {/* Header Image or Placeholder */}
        <div className="w-full h-48 sm:h-64 relative bg-slate-800 overflow-hidden shrink-0">
          {memo.preview_image ? (
            <img 
              src={memo.preview_image} 
              alt="Preview" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              <MessageCircle size={64} className="text-slate-700 opacity-50" />
            </div>
          )}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Metadata Bar */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            <div className="flex items-center gap-1.5 text-primary">
              <User size={14} />
              {memo.author_handle}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              {new Date(memo.created_at).toLocaleDateString()}
            </div>
            {categoryName && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                <Tag size={12} />
                {categoryName}
              </div>
            )}
          </div>

          {/* AI Summary Section */}
          {(memo.ai_summary || memo.personal_note) && (
            <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl relative group">
              <div className="absolute -top-3 left-4 px-2 py-1 bg-primary text-primary-foreground text-[10px] font-black rounded uppercase tracking-tighter">AI Summary</div>
              <p className="text-lg text-slate-200 leading-relaxed font-medium">
                {memo.ai_summary || memo.personal_note}
              </p>
            </div>
          )}

          {/* Original Snippet Section */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] flex items-center gap-2">
              <div className="w-4 h-px bg-slate-800" />
              原始內容片段
            </h4>
            <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800">
              <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                {memo.content_snippet}
              </p>
            </div>
          </div>

          {/* Tags */}
          {memo.ai_tags && memo.ai_tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {memo.ai_tags.map((tag: string) => (
                <span key={tag} className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              className="gap-2 text-slate-400 hover:text-white px-3"
              onClick={handleCopy}
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              <span className="text-xs">{copied ? '已複製' : '摘要'}</span>
            </Button>
            
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

            <Button 
              variant="ghost" 
              size="icon"
              className="text-slate-500 hover:text-primary"
              onClick={() => onEdit(memo)}
            >
              <Tag size={18} />
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
