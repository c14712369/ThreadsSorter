'use client'

import { useState } from 'react'
import { Plus, Tag, Loader2, Edit2, Check, Trash2 } from 'lucide-react'
import { Button } from './ui/Button'
import { supabase } from '@/lib/supabase'
import { motion, useMotionValue, useTransform } from 'framer-motion'

// 每個分類列表項目（獨立 component 才能有自己的 motion value）
function CategoryItem({
  cat,
  onEdit,
  onDelete,
}: {
  cat: any
  onEdit: (id: string, name: string) => void
  onDelete: (id: string, name: string) => void
}) {
  const [editingName, setEditingName] = useState(cat.name)
  const [isEditing, setIsEditing] = useState(false)
  const x = useMotionValue(0)
  const actionOpacity = useTransform(x, [-90, -20], [1, 0])

  const handleStartEdit = () => {
    setEditingName(cat.name)
    setIsEditing(true)
    x.set(0) // 收回滑動
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* 刪除背景 */}
      <motion.button
        style={{ opacity: actionOpacity }}
        onClick={() => onDelete(cat.id, cat.name)}
        className="absolute inset-y-0 right-0 w-20 bg-rose-500 flex flex-col items-center justify-center text-white gap-1 z-0"
      >
        <Trash2 size={18} />
        <span className="text-[10px] font-bold">刪除</span>
      </motion.button>

      {/* 可滑動的分類列 */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -90, right: 0 }}
        dragElastic={0.05}
        onDragEnd={(_, info) => { if (info.offset.x > -45) x.set(0) }}
        style={{ x }}
        className="relative z-10 flex items-center gap-3 bg-slate-900/80 border border-slate-800/80 px-4 py-3 text-xs text-slate-300 hover:border-slate-700 transition-colors"
      >
        <Tag size={12} className="text-primary/50 shrink-0" />

        {isEditing ? (
          <div className="flex-1 flex gap-2">
            <input
              autoFocus
              className="bg-slate-950 border border-primary/30 rounded px-2 py-0.5 text-white w-full outline-none text-sm"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { onEdit(cat.id, editingName); setIsEditing(false) }
                if (e.key === 'Escape') setIsEditing(false)
              }}
              onBlur={() => setIsEditing(false)}
            />
            <button
              onMouseDown={(e) => e.preventDefault()} // prevent blur before click
              onClick={() => { onEdit(cat.id, editingName); setIsEditing(false) }}
              className="text-primary hover:text-primary/80"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 font-medium truncate">{cat.name}</span>
            <button
              onClick={handleStartEdit}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-600 hover:text-white transition-colors shrink-0"
            >
              <Edit2 size={13} />
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}

export function CategoryManager({
  userId,
  categories,
  onCategoriesChange,
}: {
  userId: string
  categories: any[]
  onCategoriesChange: () => void
}) {
  const [newCatName, setNewCatName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  // 本地副本：樂觀更新用，不等 DB 回應就先反映在 UI
  const [localCats, setLocalCats] = useState<any[]>(categories)

  // 父層 categories 更新時同步（例如新增後）
  useEffect(() => { setLocalCats(categories) }, [categories])

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    setIsAdding(true)
    const { error } = await supabase
      .from('categories')
      .insert([{ user_id: userId, name: newCatName.trim() }])
    if (!error) { onCategoriesChange(); setNewCatName('') }
    setIsAdding(false)
  }

  const handleUpdateCategory = async (id: string, name: string) => {
    if (!name.trim()) return
    // 樂觀更新
    setLocalCats(prev => prev.map(c => c.id === id ? { ...c, name: name.trim() } : c))
    const { error } = await supabase.from('categories').update({ name: name.trim() }).eq('id', id)
    if (error) setLocalCats(categories) // 失敗時還原
    else onCategoriesChange()
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`確定要刪除「${name}」？文章不會被刪除，但會變為未分類。`)) return
    // 立即從 UI 移除，不等 DB
    setLocalCats(prev => prev.filter(c => c.id !== id))
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) setLocalCats(categories) // 失敗時還原
    else onCategoriesChange() // 背景同步父層
  }

  return (
    <div className="space-y-4">
      {/* 新增欄 */}
      <div className="flex gap-2 p-1.5 bg-slate-950/50 rounded-xl border border-slate-800">
        <input
          type="text"
          placeholder="輸入新分類名稱..."
          className="flex-1 bg-transparent border-none rounded-lg px-3 py-2 text-sm text-white focus:outline-none placeholder:text-slate-600"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
        />
        <Button
          size="sm"
          onClick={handleAddCategory}
          disabled={isAdding || !newCatName.trim()}
          className="rounded-lg"
        >
          {isAdding ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
        </Button>
      </div>

      {/* 提示文字 */}
      {categories.length > 0 && (
        <p className="text-[10px] text-slate-700 text-center font-medium tracking-wider uppercase">
          向左滑動可刪除
        </p>
      )}

      {/* 分類列表 */}
      <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto no-scrollbar">
        {localCats.map(cat => (
          <CategoryItem
            key={cat.id}
            cat={cat}
            onEdit={handleUpdateCategory}
            onDelete={handleDeleteCategory}
          />
        ))}
        {localCats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-800/50 rounded-2xl text-slate-500 gap-2">
            <Tag size={24} className="opacity-20" />
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-40">尚未建立任何分類</p>
          </div>
        )}
      </div>
    </div>
  )
}
