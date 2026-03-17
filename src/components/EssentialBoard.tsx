import { MemoCard } from './MemoCard'
import { Sparkles, ArrowRight } from 'lucide-react'

interface EssentialBoardProps {
  memos: any[]
  onUpdateMemo: (memo: any) => void
  onDeleteMemo: (id: string) => void
  onToggleEssential: (id: string, is_essential: boolean) => void
}

export function EssentialBoard({ memos, onUpdateMemo, onDeleteMemo, onToggleEssential }: EssentialBoardProps) {
  if (memos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
        <Sparkles size={48} className="text-slate-700" />
        <p>目前還沒有精華文章</p>
      </div>
    )
  }

  return (
    <div className="columns-1 md:columns-2 gap-4 space-y-4 pb-10">
      {memos.map((memo) => (
        <div key={memo.id} className="break-inside-avoid shadow-2xl hover:-translate-y-1 transition-transform duration-300">
          <MemoCard 
            memo={memo} 
            categoryName={undefined} // 精華區不特別強調分類名稱，聚焦在內容
            onEdit={() => {}} // TODO: 若要支援編輯可加上
            onDelete={onDeleteMemo}
            onToggleEssential={onToggleEssential}
            // 可以透過一個 prop 通知 MemoCard 以「精華版型」渲染
            isHighlightMode={true}
          />
        </div>
      ))}
    </div>
  )
}
