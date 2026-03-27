import { MemoCard } from './MemoCard'
import { Sparkles, ArrowRight } from 'lucide-react'

interface EssentialBoardProps {
  memos: any[]
  categories: any[]
  onUpdateMemo: (memo: any) => void
  onDeleteMemo: (id: string) => void
  onToggleEssential: (id: string, is_essential: boolean) => void
}

export function EssentialBoard({ 
  memos, 
  categories,
  onDetail, 
  onUpdateMemo,
  onDeleteMemo, 
  onToggleEssential 
}: { 
  memos: any[], 
  categories: any[],
  onDetail: (memo: any) => void, 
  onUpdateMemo?: (memo: any) => void,
  onDeleteMemo: (id: string) => void, 
  onToggleEssential: (id: string, is_essential: boolean) => void 
}) {
  if (memos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
        <Sparkles size={48} className="text-slate-700" />
        <p>靈感牆目前是空的，去首頁加入一些吧！</p>
      </div>
    )
  }

  return (
    <div className="columns-1 md:columns-2 gap-4 space-y-4 pb-10">
      {memos.map((memo) => {
        const cat = categories.find(c => c.id === memo.category_id)
        return (
          <div key={memo.id} className="break-inside-avoid shadow-2xl hover:-translate-y-1 transition-transform duration-300">
            <MemoCard 
              memo={memo} 
              categoryName={cat?.name}
              categoryIcon={cat?.icon}
              onEdit={onDetail}
              onUpdate={onUpdateMemo}
              onDelete={onDeleteMemo}
              onToggleEssential={onToggleEssential}
              isHighlightMode={true}
            />
          </div>
        )
      })}
    </div>
  )
}
