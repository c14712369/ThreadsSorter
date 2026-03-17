'use client'

import { Plus, Home, Folder, Star, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'home'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 p-6 gap-8 shrink-0">
        <div className="text-2xl font-bold text-primary tracking-tight">T-memo</div>
        <nav className="flex flex-col gap-2 flex-1">
          <NavItem icon={<Home size={20} />} label="主頁" href="/" active={currentTab === 'home'} />
          <NavItem icon={<Folder size={20} />} label="分類" href="/?tab=categories" active={currentTab === 'categories'} />
          <NavItem icon={<Star size={20} />} label="精華" href="/?tab=essentials" active={currentTab === 'essentials'} />
          <NavItem icon={<User size={20} />} label="個人檔案" href="/?tab=profile" active={currentTab === 'profile'} />
        </nav>
        <Button variant="ghost" className="justify-start gap-3 text-slate-400" onClick={handleSignOut}>
          <LogOut size={20} />
          <span>登出</span>
        </Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div className="text-xl font-bold text-primary">T-memo</div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}><LogOut size={20} /></Button>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {children}
          
          {/* Floating Add Button */}
          <Button 
            className="fixed bottom-20 md:bottom-8 right-6 md:right-8 rounded-full w-14 h-14 shadow-lg shadow-primary/20 z-50"
            size="icon"
          >
            <Plus size={32} />
          </Button>
        </section>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden flex items-center justify-around p-3 border-t border-slate-800 bg-background/80 backdrop-blur-md shrink-0">
          <NavItem icon={<Home size={24} />} href="/" active={currentTab === 'home'} vertical />
          <NavItem icon={<Folder size={24} />} href="/?tab=categories" active={currentTab === 'categories'} vertical />
          <NavItem icon={<Star size={24} />} href="/?tab=essentials" active={currentTab === 'essentials'} vertical />
          <NavItem icon={<User size={24} />} href="/?tab=profile" active={currentTab === 'profile'} vertical />
        </nav>
      </main>
    </div>
  )
}

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function NavItem({ icon, label, href, active, vertical }: { icon: React.ReactNode, label?: string, href: string, active?: boolean, vertical?: boolean }) {
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

import { cn } from '@/lib/utils'
