import { useState } from 'react'
import { MemoCard } from './MemoCard'
import { Folder, ChevronLeft, LayoutGrid, Tag } from 'lucide-react'
import { Button } from './ui/Button'
import IconRenderer from './IconRenderer'

export function CategoryBoard({ 
  categories, 
  memos, 
  onDetail, 
  onDeleteMemo, 
  onToggleEssential,
  onManageCategories
}: { 
  categories: any[], 
  memos: any[], 
  onDetail: (memo: any) => void, 
  onDeleteMemo: (id: string) => void, 
  onToggleEssential: (id: string, is_essential: boolean) => void,
  onManageCategories?: () => void
}) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)

  const getCategoryCount = (id: string) => memos.filter(m => m.category_id === id).length

  // 如果已經選擇了分類，顯示該分類下的文章
  if (activeCategoryId) {
    const activeCat = categories.find(c => c.id === activeCategoryId)
    const filteredMemos = memos.filter(m => m.category_id === activeCategoryId)

    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <Button variant="ghost" size="icon" onClick={() => setActiveCategoryId(null)} className="shrink-0">
            <ChevronLeft size={24} />
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <IconRenderer name={activeCat?.icon || 'Folder'} size={20} className="text-primary" />
              {activeCat?.name || '未知分類'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">{filteredMemos.length} 篇相關文章</p>
          </div>
        </div>

        <div className="grid gap-4">
          {filteredMemos.length === 0 ? (
             <div className="text-center py-10 text-slate-500">此分類暫無內容</div>
          ) : (
             filteredMemos.map(memo => (
               <MemoCard 
                 key={memo.id}
                 memo={memo} 
                 categoryName={activeCat?.name}
                 categoryIcon={activeCat?.icon}
                 onEdit={onDetail}
                 onDelete={onDeleteMemo}
                 onToggleEssential={onToggleEssential}
               />
             ))
          )}
        </div>
      </div>
    )
  }

  // 尚未選擇分類，顯示資料夾網格
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutGrid className="text-primary" size={24} />
          <h2 className="text-xl font-bold">所有分類夾</h2>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onManageCategories}
          className="text-slate-500 hover:text-white gap-2"
        >
          <Folder size={16} />
          管理分類
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategoryId(cat.id)}
            className="flex flex-col items-center justify-center p-6 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-primary/50 rounded-2xl transition-all cursor-pointer group text-center gap-3 h-32"
          >
            <IconRenderer name={cat.icon || 'Folder'} size={32} className="text-slate-500 group-hover:text-primary transition-colors" />
            <div>
              <div className="font-bold text-sm text-slate-200 group-hover:text-white transition-colors">{cat.name}</div>
              <div className="text-xs text-slate-500 mt-1">{getCategoryCount(cat.id)} 篇</div>
            </div>
          </button>
        ))}

        {/* Uncategorized Folder */}
        <button
          onClick={() => setActiveCategoryId('uncategorized')}
          className="flex flex-col items-center justify-center p-6 bg-slate-800/30 hover:bg-slate-800 border border-slate-700/30 hover:border-slate-500 rounded-2xl transition-all cursor-pointer group text-center gap-3 h-32"
        >
          <Tag size={32} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
          <div>
            <div className="font-bold text-sm text-slate-400 group-hover:text-slate-200 transition-colors">未分類</div>
            <div className="text-xs text-slate-600 mt-1">{memos.filter(m => !m.category_id).length} 篇</div>
          </div>
        </button>
      </div>
    </div>
  )
}
