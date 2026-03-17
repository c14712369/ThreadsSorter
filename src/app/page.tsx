'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { MemoCard } from '@/components/MemoCard'
import { AddMemoModal } from '@/components/AddMemoModal'
import { EditMemoModal } from '@/components/EditMemoModal'
import { EssentialBoard } from '@/components/EssentialBoard'
import { CategoryBoard } from '@/components/CategoryBoard'
import { LayoutGrid, ListFilter, Plus, Loader2, Settings, Sparkles, Star as StarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CategoryManagerModal } from '@/components/CategoryManagerModal'
import { MemoDetailModal } from '@/components/MemoDetailModal'

function HomeContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingMemo, setEditingMemo] = useState<any>(null)
  const [isCatModalOpen, setIsCatModalOpen] = useState(false)
  const [selectedMemoDetail, setSelectedMemoDetail] = useState<any>(null)
  
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
    } else if (tab === 'categories') {
      setOnlyEssential(false)
    } else {
      setOnlyEssential(false)
    }
    setPage(0)
  }, [tab])

  // Reset to page 0 when filtering
  useEffect(() => {
    setPage(0)
  }, [selectedCategoryId, onlyEssential, searchQuery])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user) {
      fetchMemos()
      fetchCategories()
      fetchTotalCount()
    }
  }, [user, authLoading, page, selectedCategoryId, onlyEssential, searchQuery])

  const fetchTotalCount = async () => {
    if (!user) return
    let query = supabase
      .from('memos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    
    if (selectedCategoryId !== 'all') query = query.eq('category_id', selectedCategoryId)
    if (onlyEssential) query = query.eq('is_essential', true)
    if (searchQuery) query = query.ilike('content_snippet', `%${searchQuery}%`)
    
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
    if (searchQuery) query = query.ilike('content_snippet', `%${searchQuery}%`)
    
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


  const handleDeleteMemo = async (id: string) => {
    const { error } = await supabase.from('memos').delete().eq('id', id)
    if (!error) {
      setMemos(memos.filter(m => m.id !== id))
      fetchTotalCount()
      if (selectedMemoDetail?.id === id) setSelectedMemoDetail(null)
    }
  }

  const handleUpdateMemo = (updatedMemo: any) => {
    setMemos(memos.map(m => m.id === updatedMemo.id ? updatedMemo : m))
    if (selectedMemoDetail?.id === updatedMemo.id) setSelectedMemoDetail(updatedMemo)
  }

  const handleToggleEssential = async (id: string, is_essential: boolean) => {
    setMemos(memos.map(m => m.id === id ? { ...m, is_essential } : m))
    if (selectedMemoDetail?.id === id) setSelectedMemoDetail({ ...selectedMemoDetail, is_essential })
    
    await supabase.from('memos').update({ is_essential }).eq('id', id)
  }

  const getCategoryCount = (categoryId: string) => {
    // This is a simplified client-side count for the tabs
    if (categoryId === 'all') return totalCount
    // For specific categories, we'd ideally fetch counts from API, but for now use current state if available
    return categories.find(c => c.id === categoryId)?.count || 0
  }

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto overflow-hidden relative">
      {/* 1. 固定標頭區域 (Fixed Header) - 絕對不捲動 */}
      <div className="shrink-0 pt-6 pb-4 px-4 sm:px-0 bg-background border-b border-white/5 space-y-4 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {tab === 'essentials' ? '靈感牆' : tab === 'categories' ? '分類看板' : '我的珍藏'}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black border border-primary/20 uppercase">
              {totalCount} Total
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={onlyEssential ? 'primary' : 'ghost'} 
              size="icon" 
              onClick={() => setOnlyEssential(!onlyEssential)}
              className={cn("rounded-xl transition-all", onlyEssential ? "shadow-lg shadow-primary/20" : "text-slate-400")}
            >
              <StarIcon size={20} fill={onlyEssential ? 'currentColor' : 'none'} />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white rounded-xl" onClick={() => setIsCatModalOpen(true)}>
              <Settings size={20} />
            </Button>
          </div>
        </div>

        <div className="relative group">
          <input 
            type="text"
            placeholder="搜尋你的靈感..."
            className="w-full bg-slate-900/40 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium placeholder:text-slate-600 shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => setSelectedCategoryId('all')}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2",
              selectedCategoryId === 'all' 
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                : "bg-slate-900/40 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300"
            )}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2",
                selectedCategoryId === cat.id 
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                  : "bg-slate-900/40 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 2. 獨立捲軸文章列表區域 (Scrollable List Container) */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-0 pt-4 pb-32 no-scrollbar">
        {tab === 'essentials' ? (
          <EssentialBoard 
            memos={memos} 
            onDetail={setSelectedMemoDetail}
            onDeleteMemo={handleDeleteMemo}
            onToggleEssential={handleToggleEssential}
          />
        ) : tab === 'categories' ? (
          <CategoryBoard 
            categories={categories}
            memos={memos} 
            onDetail={setSelectedMemoDetail}
            onDeleteMemo={handleDeleteMemo}
            onToggleEssential={handleToggleEssential}
            onManageCategories={() => setIsCatModalOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                <Loader2 className="animate-spin text-primary" size={40} strokeWidth={3} />
                <p className="text-sm font-black uppercase tracking-widest opacity-50">載入中</p>
              </div>
            ) : memos.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-slate-800/50 rounded-[2rem] text-slate-500 space-y-4 bg-slate-900/20">
                <div className="flex justify-center opacity-20"><LayoutGrid size={64} /></div>
                <div>
                  <p className="font-bold text-slate-400">{searchQuery ? '找不到相關靈感' : '這裡還是空的'}</p>
                  <p className="text-xs text-slate-600 mt-1">開始收藏值得紀錄的 Threads 吧！</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsAddModalOpen(true)} className="rounded-xl border border-slate-800">立即新增</Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {memos.map((memo) => (
                  <MemoCard 
                    key={memo.id} 
                    memo={memo} 
                    categoryName={categories.find(c => c.id === memo.category_id)?.name}
                    onEdit={setSelectedMemoDetail}
                    onDelete={handleDeleteMemo}
                    onToggleEssential={handleToggleEssential}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && totalCount > PAGE_SIZE && (
              <div className="flex items-center justify-between pt-6 border-t border-slate-800/40">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  Page {page + 1} / {Math.ceil(totalCount / PAGE_SIZE)}
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="rounded-xl border border-slate-800 w-10 h-10"
                  >
                    <ChevronLeft size={18} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    disabled={(page + 1) * PAGE_SIZE >= totalCount}
                    onClick={() => setPage(p => p + 1)}
                    className="rounded-xl border border-slate-800 w-10 h-10"
                  >
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. 模態框與懸浮按鈕 (Modals & FAB) */}
      <AddMemoModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchMemos}
      />
      
      <MemoDetailModal 
        memo={selectedMemoDetail}
        isOpen={!!selectedMemoDetail}
        onClose={() => setSelectedMemoDetail(null)}
        categoryName={categories.find(c => c.id === selectedMemoDetail?.category_id)?.name}
        onDelete={handleDeleteMemo}
        onToggleEssential={handleToggleEssential}
        onEdit={(m) => {
          setSelectedMemoDetail(null)
          setEditingMemo(m)
        }}
      />

      <EditMemoModal
        isOpen={!!editingMemo}
        memo={editingMemo}
        onClose={() => setEditingMemo(null)}
        onUpdate={handleUpdateMemo}
        onDelete={handleDeleteMemo}
      />

      <CategoryManagerModal 
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        userId={user?.id || ''}
        categories={categories}
        onCategoriesChange={fetchCategories}
      />

      <Button 
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-24 md:bottom-10 right-6 md:right-10 rounded-full w-14 h-14 shadow-xl shadow-primary/20 z-[100] flex items-center justify-center p-0 hover:scale-110 active:scale-95 transition-all group"
        variant="primary"
      >
        <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
      </Button>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>}>
      <HomeContent />
    </Suspense>
  )
}

