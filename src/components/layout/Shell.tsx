'use client'

import { ReactNode, Suspense } from 'react'
import { Plus, Home, Folder, Star, User, LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function ShellContent({ children }: { children: ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'home'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="h-[100dvh] w-full bg-background text-foreground flex flex-col md:flex-row overflow-hidden relative">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 p-6 gap-8 shrink-0 h-full">
        <div className="text-2xl font-bold text-primary tracking-tight">T-memo</div>
        <nav className="flex flex-col gap-2 flex-1">
          <NavItem icon={<Home size={20} />} label="主頁" href="/" active={currentTab === 'home'} />
          <NavItem icon={<Folder size={20} />} label="分類" href="/?tab=categories" active={currentTab === 'categories'} />
          <NavItem icon={<Star size={20} />} label="靈感牆" href="/?tab=essentials" active={currentTab === 'essentials'} />
          <NavItem icon={<User size={20} />} label="個人檔案" href="/?tab=profile" active={currentTab === 'profile'} />
        </nav>
        <Button variant="ghost" className="justify-start gap-3 text-slate-400" onClick={handleSignOut}>
          <LogOut size={20} />
          <span>登出</span>
        </Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative">
        <section className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </section>

        {/* Mobile Bottom Nav - Fixed at screen bottom */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around p-3 border-t border-slate-800 bg-background/95 backdrop-blur-lg z-[60] pb-safe">
          <NavItem icon={<Home size={24} />} href="/" active={currentTab === 'home'} vertical />
          <NavItem icon={<Folder size={24} />} href="/?tab=categories" active={currentTab === 'categories'} vertical />
          <NavItem icon={<Star size={24} />} href="/?tab=essentials" active={currentTab === 'essentials'} vertical />
          <NavItem icon={<User size={24} />} href="/?tab=profile" active={currentTab === 'profile'} vertical />
        </nav>
      </main>
    </div>
  )
}

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <ShellContent>{children}</ShellContent>
    </Suspense>
  )
}function NavItem({ icon, label, href, active, vertical }: { icon: React.ReactNode, label?: string, href: string, active?: boolean, vertical?: boolean }) {
  return (
    <Link 
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
        active ? "text-primary bg-primary/10" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50",
        vertical && "flex-col gap-1 px-1 py-1"
      )}
    >
      {icon}
      {label && <span className="font-medium">{label}</span>}
    </Link>
  )
}
