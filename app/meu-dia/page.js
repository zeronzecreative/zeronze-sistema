'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

const STATUS = {
  a_fazer: { label: 'A fazer', color: '#6b7280', bg: '#f3f4f6' },
  em_producao: { label: 'Em produção', color: '#92400e', bg: '#fffbeb' },
  em_revisao: { label: 'Em revisão', color: '#1d4ed8', bg: '#eff6ff' },
  aprovado: { label: 'Aprovado', color: '#065f46', bg: '#ecfdf5' },
  programado: { label: 'Programado', color: '#6b21a8', bg: '#faf5ff' },
}

export default function MeuDiaPage() {
  const [user, setUser] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [minhasDemandas, setMinhasDemandas] = useState([])
  const [todasDemandas, setTodasDemandas] = useState([])
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState('minhas')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      const { data: usr } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', session.user.email)
        .single()
      setUsuario(usr)

      if (usr) {
        const { data: minhas } = await supabase
          .from('demandas')
          .select('*, clientes(nome)')
          .eq('responsavel_id', usr.id)
          .not('status', 'eq', 'programado')
          .order('prazo', { ascending: true, nullsFirst: false })
        setMinhasDemandas(minhas || [])
      }

      const { data: todas } = await supabase
        .from('demandas')
        .select('*, clientes(nome), usuarios(nome)')
        .not('status', 'eq', 'programado')
        .order('prazo', { ascending: true, nullsFirst: false })
      setTodasDemandas(todas || [])
      setLoading(false)
    })
  }, [])

  async function atualizarStatus(id, status) {
    await supabase.from('demandas').update({ status, atualizado_em: new Date().toISOString() }).eq('id', id)
    const atualizar = (lista) => lista.map(d => d.id === id ? { ...d, status } : d)
    setMinhasDemandas(prev => atualizar(prev))
    setTodasDemandas(prev => atualizar(prev))
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  const semana = new Date(hoje)
  semana.setDate(semana.getDate() + 7)

  function classificar(demandas) {
    const atrasadas = demandas.filter(d => d.prazo && new Date(d.prazo + 'T12:00:00') < hoje)
    const deHoje = demandas.filter(d => d.prazo && new Date(d.prazo + 'T12:00:00') >= hoje && new Date(d.prazo + 'T12:00:00') < amanha)
    const daSemana = demandas.filter(d => d.prazo && new Date(d.prazo + 'T12:00:00') >= amanha && new Date(d.prazo + 'T12:00:00') <= semana)
    const semPrazo = demandas.filter(d => !d.prazo)
    return { atrasadas, deHoje, daSemana, semPrazo }
  }

  const lista = aba === 'minhas' ? minhasDemandas : todasDemandas
  const { atrasadas, deHoje, daSemana, semPrazo } = classificar(lista)

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0ece8' }}>
      <div style={{ width: 32, height: 32, border: '2.5px solid #011d47', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  function CardDemanda({ d }) {
    return (
      <div style={{ background: 'white', borderRadius: 10, padding: '16px 20px', border: '1.5px solid #e8e4e0', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#011d47', marginBottom: 4 }}>{d.tema || 'Sem título'}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{d.clientes?.nome}</span>
            {d.tipo && <span style={{ fontSize: 11, background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 4 }}>{d.tipo}</span>}
            {aba === 'todas' && d.usuarios?.nome && (
              <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 4 }}>👤 {d.usuarios.nome}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {d.prazo && (
            <span style={{ fontSize: 12, color: new Date(d.prazo + 'T12:00:00') < hoje ? '#dc2626' : '#6b7280', fontWeight: new Date(d.prazo + 'T12:00:00') < hoje ? 600 : 400 }}>
              {new Date(d.prazo + 'T12:00:00').toLocaleDateString('pt-BR')}
            </span>
          )}
          <select value={d.status} onChange={e => atualizarStatus(d.id, e.target.value)}
            style={{ padding: '5px 10px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, background: STATUS[d.status]?.bg, color: STATUS[d.status]?.color, cursor: 'pointer', outline: 'none' }}>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>
    )
  }

  function Secao({ titulo, demandas, cor }) {
    if (demandas.length === 0) return null
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: cor, letterSpacing: 0.5 }}>{titulo}</div>
          <div style={{ fontSize: 11, background: cor + '18', color: cor, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{demandas.length}</div>
        </div>
        {demandas.map(d => <CardDemanda key={d.id} d={d} />)}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0ece8' }}>
      <Sidebar user={user} />

      <main style={{ marginLeft: 220, flex: 1, padding: '40px 48px' }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 1, marginBottom: 6 }}>VISÃO DO TIME</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#011d47' }}>
            {aba === 'minhas' ? `Olá, ${usuario?.nome || 'você'} 👋` : 'Todas as demandas'}
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
            {aba === 'minhas' ? 'Suas tarefas em aberto, organizadas por prazo.' : 'Visão completa de todas as demandas do time.'}
          </p>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'white', padding: 4, borderRadius: 10, width: 'fit-content', border: '1.5px solid #e8e4e0' }}>
          {[
            { key: 'minhas', label: `Minhas tarefas (${minhasDemandas.length})` },
            { key: 'todas', label: `Todas (${todasDemandas.length})` },
          ].map(a => (
            <button key={a.key} onClick={() => setAba(a.key)}
              style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: aba === a.key ? '#011d47' : 'transparent', color: aba === a.key ? 'white' : '#6b7280', transition: 'all 0.15s' }}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {lista.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', padding: '64px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#011d47', marginBottom: 6 }}>
              {aba === 'minhas' ? 'Nenhuma tarefa atribuída a você' : 'Nenhuma demanda em aberto'}
            </div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>
              {aba === 'minhas' ? 'Quando alguém atribuir uma demanda para você, ela aparece aqui.' : 'Todas as demandas estão programadas ou não há nenhuma criada.'}
            </div>
          </div>
        ) : (
          <div>
            <Secao titulo="⚠️ ATRASADAS" demandas={atrasadas} cor="#dc2626" />
            <Secao titulo="📅 HOJE" demandas={deHoje} cor="#d97706" />
            <Secao titulo="📆 ESTA SEMANA" demandas={daSemana} cor="#2563eb" />
            <Secao titulo="SEM PRAZO DEFINIDO" demandas={semPrazo} cor="#6b7280" />
          </div>
        )}
      </main>
    </div>
  )
}