'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({ clientes: 0, demandas: 0, pendentes: 0 })
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const { count: clientes } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('ativo', true)
      const { count: demandas } = await supabase.from('demandas').select('*', { count: 'exact', head: true })
      const { count: pendentes } = await supabase.from('demandas').select('*', { count: 'exact', head: true }).eq('status', 'em_revisao')
      setStats({ clientes: clientes || 0, demandas: demandas || 0, pendentes: pendentes || 0 })
    })
  }, [])

  if (!user) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0ece8' }}>
      <div style={{ width: 32, height: 32, border: '2.5px solid #011d47', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0ece8' }}>
      <Sidebar user={user} />

      <main style={{ marginLeft: 220, flex: 1, padding: '40px 48px' }}>

        {/* Cabeçalho */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 1, marginBottom: 6 }}>VISÃO GERAL</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#011d47' }}>Olá, Ana Paula 👋</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Aqui está o resumo da operação hoje.</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
          {[
            { label: 'Clientes ativos', value: stats.clientes, icon: '👥', href: '/clientes' },
            { label: 'Demandas abertas', value: stats.demandas, icon: '✓', href: '/demandas' },
            { label: 'Aguardando revisão', value: stats.pendentes, icon: '⏳', href: '/demandas' },
          ].map(s => (
            <div key={s.label} onClick={() => router.push(s.href)}
              style={{ background: 'white', borderRadius: 12, padding: '24px 28px', cursor: 'pointer', border: '1.5px solid #e8e4e0', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#011d47'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e4e0'; e.currentTarget.style.transform = 'none' }}>
              <div style={{ fontSize: 22, marginBottom: 12 }}>{s.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#011d47', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Atalhos */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 1, marginBottom: 16 }}>MÓDULOS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[
              { title: 'Clientes', desc: 'Cadastro e gestão de contas', href: '/clientes', disponivel: true },
              { title: 'Demandas', desc: 'Tarefas, briefings e entregas', href: '/demandas', disponivel: true },
              { title: 'Calendário Editorial', desc: 'Planejamento de conteúdo mensal', href: '/calendario', disponivel: false },
              { title: 'Modelagem Estratégica', desc: 'Matriz Hero, Hub e Help', href: '/modelagem', disponivel: false },
            ].map(m => (
              <div key={m.title} onClick={() => m.disponivel && router.push(m.href)}
                style={{ background: 'white', borderRadius: 12, padding: '20px 24px', cursor: m.disponivel ? 'pointer' : 'default', border: '1.5px solid #e8e4e0', opacity: m.disponivel ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (m.disponivel) { e.currentTarget.style.borderColor = '#011d47' } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e4e0' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#011d47', marginBottom: 3 }}>{m.title}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{m.desc}</div>
                </div>
                {!m.disponivel
                  ? <span style={{ fontSize: 10, background: '#f0ece8', color: '#6b7280', padding: '3px 8px', borderRadius: 4, fontWeight: 600, letterSpacing: 0.5 }}>BREVE</span>
                  : <span style={{ fontSize: 18, color: '#011d47', opacity: 0.3 }}>→</span>
                }
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}