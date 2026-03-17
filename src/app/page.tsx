'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { MemoCard } from '@/components/MemoCard'
import { AddMemoModal } from '@/components/AddMemoModal'
import { EditMemoModal } from '@/components/EditMemoModal'
import { CategoryManager } from '@/components/CategoryManager'
import { EssentialBoard } from '@/components/EssentialBoard'
import { CategoryBoard } from '@/components/CategoryBoard'
import { LayoutGrid, ListFilter, Plus, Loader2, Settings, Sparkles, Star as StarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useSearchParams } from 'next/navigation'

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingMemo, setEditingMemo] = useState<any>(null)
  const [showCatManager, setShowCatManager] = useState(false)
  
  const [memos, setMemos] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  const [onlyEssential, setOnlyEssential] = useState(false)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 10

  // Sync state with URL params
  useEffect(() => {
    if (tab === 'essentials') {
      setOnlyEssential(true)
      setShowCatManager(false)
    } else if (tab === 'categories') {
      setOnlyEssential(false)
      setShowCatManager(true)
    } else {
      setOnlyEssential(false)
      setShowCatManager(false)
    }
  }, [tab])

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0)
  }, [selectedCategoryId, onlyEssential, searchQuery])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user) {
      Promise.all([fetchMemos(), fetchCategories(), fetchTotalCount()])
    }
  }, [user, authLoading, page, selectedCategoryId, onlyEssential])

  const fetchTotalCount = async () => {
    if (!user) return
    let query = supabase
      .from('memos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if (selectedCategoryId !== 'all') query = query.eq('category_id', selectedCategoryId)
    if (onlyEssential) query = query.eq('is_essential', true)
    const { count } = await query
    setTotalCount(count || 0)
  }

  const fetchMemos = async () => {
    if (!user) return
    setIsLoading(true)
    let query = supabase
      .from('memos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (selectedCategoryId !== 'all') query = query.eq('category_id', selectedCategoryId)
    if (onlyEssential) query = query.eq('is_essential', true)
    const { data } = await query
    if (data) setMemos(data)
    setIsLoading(false)
  }

  const fetchCategories = async () => {
    if (!user) return
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
    if (data) setCategories(data)
  }

  const filteredMemos = memos.filter(memo => {
    const matchesSearch = searchQuery ? (
      memo.content_snippet?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memo.author_handle?.toLowerCase().includes(searchQuery.toLowerCase())
    ) : true
    const matchesCategory = selectedCategoryId === 'all' ? true : memo.category_id === selectedCategoryId
    const matchesEssential = onlyEssential ? memo.is_essential === true : true
    
    return matchesSearch && matchesCategory && matchesEssential
  })

  const handleAddMemo = async (metadata: any) => {
    if (!user) return

    const { data, error } = await supabase
      .from('memos')
      .insert([
        { 
          user_id: user.id,
          ...metadata
        }
      ])
      .select()

    if (data) {
      setMemos([data[0], ...memos])
    }
    setIsAddModalOpen(false)
  }

  const handleUpdateMemo = (updatedMemo: any) => {
    setMemos(memos.map(m => m.id === updatedMemo.id ? updatedMemo : m))
  }

  const handleDeleteMemo = (id: string) => {
    setMemos(memos.filter(m => m.id !== id))
  }

  const handleToggleEssential = async (id: string, is_essential: boolean) => {
    // Optimistic update
    setMemos(memos.map(m => m.id === id ? { ...m, is_essential } : m))

    const { error } = await supabase
      .from('memos')
      .update({ is_essential })
      .eq('id', id)

    if (error) {
      // Rollback on error
      fetchMemos()
    }
  }

  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') return memos.length
    return memos.filter(m => m.category_id === categoryId).length
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24">
      {/* Header & Search */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">精華庫</h1>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              {filteredMemos.length}
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={onlyEssential ? 'primary' : 'ghost'} 
              size="icon" 
              onClick={() => setOnlyEssential(!onlyEssential)}
              className={onlyEssential ? "text-primary-foreground" : "text-slate-400"}
            >
              <StarIcon size={20} fill={onlyEssential ? 'currentColor' : 'none'} />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400" onClick={() => setShowCatManager(!showCatManager)}>
              <Settings size={20} />
            </Button>
          </div>
        </div>

        {showCatManager && user && (
          <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 animate-in slide-in-from-top-2 duration-300">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-white">
              <Sparkles size={16} className="text-primary" /> 分類管理
            </h3>
            <CategoryManager userId={user.id} categories={categories} onCategoriesChange={fetchCategories} />
          </div>
        )}

        <div className="relative">
          <input 
            type="text"
            placeholder="搜尋標註或作者..."
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-all font-medium placeholder:text-slate-600"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button 
          onClick={() => setSelectedCategoryId('all')}
          className={cn(
            "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5",
            selectedCategoryId === 'all' 
              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
              : "bg-slate-900/50 text-slate-500 border-slate-800 hover:border-slate-700"
          )}
        >
          全部內容
          <span className={cn(
            "px-1.5 py-0.5 rounded-md text-[10px] scale-90",
            selectedCategoryId === 'all' ? "bg-white/20" : "bg-slate-800 text-slate-500"
          )}>
            {getCategoryCount('all')}
          </span>
        </button>
        {categories.map((cat) => (
          <button 
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            className={cn(
              "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5",
              selectedCategoryId === cat.id 
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                : "bg-slate-900/50 text-slate-500 border-slate-800 hover:border-slate-700"
            )}
          >
            {cat.name}
            <span className={cn(
              "px-1.5 py-0.5 rounded-md text-[10px] scale-90",
              selectedCategoryId === cat.id ? "bg-white/20" : "bg-slate-800 text-slate-500"
            )}>
              {getCategoryCount(cat.id)}
            </span>
          </button>
        ))}
      </div>

      {/* Dynamic Board based on Tab */}
      {tab === 'essentials' ? (
        <EssentialBoard 
          memos={filteredMemos} 
          onUpdateMemo={handleUpdateMemo}
          onDeleteMemo={handleDeleteMemo}
          onToggleEssential={handleToggleEssential}
        />
      ) : tab === 'categories' ? (
        <CategoryBoard 
          categories={categories}
          memos={filteredMemos}
          onUpdateMemo={handleUpdateMemo}
          onDeleteMemo={handleDeleteMemo}
          onToggleEssential={handleToggleEssential}
        />
      ) : (
        <div className="grid gap-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
              <Loader2 className="animate-spin text-primary" size={40} />
              <p className="text-sm font-medium">載入中...</p>
            </div>
          ) : filteredMemos.map((memo) => (
            <MemoCard 
              key={memo.id} 
              memo={memo} 
              categoryName={categories.find(c => c.id === memo.category_id)?.name}
              onEdit={setEditingMemo}
              onToggleEssential={handleToggleEssential}
            />
          ))}
          {!isLoading && filteredMemos.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl text-slate-500 space-y-2">
              <p className="font-medium text-slate-400">{searchQuery ? '找不到符合條件的結果' : '精華庫目前是空的'}</p>
              <p className="text-xs text-slate-600">點擊右下角按鈕開始收藏精彩內容</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination UI Data only visible if needed */}
        {!isLoading && totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-800/50">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              顯示第 {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, totalCount)} 則 / 共 {totalCount} 則
            </p>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="rounded-xl h-8 px-2"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={(page + 1) * PAGE_SIZE >= totalCount}
                onClick={() => setPage(p => p + 1)}
                className="rounded-xl h-8 px-2"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

      <AddMemoModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddMemo}
      />

      <EditMemoModal
        isOpen={!!editingMemo}
        memo={editingMemo}
        onClose={() => setEditingMemo(null)}
        onUpdate={handleUpdateMemo}
        onDelete={handleDeleteMemo}
      />
      
      <Button 
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-20 md:bottom-8 right-6 md:right-8 rounded-full w-14 h-14 shadow-2xl shadow-primary/30 z-[60] scale-110"
        size="icon"
      >
        <Plus size={32} />
      </Button>
    </div>
  )
}
