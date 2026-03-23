import { useState } from 'react'
import { Card } from './ui/Card'
import { Star, MessageCircle, Trash2, Archive, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import IconRenderer from './IconRenderer'

interface MemoCardProps {
  memo: {
    id: string
    author_handle: string
    author_bio?: string
    content_snippet: string
    preview_image?: string
    post_timestamp?: string
    is_essential: boolean
    is_archived?: boolean
    url: string
    personal_note?: string
    category_id?: string
    created_at?: string | Date
    ai_summary?: string
    ai_tags?: string[]
  }
  categoryName?: string
  categoryIcon?: string
  onEdit?: (memo: any) => void
  onToggleEssential?: (id: string, essential: boolean) => void
  onToggleArchive?: (id: string, archived: boolean) => void
  onDelete?: (id: string) => void
  isHighlightMode?: boolean
}

export function MemoCard({ memo, categoryName, categoryIcon, onEdit, onToggleEssential, onToggleArchive, onDelete, isHighlightMode }: MemoCardProps) {
  const [imgError, setImgError] = useState(false)
  const x = useMotionValue(0)
  
  const actionOpacity = useTransform(x, [-160, -40], [1, 0])
  const actionScale = useTransform(x, [-160, -40], [1, 0.8])

  const getImageUrl = (url?: string) => {
    if (!url) return null
    return `/api/image-proxy?url=${encodeURIComponent(url)}`
  }

  // Highlight / Masonry Mode (Inspiration Wall)
  if (isHighlightMode) {
    return (
      <Card 
        className="group relative overflow-hidden cursor-pointer border-slate-800 bg-slate-900/40 hover:bg-slate-800 transition-colors hover:shadow-2xl hover:shadow-primary/10"
        onClick={() => onEdit?.(memo)}
      >
        {memo.preview_image && (
          <div className="absolute inset-0 opacity-[0.07] grayscale pointer-events-none group-hover:scale-110 transition-transform duration-1000">
            <img 
              src={getImageUrl(memo.preview_image)!}
              alt="" 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 relative z-10 space-y-4">
          <div className="flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                @{memo.author_handle}
              </span>
              {categoryName && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-[8px] font-bold text-slate-400">
                  <IconRenderer name={categoryIcon || 'Tag'} size={8} />
                  <span>{categoryName}</span>
                </div>
              )}
            </div>
            <Star size={12} className={cn("transition-colors", memo.is_essential ? "text-amber-500 fill-amber-500" : "text-slate-700")} />
          </div>

          <p className="text-lg font-medium text-slate-100 leading-relaxed line-clamp-3">
            {memo.content_snippet || memo.ai_summary || memo.personal_note}
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
              aria-label="刪除"
            className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-950">
      {/* Background Swipe Actions */}
      <div className="absolute inset-0 flex justify-end items-center">
        <div className="flex h-full">
          <motion.button
            style={{ opacity: actionOpacity, scale: actionScale }}
            onClick={(e) => {
              e.stopPropagation()
              onToggleArchive?.(memo.id, !memo.is_archived)
              x.set(0)
            }}
            aria-label={memo.is_archived ? '移回' : '封存'}
            className="h-full w-20 flex flex-col items-center justify-center bg-emerald-600 text-white gap-1"
          >
            <Archive size={20} />
            <span className="text-[10px] font-bold">{memo.is_archived ? '移回' : '封存'}</span>
          </motion.button>

          <motion.button
            style={{ opacity: actionOpacity, scale: actionScale }}
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('確定要刪除這篇珍藏嗎？')) onDelete?.(memo.id)
            }}
            aria-label="刪除"
            className="h-full w-20 flex flex-col items-center justify-center bg-rose-500 text-white gap-1"
          >
            <Trash2 size={20} />
            <span className="text-[10px] font-bold">刪除</span>
          </motion.button>
        </div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -160, right: 0 }}
        dragElastic={0.05}
        onDragEnd={(_, info) => {
          if (info.offset.x > -80) x.set(0)
        }}
        style={{ x }}
        className="relative z-10"
      >
        <Card 
          className="flex h-32 overflow-hidden group cursor-pointer border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors"
          onClick={() => {
            if (Math.abs(x.get()) < 10) onEdit?.(memo)
          }}
        >
          {/* Left side: Thumbnail (Use raw img to avoid next/image CORS issues) */}
          <div className="w-32 h-32 shrink-0 bg-slate-950/50 relative overflow-hidden border-r border-slate-800">
            {memo.preview_image && !imgError ? (
              <img
                src={getImageUrl(memo.preview_image)!}
                alt="Preview"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-[filter,transform] duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
                <MessageCircle size={32} />
              </div>
            )}
            
            {memo.is_essential && (
              <div className="absolute top-2 left-2 p-1 bg-amber-500 rounded-full shadow-lg z-10">
                <Star size={10} fill="white" className="text-white" />
              </div>
            )}
          </div>

          {/* 右側 */}
          <div className="flex-1 flex flex-col justify-center px-3.5 py-3 gap-1.5 min-w-0 overflow-hidden">
            {/* 作者 + bio + category */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-black text-primary shrink-0 max-w-[40%] truncate">
                @{memo.author_handle}
              </span>
              {categoryName && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-800 text-[9px] font-bold text-slate-400 shrink-0">
                  <IconRenderer name={categoryIcon || 'Tag'} size={8} />
                  <span className="truncate max-w-[60px]">{categoryName}</span>
                </div>
              )}
              {memo.author_bio && (
                <span className="text-[10px] text-slate-600 truncate min-w-0">{memo.author_bio}</span>
              )}
            </div>

            {/* 內文（2 行）*/}
            <p className="text-sm font-medium text-slate-200 leading-snug line-clamp-2">
              {memo.content_snippet || memo.ai_summary || memo.personal_note}
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
