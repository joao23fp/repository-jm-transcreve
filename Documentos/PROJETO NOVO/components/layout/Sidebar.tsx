'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Upload, BookOpen, CreditCard, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'

type SidebarProps = {
  saldoDisponivel: number
  saldoTotal: number
}

const navItems = [
  { href: '/uploads',    label: 'Upload',    icon: Upload },
  { href: '/resultados', label: 'Biblioteca', icon: BookOpen },
  { href: '/dashboard',  label: 'Créditos',  icon: CreditCard },
]

export function Sidebar({ saldoDisponivel, saldoTotal }: SidebarProps) {
  const pathname = usePathname()
  const pct = saldoTotal > 0 ? Math.round((saldoDisponivel / saldoTotal) * 100) : 0

  return (
    <aside className="fixed left-0 top-0 h-screen w-[188px] flex flex-col border-r border-border/50 z-20"
      style={{ background: 'var(--sidebar)' }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border/30">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #00d4aa 0%, #00b4d8 100%)' }}>
          <Mic className="w-4 h-4 text-black" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight leading-none">TranscreveAdv</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Transcrição jurídica</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === '/resultados' && pathname.startsWith('/resultados'))
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors group',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </div>
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: saldo */}
      <div className="px-3 pb-4">
        <div className="rounded-xl p-3.5 border border-border/50" style={{ background: 'var(--surface-2)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Saldo</span>
          </div>
          <div className="flex items-baseline gap-1 mb-2.5">
            <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
              {saldoDisponivel.toFixed(0)}
            </span>
            <span className="text-xs text-muted-foreground">min restantes</span>
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full bg-border overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, pct)}%`,
                background: pct > 20
                  ? 'linear-gradient(90deg, #00d4aa 0%, #00b4d8 100%)'
                  : pct > 5
                  ? '#f59e0b'
                  : '#ef4444',
              }}
            />
          </div>

          <Link href="/dashboard"
            className="block w-full text-center text-xs font-semibold py-2 rounded-lg transition-colors"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary)')}
          >
            Comprar créditos →
          </Link>
        </div>
      </div>
    </aside>
  )
}
