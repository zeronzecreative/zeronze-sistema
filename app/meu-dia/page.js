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

const MODELAGEM = {
  hero: { label: 'Hero', color: '#011d47', bg: '#eff6ff' },
  hub: { label: 'Hub', color: '#065f46', bg: '#ecfdf5' },
  help: { label: 'Help', color: '#92400e', bg: '#fffbeb' },
  misto: { label: 'Misto', color: '#6b21a8', bg: '#faf5ff' },
}

export default function MeuDiaPage() {
  const [user, setUser] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [minhasDemandas, setMinhasDemandas] = useState([])
  const [todasDemandas, setTodasDemandas] = useState([])
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState('minhas')
  const [visuMode, setVisuMode] = useState('lista')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      const { data: usr } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle()
      setUsuario(usr)

      if (usr) {
        const { data: minhas } = await supabase
          .from('demandas')
          .select('*, clientes(nome), redes_sociais(plataforma)')
          .eq('responsavel_id', usr.id)
          .not('status', 'eq', 'programado')
          .order('prazo_entrega', { ascending: true, nullsLast: true })
        setMinhasDemandas(minhas || [])
      }

      const { data: todas } = await supabase
        .from('demandas')
        .select('*, clientes(nome), usuarios(nome), redes_sociais(plataforma)')
        .not('status', 'eq', 'programado')
        .order('prazo_entrega', { ascending: true, nullsLast: true })
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
    const atrasadas = demandas.filter(d => d.prazo_entrega && new Date(d.prazo_entrega + 'T12:00:00') < hoje)
    const deHoje = demandas.filter(d => d.prazo_entrega && new Date(d.prazo_entrega + 'T12:00:00') >= hoje && new Date(d.prazo_entrega + 'T12:00:00') < amanha)
    const daSemana = demandas.filter(d => d.prazo_entrega && new Date(d.prazo_entrega + 'T12:00:00') >= amanha && new Date(d.prazo_entrega + 'T12:00:00') <= semana)
    const semPrazo = demandas.filter(d => !d.prazo_entrega)
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
    const atrasado = d.prazo_entrega && new Date(d.prazo_entrega + 'T12:00:00') < hoje
    return (
      <div style={{ background: 'white', borderRadius: 10, padding: '16px 20px', border: '1.5px solid #e8e4e0', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#011d47', marginBottom: 4 }}>{d.tema || 'Sem título'}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{d.clientes?.nome}</span>
            {d.redes_sociais?.plataforma && <span style={{ fontSize: 11, fontWeight: 600, background: '#eff6ff', color: '#011d47', padding: '2px 8px', borderRadius: 4 }}>{d.redes_sociais.plataforma}</span>}
            {d.tipo && <span style={{ fontSize: 11, background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 4 }}>{d.tipo}</span>}
            {d.modelagem && MODELAGEM[d.modelagem] && <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: MODELAGEM[d.modelagem].bg, color: MODELAGEM[d.modelagem].color }}>{MODELAGEM[d.modelagem].label}</span>}
            {aba === 'todas' && d.usuarios?.nome && (
              <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 4 }}>👤 {d.usuarios.nome}</span>
            )}
          </div>
          {d.data_publicacao && (
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
              📅 Publicação: {new Date(d.data_publicacao + 'T12:00:00').toLocaleDateString('pt-BR')}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {d.prazo_entrega && (
            <span style={{ fontSize: 12, color: atrasado ? '#dc2626' : '#6b7280', fontWeight: atrasado ? 600 : 400 }}>
              {new Date(d.prazo_entrega + 'T12:00:00').toLocaleDateString('pt-BR')}
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

  function CardKanban({ d }) {
    const atrasado = d.prazo_entrega && new Date(d.prazo_entrega + 'T12:00:00') < hoje
    return (
      <div style={{ background: 'white', borderRadius: 10, border: '1.5px solid #e8e4e0', padding: '14px', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#011d47', marginBottom: 6 }}>{d.tema || 'Sem título'}</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {d.redes_sociais?.plataforma && <span style={{ fontSize: 10, fontWeight: 600, background: '#eff6ff', color: '#011d47', padding: '2px 6px', borderRadius: 3 }}>{d.redes_sociais.plataforma}</span>}
          {d.modelagem && MODELAGEM[d.modelagem] && <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 3, background: MODELAGEM[d.modelagem].bg, color: MODELAGEM[d.modelagem].color }}>{MODELAGEM[d.modelagem].label}</span>}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{d.clientes?.nome}</div>
        {aba === 'todas' && d.usuarios?.nome && (
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>👤 {d.usuarios.nome}</div>
        )}
        {d.prazo_entrega && (
          <div style={{ fontSize: 11, fontWeight: 600, color: atrasado ? '#dc2626' : '#6b7280', marginBottom: 6 }}>
            ⏰ {new Date(d.prazo_entrega + 'T12:00:00').toLocaleDateString('pt-BR')}
          </div>
        )}
        <select value={d.status} onChange={e => atualizarStatus(d.id, e.target.value)}
          style={{ width: '100%', padding: '4px 8px', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 500, background: STATUS[d.status]?.bg, color: STATUS[d.status]?.color, cursor: 'pointer', outline: 'none' }}>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
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

        {/* Controles */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          {/* Abas minhas/todas */}
          <div style={{ display: 'flex', gap: 4, background: 'white', padding: 4, borderRadius: 10, border: '1.5px solid #e8e4e0' }}>
            {[
              { key: 'minhas', label: `Minhas tarefas (${minhasDemandas.length})` },
              { key: 'todas', label: `Todas (${todasDemandas.length})` },
            ].map(a => (
              <button key={a.key} onClick={() => setAba(a.key)}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: aba === a.key ? '#011d47' : 'transparent', color: aba === a.key ? 'white' : '#6b7280' }}>
                {a.label}
              </button>
            ))}
          </div>

          {/* Toggle lista/kanban */}
          <div style={{ display: 'flex', background: 'white', border: '1.5px solid #e8e4e0', borderRadius: 10, padding: 4, gap: 4 }}>
            <button onClick={() => setVisuMode('lista')}
              style={{ padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: visuMode === 'lista' ? '#011d47' : 'transparent', color: visuMode === 'lista' ? 'white' : '#6b7280' }}>
              ☰ Lista
            </button>
            <button onClick={() => setVisuMode('kanban')}
              style={{ padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: visuMode === 'kanban' ? '#011d47' : 'transparent', color: visuMode === 'kanban' ? 'white' : '#6b7280' }}>
              ⊞ Kanban
            </button>
          </div>
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
        ) : visuMode === 'lista' ? (
          <div>
            <Secao titulo="⚠️ ATRASADAS" demandas={atrasadas} cor="#dc2626" />
            <Secao titulo="📅 HOJE" demandas={deHoje} cor="#d97706" />
            <Secao titulo="📆 ESTA SEMANA" demandas={daSemana} cor="#2563eb" />
            <Secao titulo="SEM PRAZO DEFINIDO" demandas={semPrazo} cor="#6b7280" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, alignItems: 'start' }}>
            {Object.entries(STATUS).map(([statusKey, statusInfo]) => {
              const demandasColuna = lista.filter(d => d.status === statusKey)
              return (
                <div key={statusKey}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: statusInfo.color }}>{statusInfo.label.toUpperCase()}</span>
                    <span style={{ fontSize: 11, background: statusInfo.bg, color: statusInfo.color, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{demandasColuna.length}</span>
                  </div>
                  <div>
                    {demandasColuna.length === 0 ? (
                      <div style={{ background: 'white', borderRadius: 10, border: '1.5px dashed #e8e4e0', padding: '20px', textAlign: 'center', color: '#d1d5db', fontSize: 12 }}>
                        Vazio
                      </div>
                    ) : demandasColuna.map(d => <CardKanban key={d.id} d={d} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}