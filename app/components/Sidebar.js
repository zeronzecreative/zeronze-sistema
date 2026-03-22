'use client'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'

const menu = [
  { label: 'Início', icon: '⊞', href: '/dashboard' },
  { label: 'Clientes', icon: '👥', href: '/clientes' },
  { label: 'Demandas', icon: '✓', href: '/demandas' },
  { label: 'Calendário', icon: '▦', href: '/calendario', soon: true },
  { label: 'Modelagem', icon: '◎', href: '/modelagem', soon: true },
  { label: 'Métricas', icon: '↗', href: '/metricas', soon: true },
]

export default function Sidebar({ user }) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ width: 220, minHeight: '100vh', background: '#011d47', display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50 }}>

      {/* Logo */}
      <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 20, fontWeight: 300, color: 'white', letterSpacing: '-0.5px' }}>zeronze</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 3, fontWeight: 600, marginTop: 1 }}>SISTEMA DE GESTÃO</div>
      </div>

      {/* Navegação */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {menu.map(item => {
          const active = pathname === item.href
          return (
            <button key={item.href}
              onClick={() => !item.soon && router.push(item.href)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, border: 'none', cursor: item.soon ? 'default' : 'pointer',
                background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: active ? 'white' : item.soon ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.65)',
                fontSize: 13, fontWeight: active ? 600 : 400, marginBottom: 2,
                textAlign: 'left', transition: 'all 0.15s'
              }}
              onMouseEnter={e => { if (!active && !item.soon) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.soon && <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', padding: '2px 6px', borderRadius: 4, marginLeft: 'auto', letterSpacing: 0.5 }}>BREVE</span>}
            </button>
          )
        })}
      </nav>

      {/* Usuário */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Conectado como</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
        </div>
        <button onClick={handleLogout}
          style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: 8, fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
          Sair do sistema
        </button>
      </div>
    </div>
  )
}