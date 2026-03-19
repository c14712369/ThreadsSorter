'use client'

import { X, Sparkles } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { CategoryManager } from './CategoryManager'

export function CategoryManagerModal({ 
  isOpen, 
  onClose, 
  userId, 
  categories, 
  onCategoriesChange 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  userId: string, 
  categories: any[], 
  onCategoriesChange: () => void 
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-lg p-6 space-y-6 shadow-2xl border-primary/20 bg-slate-900 border animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="text-primary" size={24} />
            管理分類
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="bg-slate-950/30 rounded-2xl p-4 border border-slate-800">
          <CategoryManager
            userId={userId}
            categories={categories}
            onCategoriesChange={onCategoriesChange}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="ghost" className="text-slate-400">
            關閉
          </Button>
        </div>
      </Card>
    </div>
  )
}
