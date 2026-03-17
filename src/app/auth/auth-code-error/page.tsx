'use client'

import { useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error_description') || searchParams.get('error') || '驗證代碼無效或已過期'

  return (
    <Card className="w-full max-w-md p-8 space-y-6 bg-slate-900 border-rose-500/20 text-center">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
          <AlertCircle size={40} />
        </div>
      </div>
      
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">身分驗證失敗</h1>
        <p className="text-slate-400 text-sm">
          {error}
        </p>
      </div>

      <div className="p-4 bg-slate-800/50 rounded-xl text-xs text-slate-500 text-left space-y-2">
        <p>常見原因：</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>驗證連結已使用過（連結僅能使用一次）</li>
          <li>驗證連結已過期（請重新發送連結）</li>
          <li>瀏覽器 Cookie 被禁用</li>
        </ul>
      </div>

      <Link href="/login" className="block">
        <Button variant="secondary" className="w-full gap-2">
          <ArrowLeft size={18} /> 返回登入
        </Button>
      </Link>
    </Card>
  )
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<Loader2 className="animate-spin text-primary" />}>
        <ErrorContent />
      </Suspense>
    </div>
  )
}
