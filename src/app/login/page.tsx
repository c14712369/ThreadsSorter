'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Mail, Lock, Loader2, Sparkles, Eye, EyeOff, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage({ text: '登入失敗：' + error.message, type: 'error' })
      } else {
        router.push('/')
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setMessage({ text: '註冊失敗：' + error.message, type: 'error' })
      } else {
        setMessage({ text: '已寄送驗證信到您的信箱，請點擊連結完成註冊！', type: 'success' })
      }
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-slate-900 border-primary/20">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Thorter</h1>
          <p className="text-slate-400">專為 Threads 設計的知識管理工具</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-slate-800/80 rounded-xl p-1 gap-1">
          <button
            onClick={() => { setMode('login'); setMessage(null) }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              mode === 'login' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            登入
          </button>
          <button
            onClick={() => { setMode('register'); setMessage(null) }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              mode === 'register' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            註冊帳號
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Email 地址</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="email"
                required
                placeholder="you@example.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">密碼</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder={mode === 'register' ? '至少 6 個字元' : '輸入密碼'}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-11 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full py-4 font-bold text-lg" disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : mode === 'login' ? (
              '登入'
            ) : (
              <span className="flex items-center gap-2"><UserPlus size={18} /> 建立帳號</span>
            )}
          </Button>
        </form>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-xl text-sm text-center font-medium ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {message.text}
          </div>
        )}

        <p className="text-center text-xs text-slate-500 pt-4 border-t border-slate-800">
          登入即代表您同意我們的服務條款與隱私權政策
        </p>
      </Card>
    </div>
  )
}
