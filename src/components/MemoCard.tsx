import { useState } from 'react'
import { Card } from './ui/Card'
import { Star, ExternalLink, MessageCircle, Trash2, Sparkles, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MemoCardProps {
  memo: {
    id: string
    author_handle: string
    content_snippet: string
    preview_image?: string
    post_timestamp?: string
    is_essential: boolean
    url: string
    personal_note?: string
    category_id?: string
    created_at?: string | Date
    ai_summary?: string
    ai_tags?: string[]
  }
  categoryName?: string
  onEdit?: (memo: any) => void
  onToggleEssential?: (id: string, essential: boolean) => void
  onDelete?: (id: string) => void
  isHighlightMode?: boolean
}

export function MemoCard({ memo, categoryName, onEdit, onToggleEssential, onDelete, isHighlightMode }: MemoCardProps) {
  const [imgError, setImgError] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    const contentToCopy = memo.ai_summary || memo.personal_note || memo.content_snippet
    navigator.clipboard.writeText(contentToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Hightlight / Masonry Mode (for Essentials Board)
  if (isHighlightMode) {
    return (
      <Card 
        className="flex flex-col overflow-hidden group cursor-pointer bg-gradient-to-b from-slate-800 to-slate-900 border-primary/20"
        onClick={() => onEdit?.(memo)}
      >
        <div className="p-5 space-y-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-amber-400" fill="currentColor" />
              <span className="text-white font-bold text-sm truncate">{memo.author_handle}</span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="複製內容"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
              <a 
                href={memo.url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/20 rounded-lg transition-colors"
                title="查看原文"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* AI Summary or Note emphasis */}
          {(memo.ai_summary || memo.personal_note) && (
            <div className="text-lg font-bold text-white leading-snug">
              {memo.ai_summary || memo.personal_note}
            </div>
          )}

          {/* Original Snippet */}
          <p className="text-slate-400 text-sm line-clamp-4 leading-relaxed">
            {memo.content_snippet}
          </p>

          {/* Bottom Bar: Tags & Delete */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2 flex-wrap text-[10px] font-bold">
              {memo.ai_tags && memo.ai_tags.map(tag => (
                   <span key={tag} className="px-2 py-1 rounded bg-primary/20 text-primary uppercase">#{tag}</span>
              ))}
              {!memo.ai_tags?.length && categoryName && (
                   <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">{categoryName}</span>
              )}
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('確定要刪除這篇精華嗎？')) onDelete?.(memo.id)
              }}
              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="刪除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </Card>
    )
  }

  // Default Timeline Mode
  return (
    <Card 
      className="flex h-36 overflow-hidden group cursor-pointer"
      onClick={() => onEdit?.(memo)}
    >
      {/* Left side: Thumbnail */}
      <div className="w-36 h-36 shrink-0 bg-slate-800 relative overflow-hidden">
        {memo.preview_image && !imgError ? (
          <img 
            src={memo.preview_image} 
            alt="Preview" 
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 border-r border-slate-700/50">
            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary/30 group-hover:text-primary/50 transition-colors">
              <MessageCircle size={32} />
            </div>
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter mt-2">No Image</span>
          </div>
        )}
        {memo.is_essential ? (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleEssential?.(memo.id, false);
            }}
            className="absolute top-2 left-2 bg-amber-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform z-10"
            title="取消精華"
          >
            <Star size={14} fill="currentColor" />
          </button>
        ) : (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleEssential?.(memo.id, true);
            }}
            className="absolute top-2 left-2 bg-black/40 text-white/50 p-1.5 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 hover:text-amber-400 hover:bg-black/60 transition-all z-10 border border-white/10"
            title="標記為精華"
          >
            <Star size={14} />
          </button>
        )}
      </div>

      {/* Right side: Content */}
      <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0 bg-slate-900/50">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-primary font-bold text-sm truncate">
                {memo.author_handle}
              </span>
              {categoryName && (
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 whitespace-nowrap">
                  {categoryName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('確定要刪除這篇紀錄嗎？')) onDelete?.(memo.id)
                }}
                className="p-1 text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                title="刪除"
              >
                <Trash2 size={12} />
              </button>
              <a 
                href={memo.url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-primary transition-all px-2 py-1 rounded-lg hover:bg-primary/10"
                title="查看原文"
              >
                <ExternalLink size={12} />
                <span className="hidden sm:inline">查看</span>
              </a>
            </div>
          </div>
          <p className="text-slate-300 text-sm line-clamp-2 leading-snug">
            {memo.content_snippet}
          </p>
          {memo.personal_note && (
            <p className="text-slate-500 text-[11px] line-clamp-1 italic italic">
              💡 {memo.personal_note}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider">
          <span className="flex items-center gap-1 opacity-70">
            {memo.url?.includes('threads.net') ? 'threads.net' : 'instagram.com'}
          </span>
          <span>{memo.post_timestamp || (memo.created_at ? new Date(memo.created_at).toLocaleDateString() : '')}</span>
        </div>
      </div>
    </Card>
  )
}
