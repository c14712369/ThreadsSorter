'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { MemoCard } from '@/components/MemoCard'
import { AddMemoModal } from '@/components/AddMemoModal'
import { EditMemoModal } from '@/components/EditMemoModal'
import { EssentialBoard } from '@/components/EssentialBoard'
import { CategoryBoard } from '@/components/CategoryBoard'
import {
  LayoutGrid, ListFilter, Plus, Loader2, Star as StarIcon,
  ChevronLeft, ChevronRight, LogOut, Folder, User
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CategoryManagerModal } from '@/components/CategoryManagerModal'

// ── 分頁號碼計算 ────────────────────────────────────────────
function getPageRange(current: number, total: number): (number | 'dot')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const c = current + 1
  if (c <= 4) return [1, 2, 3, 4, 5, 'dot', total]
  if (c >= total - 3) return [1, 'dot', total - 4, total - 3, total - 2, total - 1, total]
  return [1, 'dot', c - 1, c, c + 1, 'dot', total]
}

function HomeContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'home'

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [clipboardUrl, setClipboardUrl] = useState('')
  const [editingMemo, setEditingMemo] = useState<any>(null)
  const [isCatModalOpen, setIsCatModalOpen] = useState(false)

  // ── 主頁資料 ──
  const [memos, setMemos] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  const [onlyEssential, setOnlyEssential] = useState(false)
  const [onlyArchived, setOnlyArchived] = useState(false)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 10

  // ── 分頁 Tab 用的全量資料 ──
  const [allMemos, setAllMemos] = useState<any[]>([])
  const [isViewLoading, setIsViewLoading] = useState(false)

  // ── Scroll container ref ──
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // ── FAB scroll-hide ──
  const lastScrollY = useRef(0)
  const [fabVisible, setFabVisible] = useState(true)

  // ── Clipboard 預讀（在 PWA 回到前景時讀取，避免點 FAB 時跳出「貼上」UI）──
  const cachedClipboard = useRef('')
  useEffect(() => {
    const tryReadClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText()
        cachedClipboard.current = text
      } catch {
        cachedClipboard.current = ''
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tryReadClipboard()
    }
    document.addEventListener('visibilitychange', onVisibility)
    tryReadClipboard()
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // ── 搜尋 Debounce ──
  useEffect(() => {
    const t = setTimeout(() => {
      setMemos([])
      setSearchQuery(searchInput)
      setPage(0)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // 篩選改變時重置頁碼並清空舊卡片，避免切換時舊資料透過遮罩露出
  useEffect(() => {
    setPage(0)
    setMemos([])
  }, [selectedCategoryId, onlyEssential, onlyArchived])

  // 切頁 / 切篩選時回到最上方
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [page, onlyEssential, onlyArchived, selectedCategoryId])

  // Auth guard + 初始資料
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      // 給予一個極短的緩衝，確認不是因為 Session 恢復延遲
      const timer = setTimeout(() => {
        if (!user) router.push('/login')
      }, 500)
      return () => clearTimeout(timer)
    } else {
      fetchCategories()
    }
  }, [user, authLoading])

  // 主頁 memo 查詢
  useEffect(() => {
    if (user && tab === 'home') fetchMemos()
  }, [user, tab, page, selectedCategoryId, onlyEssential, onlyArchived, searchQuery])

  // 分頁 tab 全量查詢
  useEffect(() => {
    if (!user) return
    if (tab === 'categories') fetchAllMemos(false)
    else if (tab === 'essentials') fetchAllMemos(true)
  }, [user, tab])

  // 並行預載所有圖片，存進瀏覽器快取後再顯示卡片
  const preloadImages = (data: any[]): Promise<void> => {
    const urls = data
      .map(m => m.preview_image)
      .filter(url => url && !url.startsWith('data:'))
      .map(url => `/api/image-proxy?url=${encodeURIComponent(url)}`)

    if (urls.length === 0) return Promise.resolve()

    const imageLoads = Promise.all(
      urls.map(src => new Promise<void>(resolve => {
        const img = new Image()
        img.onload = () => resolve()
        img.onerror = () => resolve() // 失敗也繼續，不阻塞
        img.src = src
      }))
    ).then(() => {})

    // 最多等 4 秒，避免網路差時卡住
    const timeout = new Promise<void>(resolve => setTimeout(resolve, 4000))
    return Promise.race([imageLoads, timeout])
  }

  const fetchMemos = async () => {
    if (!user) return
    setIsLoading(true)
    let query = supabase
      .from('memos')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (selectedCategoryId !== 'all') query = query.eq('category_id', selectedCategoryId)
    if (onlyArchived) {
      query = query.eq('is_archived', true)
    } else {
      query = query.eq('is_archived', false)
      if (onlyEssential) query = query.eq('is_essential', true)
    }
    if (searchQuery) query = query.ilike('content_snippet', `%${searchQuery}%`)

    const { data, count } = await query
    setTotalCount(count || 0)

    if (data) {
      // 先預載圖片，全部就緒後才一次顯示所有卡片
      await preloadImages(data)
      setMemos(data)
    }

    setIsLoading(false)
  }

  const fetchAllMemos = async (essentialOnly: boolean) => {
    if (!user) return
    setIsViewLoading(true)
    let query = supabase
      .from('memos')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    if (essentialOnly) query = query.eq('is_essential', true)
    const { data } = await query
    if (data) setAllMemos(data)
    setIsViewLoading(false)
  }

  const fetchCategories = async () => {
    if (!user) return
    const { data } = await supabase.from('categories').select('*').eq('user_id', user.id).order('name')
    if (data) setCategories(data)
  }

  const handleDeleteMemo = async (id: string) => {
    const { error } = await supabase.from('memos').delete().eq('id', id)
    if (!error) {
      setMemos(prev => prev.filter(m => m.id !== id))
      setAllMemos(prev => prev.filter(m => m.id !== id))
      setTotalCount(prev => prev - 1)
    }
  }

  const handleUpdateMemo = (updatedMemo: any) => {
    setMemos(prev => prev.map(m => m.id === updatedMemo.id ? updatedMemo : m))
    setAllMemos(prev => prev.map(m => m.id === updatedMemo.id ? updatedMemo : m))
  }

  const handleToggleEssential = async (id: string, is_essential: boolean) => {
    if (onlyEssential && !is_essential) {
      setMemos(prev => prev.filter(m => m.id !== id))
      setTotalCount(prev => prev - 1)
    } else {
      setMemos(prev => prev.map(m => m.id === id ? { ...m, is_essential } : m))
    }
    if (tab === 'essentials' && !is_essential) {
      setAllMemos(prev => prev.filter(m => m.id !== id))
    } else {
      setAllMemos(prev => prev.map(m => m.id === id ? { ...m, is_essential } : m))
    }
    await supabase.from('memos').update({ is_essential }).eq('id', id)
  }

  const handleToggleArchive = async (id: string, is_archived: boolean) => {
    setMemos(prev => prev.filter(m => m.id !== id))
    setAllMemos(prev => prev.filter(m => m.id !== id))
    setTotalCount(prev => prev - 1)
    await supabase.from('memos').update({ is_archived }).eq('id', id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── 共用 Modals (所有 tab 共享) ──
  const sharedModals = (
    <>
      <AddMemoModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setClipboardUrl('') }} onSuccess={fetchMemos} initialUrl={clipboardUrl} />
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
    </>
  )

  // ══════════════════════════════════════════════
  // Tab: 分類
  // ══════════════════════════════════════════════
  if (tab === 'categories') {
    return (
      <div className="flex flex-col h-full w-full max-w-2xl mx-auto overflow-hidden bg-[#0B1120]">
        <div className="shrink-0 pt-7 pb-4 px-5">
          <h1 className="text-2xl font-black text-white tracking-tighter">分類</h1>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-24 no-scrollbar">
          {isViewLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              <CategoryBoard
                categories={categories}
                memos={allMemos}
                onDetail={setEditingMemo}
                onDeleteMemo={handleDeleteMemo}
                onToggleEssential={handleToggleEssential}
                onManageCategories={() => setIsCatModalOpen(true)}
              />
            </div>
          )}
        </div>
        {sharedModals}
      </div>
    )
  }

  // ══════════════════════════════════════════════
  // Tab: 靈感牆
  // ══════════════════════════════════════════════
  if (tab === 'essentials') {
    return (
      <div className="flex flex-col h-full w-full max-w-2xl mx-auto overflow-hidden bg-[#0B1120]">
        <div className="shrink-0 pt-7 pb-4 px-5">
          <h1 className="text-2xl font-black text-white tracking-tighter">靈感牆</h1>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-24 no-scrollbar">
          {isViewLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              <EssentialBoard
                memos={allMemos}
                onDetail={setEditingMemo}
                onDeleteMemo={handleDeleteMemo}
                onToggleEssential={handleToggleEssential}
              />
            </div>
          )}
        </div>
        {sharedModals}
      </div>
    )
  }

  // ══════════════════════════════════════════════
  // Tab: 個人
  // ══════════════════════════════════════════════
  if (tab === 'profile') {
    return (
      <div className="flex flex-col h-full w-full max-w-2xl mx-auto overflow-hidden bg-[#0B1120]">
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <User size={36} className="text-primary/60" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-white font-bold">{user?.email}</p>
            <p className="text-slate-500 text-xs">{totalCount} 篇收藏 · {categories.length} 個分類</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold hover:bg-rose-500/20 transition-colors"
          >
            <LogOut size={16} />
            登出
          </button>
        </div>
        {sharedModals}
      </div>
    )
  }

  // ══════════════════════════════════════════════
  // Tab: 主頁 (home)
  // ══════════════════════════════════════════════
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasPagination = totalCount > PAGE_SIZE

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto overflow-hidden relative bg-[#0B1120]">

      {/* ── 標頭 ── */}
      <div className="shrink-0 pt-7 pb-3 px-5 space-y-3.5 z-30">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white tracking-tighter">Thorter</h1>
          <div className="flex items-center gap-1">
            <button className="p-2 text-slate-400 hover:text-white transition-colors" onClick={() => setIsCatModalOpen(true)} title="管理分類">
              <Folder size={20} />
            </button>
            <button className="p-2 text-slate-400 hover:text-rose-400 transition-colors" onClick={handleLogout} title="登出">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* 搜尋欄 */}
        <div className="relative">
          <input
            type="text"
            placeholder="搜尋收藏..."
            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary/30 transition-colors placeholder:text-slate-600"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* 篩選列 */}
        <div className="flex gap-2 items-center">
          <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
            {[
              { id: 'all', label: '全部', action: () => { setOnlyEssential(false); setOnlyArchived(false) }, active: !onlyEssential && !onlyArchived },
              { id: 'essentials', label: '釘選', icon: <StarIcon size={11} fill="currentColor" />, action: () => { setOnlyEssential(true); setOnlyArchived(false) }, active: onlyEssential && !onlyArchived },
              { id: 'archived', label: '封存', icon: <Folder size={11} />, action: () => { setOnlyEssential(false); setOnlyArchived(true) }, active: onlyArchived },
            ].map((tabItem) => (
              <button
                key={tabItem.id}
                onClick={tabItem.action}
                className={cn(
                  "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 border shrink-0",
                  tabItem.active
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : "bg-white/5 text-slate-500 border-white/5 hover:border-white/10 hover:text-slate-300"
                )}
              >
                {tabItem.icon}
                {tabItem.label}
              </button>
            ))}
          </div>

          {/* 分類選單 */}
          <div className="relative shrink-0">
            <select
              className="bg-white/5 border border-white/5 rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold text-slate-400 appearance-none focus:outline-none focus:border-primary/30 transition-colors max-w-[7rem]"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              <option value="all">所有分類</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <ListFilter size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── 列表 ── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {/* 切頁遮罩：有資料且正在 loading 時顯示 */}
        {isLoading && memos.length > 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0B1120]/75 backdrop-blur-[2px] pointer-events-none">
            <Loader2 className="animate-spin text-primary" size={28} strokeWidth={2.5} />
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className="h-full overflow-y-auto overscroll-contain px-5 pt-1 pb-3 no-scrollbar"
          onScroll={(e) => {
            const curr = e.currentTarget.scrollTop
            if (curr > lastScrollY.current + 8) setFabVisible(false)
            else if (curr < lastScrollY.current - 8) setFabVisible(true)
            lastScrollY.current = curr
          }}
        >
          {isLoading && memos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-primary" size={36} strokeWidth={3} />
              <p className="text-xs font-black uppercase tracking-widest text-slate-600">載入中</p>
            </div>
          ) : memos.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-[2rem] text-slate-500 space-y-3 bg-white/[0.02]">
              <div className="flex justify-center opacity-10"><LayoutGrid size={56} /></div>
              <p className="font-bold text-slate-500 text-sm">尚無內容</p>
              <Button variant="ghost" size="sm" onClick={() => setIsAddModalOpen(true)} className="rounded-xl border border-white/10 text-xs">立即新增</Button>
            </div>
          ) : (
            <div
              key={`${onlyEssential}-${onlyArchived}-${selectedCategoryId}-${page}`}
              className="grid gap-3 animate-in fade-in duration-200"
            >
              {memos.map((memo) => (
                <MemoCard
                  key={memo.id}
                  memo={memo}
                  categoryName={categories.find(c => c.id === memo.category_id)?.name}
                  onEdit={setEditingMemo}
                  onDelete={handleDeleteMemo}
                  onToggleEssential={handleToggleEssential}
                  onToggleArchive={handleToggleArchive}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 分頁 ── */}
      {hasPagination && (
        <div className="shrink-0 flex items-center justify-center gap-1 px-5 py-2 pb-3 border-t border-white/[0.04]">
          <button
            disabled={page === 0}
            onClick={() => { setMemos([]); setPage(p => p - 1) }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          {getPageRange(page, totalPages).map((p, i) =>
            p === 'dot' ? (
              <span key={`dot-${i}`} className="w-8 h-8 flex items-center justify-center text-slate-700 text-xs select-none">…</span>
            ) : (
              <button
                key={p}
                onClick={() => { setMemos([]); setPage((p as number) - 1) }}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-bold transition-colors",
                  (p as number) - 1 === page
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "text-slate-500 hover:text-white hover:bg-white/5"
                )}
              >
                {p}
              </button>
            )
          )}

          <button
            disabled={(page + 1) * PAGE_SIZE >= totalCount}
            onClick={() => { setMemos([]); setPage(p => p + 1) }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── FAB ── */}
      <button
        onClick={() => {
          setClipboardUrl(cachedClipboard.current)
          setIsAddModalOpen(true)
        }}
        aria-label="新增收藏"
        className={cn(
          "fixed bottom-6 right-5 w-[3.25rem] h-[3.25rem] bg-primary text-primary-foreground rounded-full shadow-xl shadow-primary/25 z-[90] flex items-center justify-center group",
          "transition-all duration-300",
          fabVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-90 pointer-events-none"
        )}
      >
        <Plus size={26} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {sharedModals}
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
