'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
      }
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0ece8' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #011d47', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0ece8' }}>

      {/* Header */}
      <div style={{ background: '#011d47', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 300, color: 'white', letterSpacing: '-0.5px' }}>zeronze</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, fontWeight: 600 }}>SISTEMA DE GESTÃO</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{user.email}</span>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            Sair
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 32 }}>

        {/* Boas vindas */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#011d47', marginBottom: 4 }}>Bem-vinda, Ana Paula 👋</h1>
          <p style={{ fontSize: 14, color: '#666' }}>Selecione um módulo para começar.</p>
        </div>

        {/* Cards dos módulos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {[
            { title: 'Clientes', desc: 'Cadastro e gestão de clientes', icon: '👥', href: '/clientes', disponivel: true },
            { title: 'Demandas', desc: 'Gestão de tarefas e projetos', icon: '📋', href: '/demandas', disponivel: true },
            { title: 'Calendário Editorial', desc: 'Planejamento de conteúdo', icon: '📅', href: '/calendario', disponivel: false },
            { title: 'Modelagem Estratégica', desc: 'Matriz de conteúdo', icon: '🎯', href: '/modelagem', disponivel: false },
            { title: 'Métricas', desc: 'Dashboard de performance', icon: '📊', href: '/metricas', disponivel: false },
            { title: 'Configurações', desc: 'Usuários e acessos', icon: '⚙️', href: '/configuracoes', disponivel: false },
          ].map((modulo) => (
            <div
              key={modulo.title}
              onClick={() => modulo.disponivel && router.push(modulo.href)}
              style={{
                background: 'white',
                borderRadius: 12,
                padding: 24,
                cursor: modulo.disponivel ? 'pointer' : 'default',
                opacity: modulo.disponivel ? 1 : 0.5,
                boxShadow: '0 2px 12px rgba(1,29,71,0.06)',
                border: '1.5px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (modulo.disponivel) e.currentTarget.style.borderColor = '#011d47' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent' }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{modulo.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#011d47', marginBottom: 4 }}>{modulo.title}</div>
              <div style={{ fontSize: 13, color: '#666' }}>{modulo.desc}</div>
              {!modulo.disponivel && <div style={{ fontSize: 11, color: '#aaa', marginTop: 8, fontWeight: 600, letterSpacing: 1 }}>EM BREVE</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}