'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({ clientes: 0, demandas: 0, pendentes: 0 })
  const [mes, setMes] = useState(new Date().getMonth())
  const [ano, setAno] = useState(new Date().getFullYear())
  const [demandas, setDemandas] = useState([])
  const [clientes, setClientes] = useState([])
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const { count: clientesCount } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('ativo', true)
      const { count: demandasCount } = await supabase.from('demandas').select('*', { count: 'exact', head: true })
      const { count: pendentes } = await supabase.from('demandas').select('*', { count: 'exact', head: true }).eq('status', 'em_revisao')
      setStats({ clientes: clientesCount || 0, demandas: demandasCount || 0, pendentes: pendentes || 0 })
      const { data: clientesData } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome')
      setClientes(clientesData || [])
      await carregarDemandas(new Date().getMonth(), new Date().getFullYear())
    })
  }, [])

  async function carregarDemandas(m, a) {
    const inicio = `${a}-${String(m + 1).padStart(2, '0')}-01`
    const fim = `${a}-${String(m + 1).padStart(2, '0')}-${new Date(a, m + 1, 0).getDate()}`
    const { data } = await supabase
      .from('demandas')
      .select('*, clientes(nome), redes_sociais(plataforma)')
      .gte('data_publicacao', inicio)
      .lte('data_publicacao', fim)
      .order('data_publicacao')
    setDemandas(data || [])
  }

  function mudarMes(novoMes, novoAno) {
    setMes(novoMes)
    setAno(novoAno)
    carregarDemandas(novoMes, novoAno)
  }

  // Gera grid do calendário
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const celulas = []
  for (let i = 0; i < primeiroDia; i++) celulas.push(null)
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d)
  while (celulas.length % 7 !== 0) celulas.push(null)

  function getDemandasDia(dia) {
    if (!dia) return []
    const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return demandas.filter(d => d.data_publicacao === dataStr)
  }

  const CORES_CLIENTE = ['#011d47', '#065f46', '#92400e', '#6b21a8', '#0369a1', '#b45309']
  function getCorCliente(clienteId) {
    const idx = clientes.findIndex(c => c.id === clienteId)
    return CORES_CLIENTE[idx % CORES_CLIENTE.length] || '#011d47'
  }

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
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 1, marginBottom: 6 }}>VISÃO GERAL</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#011d47' }}>Olá, Ana Paula 👋</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Aqui está o resumo da operação hoje.</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
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

        {/* Módulos */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 1, marginBottom: 16 }}>MÓDULOS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { title: 'Clientes', desc: 'Cadastro e gestão de contas', href: '/clientes' },
              { title: 'Demandas', desc: 'Tarefas, briefings e entregas', href: '/demandas' },
              { title: 'Content Board', desc: 'Formatos de conteúdo por cliente', href: '/cobo' },
              { title: 'Modelagem', desc: 'Matriz Hero, Hub e Help', href: '/modelagem' },
              { title: 'Calendário', desc: 'Planejamento de conteúdo mensal', href: '/calendario' },
              { title: 'Métricas', desc: 'Performance e resultados', href: '/metricas' },
            ].map(m => (
              <div key={m.title} onClick={() => router.push(m.href)}
                style={{ background: 'white', borderRadius: 12, padding: '18px 22px', cursor: 'pointer', border: '1.5px solid #e8e4e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#011d47' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e4e0' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#011d47', marginBottom: 2 }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{m.desc}</div>
                </div>
                <span style={{ fontSize: 18, color: '#011d47', opacity: 0.3 }}>→</span>
              </div>
            ))}
          </div>
        </div>

        {/* Calendário geral */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 1 }}>CALENDÁRIO GERAL</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => { const d = new Date(ano, mes - 1, 1); mudarMes(d.getMonth(), d.getFullYear()) }}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #e8e4e0', background: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#011d47', minWidth: 120, textAlign: 'center' }}>{MESES[mes]} {ano}</span>
              <button onClick={() => { const d = new Date(ano, mes + 1, 1); mudarMes(d.getMonth(), d.getFullYear()) }}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #e8e4e0', background: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </div>
            {/* Legenda clientes */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {clientes.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: CORES_CLIENTE[i % CORES_CLIENTE.length] }} />
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{c.nome}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', overflow: 'hidden' }}>
            {/* Header dias */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1.5px solid #e8e4e0' }}>
              {DIAS_SEMANA.map(d => (
                <div key={d} style={{ padding: '8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5 }}>{d}</div>
              ))}
            </div>
            {/* Células */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {celulas.map((dia, idx) => {
                const demandasDia = getDemandasDia(dia)
                const hoje = new Date()
                const isHoje = dia && ano === hoje.getFullYear() && mes === hoje.getMonth() && dia === hoje.getDate()
                return (
                  <div key={idx} style={{ minHeight: 80, borderRight: '1px solid #f0ece8', borderBottom: '1px solid #f0ece8', padding: '6px', background: !dia ? '#faf8f6' : 'white' }}>
                    {dia && (
                      <>
                        <span style={{ fontSize: 12, fontWeight: isHoje ? 700 : 400, color: isHoje ? 'white' : '#011d47', background: isHoje ? '#011d47' : 'transparent', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 3 }}>
                          {dia}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {demandasDia.slice(0, 3).map(d => (
                            <div key={d.id} onClick={() => router.push('/demandas')}
                              style={{ padding: '2px 5px', borderRadius: 3, background: getCorCliente(d.cliente_id) + '18', borderLeft: `2px solid ${getCorCliente(d.cliente_id)}`, cursor: 'pointer', fontSize: 9, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {d.tema || d.clientes?.nome}
                            </div>
                          ))}
                          {demandasDia.length > 3 && (
                            <div style={{ fontSize: 9, color: '#9ca3af', paddingLeft: 4 }}>+{demandasDia.length - 3} mais</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}