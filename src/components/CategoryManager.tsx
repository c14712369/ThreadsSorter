'use client'

import { useState, useEffect } from 'react'
import { Plus, Tag, X, Loader2, Edit2, Check } from 'lucide-react'
import { Button } from './ui/Button'
import { supabase } from '@/lib/supabase'

export function CategoryManager({ 
  userId, 
  categories,
  onCategoriesChange 
}: { 
  userId: string, 
  categories: any[],
  onCategoriesChange: () => void 
}) {
  const [newCatName, setNewCatName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    setIsAdding(true)
    const { error } = await supabase
      .from('categories')
      .insert([{ user_id: userId, name: newCatName.trim() }])
    
    if (!error) {
      onCategoriesChange()
      setNewCatName('')
    }
    setIsAdding(false)
  }

  const handleUpdateCategory = async (id: string) => {
    if (!editName.trim()) return
    const { error } = await supabase
      .from('categories')
      .update({ name: editName.trim() })
      .eq('id', id)

    if (!error) {
      onCategoriesChange()
      setEditingId(null)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`確定要刪除「${name}」分類嗎？這不會刪除該分類下的文章，但文章會變為「未分類」。`)) return
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
    
    if (!error) {
      onCategoriesChange()
    }
  }

  return (
    <div className="space-y-4">
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
          className="rounded-lg shadow-lg hover:shadow-primary/20"
        >
          {isAdding ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
        {categories.map(cat => (
          <div 
            key={cat.id}
            className="flex items-center gap-3 bg-slate-900/50 border border-slate-800/80 px-4 py-2.5 rounded-xl text-xs text-slate-300 group hover:border-slate-700 transition-all hover:bg-slate-800/50"
          >
            <Tag size={12} className="text-primary/50" />
            
            {editingId === cat.id ? (
              <div className="flex-1 flex gap-2">
                <input 
                  autoFocus
                  className="bg-slate-950 border border-primary/30 rounded px-2 py-0.5 text-white w-full outline-none"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(cat.id)}
                  onBlur={() => setEditingId(null)}
                />
                <button onClick={() => handleUpdateCategory(cat.id)} className="text-primary hover:text-primary/80">
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <>
                <span className="flex-1 font-medium truncate">{cat.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-white transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button 
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-slate-500 gap-2 border-2 border-dashed border-slate-800/50 rounded-2xl">
            <Tag size={24} className="opacity-20" />
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-40">尚未建立任何分類</p>
          </div>
        )}
      </div>
    </div>
  )
}
