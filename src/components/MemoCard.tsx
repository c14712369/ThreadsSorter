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

  // Highlight / Masonry Mode (for Inspiration Wall)
  if (isHighlightMode) {
    return (
      <Card 
        className="group relative overflow-hidden cursor-pointer border-slate-800 bg-slate-900/40 hover:bg-slate-800 transition-all hover:shadow-2xl hover:shadow-primary/10"
        onClick={() => onEdit?.(memo)}
      >
        {/* Subtle background image overlay */}
        {memo.preview_image && (
          <div className="absolute inset-0 opacity-[0.07] grayscale pointer-events-none group-hover:scale-110 transition-transform duration-1000">
            <img 
              src={memo.preview_image} 
              alt="" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <div className="p-6 relative z-10 space-y-4">
          <div className="flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              @{memo.author_handle}
            </span>
            <Star size={12} className={cn("transition-colors", memo.is_essential ? "text-amber-500 fill-amber-500" : "text-slate-700")} />
          </div>

          <p className="text-lg font-medium text-slate-100 leading-relaxed line-clamp-3">
            {memo.ai_summary || memo.personal_note || memo.content_snippet}
          </p>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2 flex-wrap">
              {memo.ai_tags && memo.ai_tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">#{tag}</span>
              ))}
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('確定要刪除這篇珍藏嗎？')) onDelete?.(memo.id)
              }}
              className="p-1.5 text-slate-600 hover:text-rose-400 transition-all"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </Card>
    )
  }

  // Default Timeline Mode (for Home / Categories)
  return (
    <Card 
      className="flex h-32 overflow-hidden group cursor-pointer border-slate-800 bg-slate-900/40 hover:bg-slate-800 transition-all"
      onClick={() => onEdit?.(memo)}
    >
      {/* Left side: Thumbnail */}
      <div className="w-32 h-32 shrink-0 bg-slate-950/50 relative overflow-hidden border-r border-slate-800">
        {memo.preview_image && !imgError ? (
          <img 
            src={memo.preview_image} 
            alt="Preview" 
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
            <MessageCircle size={32} />
          </div>
        )}
        
        {/* Essential Badge Overlay */}
        {memo.is_essential && (
          <div className="absolute top-2 left-2 p-1 bg-amber-500 rounded-full shadow-lg z-10">
            <Star size={10} fill="white" className="text-white" />
          </div>
        )}
      </div>

      {/* Right side: Content */}
      <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
               <span className="text-[10px] font-black uppercase tracking-widest text-primary truncate">
                 @{memo.author_handle}
               </span>
               {categoryName && (
                 <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 text-[9px] font-bold border border-slate-700 whitespace-nowrap">
                   {categoryName}
                 </span>
               )}
            </div>
            <span className="text-[9px] font-medium text-slate-600 shrink-0">
               {memo.post_timestamp || (memo.created_at ? new Date(memo.created_at).toLocaleDateString() : '')}
            </span>
          </div>
          
          <h3 className="text-sm font-bold text-slate-100 line-clamp-3 leading-snug">
            {memo.ai_summary || memo.personal_note || memo.content_snippet}
          </h3>
          
          {(memo.ai_summary || memo.personal_note) && memo.content_snippet && (
            <p className="text-[11px] text-slate-500 line-clamp-1 italic">
              {memo.content_snippet}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5 overflow-hidden">
            {memo.ai_tags && memo.ai_tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">#{tag}</span>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('確定要刪除這篇珍藏嗎？')) onDelete?.(memo.id)
              }}
              className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
            <div className="p-1.5 text-slate-500">
               <ExternalLink size={14} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

