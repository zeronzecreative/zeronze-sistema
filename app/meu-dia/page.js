'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const DIAS_SEMANA_FULL = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({ clientes: 0, demandas: 0, pendentes: 0 })
  const [mes, setMes] = useState(new Date().getMonth())
  const [ano, setAno] = useState(new Date().getFullYear())
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [demandas, setDemandas] = useState([])
  const [clientes, setClientes] = useState([])
  const [visuCal, setVisuCal] = useState('mes') // 'mes' | 'semana'
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
      .gte('prazo_entrega', inicio)
      .lte('prazo_entrega', fim)
      .order('prazo_entrega')
    setDemandas(data || [])
  }

  async function carregarDemandasMes(m, a) {
    const inicio = `${a}-${String(m + 1).padStart(2, '0')}-01`
    const fim = `${a}-${String(m + 1).padStart(2, '0')}-${new Date(a, m + 1, 0).getDate()}`
    const { data } = await supabase
      .from('demandas')
      .select('*, clientes(nome), redes_sociais(plataforma)')
      .gte('prazo_entrega', inicio)
      .lte('prazo_entrega', fim)
      .order('prazo_entrega')
    setDemandas(data || [])
  }

  function mudarMes(novoMes, novoAno) {
    setMes(novoMes)
    setAno(novoAno)
    carregarDemandasMes(novoMes, novoAno)
  }

  // Semana atual
  function getSemanaAtual() {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const diaSemana = hoje.getDay()
    const inicio = new Date(hoje)
    inicio.setDate(hoje.getDate() - diaSemana + semanaOffset * 7)
    const dias = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicio)
      d.setDate(inicio.getDate() + i)
      dias.push(d)
    }
    return dias
  }

  const diasSemana = getSemanaAtual()

  function getDemandasDia(data) {
    const dataStr = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
    return demandas.filter(d => d.prazo_entrega === dataStr)
  }

  async function carregarDemandasSemana(offset) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const diaSemana = hoje.getDay()
    const inicio = new Date(hoje)
    inicio.setDate(hoje.getDate() - diaSemana + offset * 7)
    const fim = new Date(inicio)
    fim.setDate(inicio.getDate() + 6)
    const inicioStr = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}`
    const fimStr = `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, '0')}-${String(fim.getDate()).padStart(2, '0')}`
    const { data } = await supabase
      .from('demandas')
      .select('*, clientes(nome), redes_sociais(plataforma)')
      .gte('prazo_entrega', inicioStr)
      .lte('prazo_entrega', fimStr)
      .order('prazo_entrega')
    setDemandas(data || [])
  }

  function mudarSemana(delta) {
    const novoOffset = semanaOffset + delta
    setSemanaOffset(novoOffset)
    carregarDemandasSemana(novoOffset)
  }

  // Grid mensal
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const celulas = []
  for (let i = 0; i < primeiroDia; i++) celulas.push(null)
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d)
  while (celulas.length % 7 !== 0) celulas.push(null)

  function getDemandasDiaMes(dia) {
    if (!dia) return []
    const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return demandas.filter(d => d.prazo_entrega === dataStr)
  }

  const CORES_CLIENTE = ['#011d47', '#065f46', '#92400e', '#6b21a8', '#0369a1', '#b45309']
  function getCorCliente(clienteId) {
    const idx = clientes.findIndex(c => c.id === clienteId)
    return CORES_CLIENTE[idx % CORES_CLIENTE.length] || '#011d47'
  }

  const hoje = new Date()

  if (!user) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0ece8' }}>
      <div style={{ width: 32, height: 32, border: '2.5px solid #011d47', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // Label da semana
  const labelSemana = `${diasSemana[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} — ${diasSemana[6].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Navegação */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => visuCal === 'mes' ? mudarMes(mes === 0 ? 11 : mes - 1, mes === 0 ? ano - 1 : ano) : mudarSemana(-1)}
                  style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #e8e4e0', background: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#011d47', minWidth: 160, textAlign: 'center' }}>
                  {visuCal === 'mes' ? `${MESES[mes]} ${ano}` : labelSemana}
                </span>
                <button onClick={() => visuCal === 'mes' ? mudarMes(mes === 11 ? 0 : mes + 1, mes === 11 ? ano + 1 : ano) : mudarSemana(1)}
                  style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #e8e4e0', background: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
              </div>

              {/* Toggle mês/semana */}
              <div style={{ display: 'flex', background: 'white', border: '1.5px solid #e8e4e0', borderRadius: 8, padding: 3, gap: 3 }}>
                <button onClick={() => { setVisuCal('mes'); carregarDemandasMes(mes, ano) }}
                  style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: visuCal === 'mes' ? '#011d47' : 'transparent', color: visuCal === 'mes' ? 'white' : '#6b7280' }}>
                  Mês
                </button>
                <button onClick={() => { setVisuCal('semana'); carregarDemandasSemana(semanaOffset) }}
                  style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: visuCal === 'semana' ? '#011d47' : 'transparent', color: visuCal === 'semana' ? 'white' : '#6b7280' }}>
                  Semana
                </button>
              </div>
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

          {/* VISÃO MENSAL */}
          {visuCal === 'mes' && (
            <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1.5px solid #e8e4e0' }}>
                {DIAS_SEMANA.map(d => (
                  <div key={d} style={{ padding: '8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5 }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {celulas.map((dia, idx) => {
                  const dd = getDemandasDiaMes(dia)
                  const isHoje = dia && ano === hoje.getFullYear() && mes === hoje.getMonth() && dia === hoje.getDate()
                  return (
                    <div key={idx} style={{ minHeight: 80, borderRight: '1px solid #f0ece8', borderBottom: '1px solid #f0ece8', padding: '6px', background: !dia ? '#faf8f6' : 'white' }}>
                      {dia && (
                        <>
                          <span style={{ fontSize: 12, fontWeight: isHoje ? 700 : 400, color: isHoje ? 'white' : '#011d47', background: isHoje ? '#011d47' : 'transparent', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 3 }}>
                            {dia}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {dd.slice(0, 3).map(d => (
                              <div key={d.id} onClick={() => router.push('/demandas')}
                                style={{ padding: '2px 5px', borderRadius: 3, background: getCorCliente(d.cliente_id) + '18', borderLeft: `2px solid ${getCorCliente(d.cliente_id)}`, cursor: 'pointer', fontSize: 9, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {d.tema || d.clientes?.nome}
                              </div>
                            ))}
                            {dd.length > 3 && <div style={{ fontSize: 9, color: '#9ca3af', paddingLeft: 4 }}>+{dd.length - 3} mais</div>}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* VISÃO SEMANAL */}
          {visuCal === 'semana' && (
            <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1.5px solid #e8e4e0' }}>
                {diasSemana.map((data, i) => {
                  const isHoje = data.toDateString() === hoje.toDateString()
                  return (
                    <div key={i} style={{ padding: '10px 8px', textAlign: 'center', background: isHoje ? '#011d47' : '#faf8f6', borderRight: '1px solid #e8e4e0' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: isHoje ? 'rgba(255,255,255,0.7)' : '#6b7280', letterSpacing: 0.5 }}>{DIAS_SEMANA[data.getDay()]}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: isHoje ? 'white' : '#011d47', marginTop: 2 }}>{data.getDate()}</div>
                      <div style={{ fontSize: 10, color: isHoje ? 'rgba(255,255,255,0.6)' : '#9ca3af' }}>{data.toLocaleDateString('pt-BR', { month: 'short' })}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {diasSemana.map((data, i) => {
                  const dd = getDemandasDia(data)
                  const isHoje = data.toDateString() === hoje.toDateString()
                  return (
                    <div key={i} style={{ minHeight: 160, borderRight: '1px solid #f0ece8', padding: '8px', background: isHoje ? '#f8f9ff' : 'white' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {dd.length === 0 ? (
                          <div style={{ fontSize: 11, color: '#e8e4e0', textAlign: 'center', paddingTop: 20 }}>—</div>
                        ) : dd.map(d => (
                          <div key={d.id} onClick={() => router.push('/demandas')}
                            style={{ padding: '5px 8px', borderRadius: 5, background: getCorCliente(d.cliente_id) + '18', borderLeft: `3px solid ${getCorCliente(d.cliente_id)}`, cursor: 'pointer', fontSize: 10, color: '#374151', lineHeight: 1.4 }}>
                            <div style={{ fontWeight: 700, color: getCorCliente(d.cliente_id), fontSize: 9, marginBottom: 1 }}>{d.clientes?.nome}</div>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.tema || 'Sem título'}</div>
                            {d.redes_sociais?.plataforma && <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>{d.redes_sociais.plataforma}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}