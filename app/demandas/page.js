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

export default function DemandasPage() {
  const [user, setUser] = useState(null)
  const [demandas, setDemandas] = useState([])
  const [clientes, setClientes] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [detalhe, setDetalhe] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({
    cliente_id: '', origem: 'avulsa', tipo: '', tema: '',
    copy: '', roteiro: '', prazo: '', status: 'a_fazer',
    modelagem: '', permeabilidade: '', conversao_esperada: '',
    link_drive: '', comentarios: '', responsavel_id: ''
  })
  const [salvando, setSalvando] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      Promise.all([carregarDemandas(), carregarClientes(), carregarUsuarios()])
    })
  }, [])

  async function carregarDemandas() {
const { data } = await supabase
      .from('demandas')
      .select('*, clientes(nome), usuarios(nome), redes_sociais(plataforma)')
      .order('criado_em', { ascending: false })
      .limit(500)
    setDemandas(data || [])
    setLoading(false)
  }

  async function carregarClientes() {
    const { data } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome')
    setClientes(data || [])
  }

  async function carregarUsuarios() {
    const { data } = await supabase.from('usuarios').select('id, nome').eq('ativo', true).order('nome')
    setUsuarios(data || [])
  }

  function abrirNova() {
    setEditando(null)
    setForm({ cliente_id: clientes[0]?.id || '', origem: 'avulsa', tipo: '', tema: '', copy: '', roteiro: '', prazo: '', status: 'a_fazer', modelagem: '', permeabilidade: '', conversao_esperada: '', link_drive: '', comentarios: '', responsavel_id: '' })
    setShowForm(true)
    setDetalhe(null)
  }

  function abrirDetalhe(d) {
    setDetalhe(d)
    setShowForm(false)
  }

  function abrirEditar(d) {
    setEditando(d.id)
    setForm({
      cliente_id: d.cliente_id, origem: d.origem, tipo: d.tipo || '', tema: d.tema || '',
      copy: d.copy || '', roteiro: d.roteiro || '', prazo: d.prazo || '', status: d.status,
      modelagem: d.modelagem || '', permeabilidade: d.permeabilidade || '',
      conversao_esperada: d.conversao_esperada || '', link_drive: d.link_drive || '',
      comentarios: d.comentarios || '', responsavel_id: d.responsavel_id || ''
    })
    setShowForm(true)
    setDetalhe(null)
  }

  async function salvar() {
    if (!form.cliente_id || !form.tema.trim()) return
    setSalvando(true)
    const dados = { ...form, atualizado_em: new Date().toISOString() }
    if (!dados.responsavel_id) dados.responsavel_id = null
    if (editando) {
      await supabase.from('demandas').update(dados).eq('id', editando)
    } else {
      await supabase.from('demandas').insert(dados)
    }
    await carregarDemandas()
    setShowForm(false)
    setSalvando(false)
  }

  async function atualizarStatus(id, status) {
    await supabase.from('demandas').update({ status, atualizado_em: new Date().toISOString() }).eq('id', id)
    await carregarDemandas()
    if (detalhe?.id === id) setDetalhe(prev => ({ ...prev, status }))
  }

  async function excluir(id) {
    if (!confirm('Excluir esta demanda?')) return
    await supabase.from('demandas').delete().eq('id', id)
    await carregarDemandas()
    setDetalhe(null)
  }

  const demandasFiltradas = demandas.filter(d => {
    if (filtroStatus !== 'todos' && d.status !== filtroStatus) return false
    if (filtroCliente !== 'todos' && d.cliente_id !== filtroCliente) return false
    return true
  })

  if (!user) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0ece8' }}>
      <Sidebar user={user} />

      <main style={{ marginLeft: 220, flex: 1, padding: '40px 48px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 1, marginBottom: 6 }}>GESTÃO</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#011d47' }}>Demandas</h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{demandas.length} demanda{demandas.length !== 1 ? 's' : ''} no total</p>
          </div>
          <button onClick={abrirNova}
            style={{ padding: '10px 20px', background: '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nova demanda
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            style={{ padding: '8px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 13, background: 'white', outline: 'none', color: '#011d47' }}>
            <option value="todos">Todos os status</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}
            style={{ padding: '8px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 13, background: 'white', outline: 'none', color: '#011d47' }}>
            <option value="todos">Todos os clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {Object.entries(STATUS).map(([k, v]) => {
            const count = demandas.filter(d => d.status === k).length
            return (
              <div key={k} onClick={() => setFiltroStatus(filtroStatus === k ? 'todos' : k)}
                style={{ padding: '8px 16px', borderRadius: 8, background: filtroStatus === k ? v.bg : 'white', border: `1.5px solid ${filtroStatus === k ? v.color + '40' : '#e8e4e0'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: v.color }}>{count}</span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{v.label}</span>
              </div>
            )
          })}
        </div>

        {demandasFiltradas.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', padding: '64px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#011d47', marginBottom: 6 }}>Nenhuma demanda encontrada</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>Crie uma nova demanda ou ajuste os filtros.</div>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 1fr', padding: '12px 24px', borderBottom: '1px solid #f0ece8', background: '#faf8f6' }}>
              {['Demanda', 'Cliente', 'Responsável', 'Status', 'Prazo', 'Ações'].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 0.5 }}>{h.toUpperCase()}</div>
              ))}
            </div>
            {demandasFiltradas.map((d, i) => (
              <div key={d.id}
                style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 1fr', padding: '16px 24px', borderBottom: i < demandasFiltradas.length - 1 ? '1px solid #f5f3f1' : 'none', alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#faf8f6'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => abrirDetalhe(d)}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#011d47' }}>{d.tema || 'Sem título'}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {d.redes_sociais?.plataforma && <span style={{ fontSize: 11, fontWeight: 600, color: '#011d47', background: '#eff6ff', padding: '2px 8px', borderRadius: 4 }}>{d.redes_sociais.plataforma}</span>}

                    {d.tipo && <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>{d.tipo}</span>}
                    {d.modelagem && MODELAGEM[d.modelagem] && (
                      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: MODELAGEM[d.modelagem].bg, color: MODELAGEM[d.modelagem].color }}>{MODELAGEM[d.modelagem].label}</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{d.clientes?.nome || '—'}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{d.usuarios?.nome || '—'}</div>
                <div onClick={e => e.stopPropagation()}>
                  <select value={d.status} onChange={e => atualizarStatus(d.id, e.target.value)}
                    style={{ padding: '4px 10px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, background: STATUS[d.status]?.bg, color: STATUS[d.status]?.color, cursor: 'pointer', outline: 'none' }}>
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div style={{ fontSize: 13, color: d.prazo && new Date(d.prazo) < new Date() ? '#dc2626' : '#6b7280' }}>
                  {d.prazo ? new Date(d.prazo + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                </div>
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => abrirEditar(d)}
                    style={{ padding: '5px 12px', background: 'none', border: '1.5px solid #e8e4e0', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#011d47', cursor: 'pointer' }}>
                    Editar
                  </button>
                  <button onClick={() => excluir(d.id)}
                    style={{ padding: '5px 10px', background: 'none', border: '1.5px solid #e8e4e0', borderRadius: 6, fontSize: 12, color: '#9ca3af', cursor: 'pointer' }}>
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {detalhe && (
        <div style={{ width: 420, minHeight: '100vh', background: 'white', borderLeft: '1.5px solid #e8e4e0', position: 'fixed', right: 0, top: 0, bottom: 0, overflowY: 'auto', zIndex: 40 }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #f0ece8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 1 }}>DETALHE DA DEMANDA</div>
            <button onClick={() => setDetalhe(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ padding: '24px 28px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#011d47', marginBottom: 6 }}>{detalhe.tema || 'Sem título'}</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 6, background: STATUS[detalhe.status]?.bg, color: STATUS[detalhe.status]?.color }}>{STATUS[detalhe.status]?.label}</span>
              {detalhe.modelagem && MODELAGEM[detalhe.modelagem] && <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 6, background: MODELAGEM[detalhe.modelagem].bg, color: MODELAGEM[detalhe.modelagem].color }}>{MODELAGEM[detalhe.modelagem].label}</span>}
            </div>
            {[
              { label: 'Cliente', value: detalhe.clientes?.nome },
              { label: 'Responsável', value: detalhe.usuarios?.nome },
              { label: 'Tipo', value: detalhe.tipo },
              { label: 'Prazo', value: detalhe.prazo ? new Date(detalhe.prazo + 'T12:00:00').toLocaleDateString('pt-BR') : null },
              { label: 'Permeabilidade', value: detalhe.permeabilidade },
              { label: 'Conversão esperada', value: detalhe.conversao_esperada },
            ].filter(f => f.value).map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 0.5, marginBottom: 3 }}>{f.label.toUpperCase()}</div>
                <div style={{ fontSize: 14, color: '#011d47' }}>{f.value}</div>
              </div>
            ))}
            {detalhe.copy && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 0.5, marginBottom: 6 }}>COPY / LEGENDA</div>
                <div style={{ fontSize: 13, color: '#374151', background: '#faf8f6', padding: '12px 14px', borderRadius: 8, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detalhe.copy}</div>
              </div>
            )}
            {detalhe.roteiro && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 0.5, marginBottom: 6 }}>ROTEIRO / BRIEFING</div>
                <div style={{ fontSize: 13, color: '#374151', background: '#faf8f6', padding: '12px 14px', borderRadius: 8, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detalhe.roteiro}</div>
              </div>
            )}
            {detalhe.link_drive && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 0.5, marginBottom: 6 }}>LINK DRIVE</div>
                <a href={detalhe.link_drive} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: '#1d4ed8', textDecoration: 'underline', wordBreak: 'break-all' }}>{detalhe.link_drive}</a>
              </div>
            )}
            {detalhe.comentarios && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 0.5, marginBottom: 6 }}>COMENTÁRIOS</div>
                <div style={{ fontSize: 13, color: '#374151', background: '#faf8f6', padding: '12px 14px', borderRadius: 8, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detalhe.comentarios}</div>
              </div>
            )}
            <div style={{ marginTop: 24 }}>
              <button onClick={() => abrirEditar(detalhe)}
                style={{ width: '100%', padding: '10px', background: '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Editar demanda
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,29,71,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(1,29,71,0.25)' }}>
            <div style={{ padding: '32px 40px 24px', borderBottom: '1px solid #f0ece8', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#011d47' }}>{editando ? 'Editar demanda' : 'Nova demanda'}</h2>
            </div>
            <div style={{ padding: '24px 40px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>CLIENTE *</label>
                  <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}>
                    <option value="">Selecione...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>ORIGEM</label>
                  <select value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}>
                    <option value="avulsa">Avulsa / Sazonal</option>
                    <option value="calendario">Calendário editorial</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>TEMA / ASSUNTO *</label>
                <input value={form.tema} onChange={e => setForm({ ...form, tema: e.target.value })}
                  placeholder="Ex: Você Sabia — mercado imobiliário em SP"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}
                  onFocus={e => e.target.style.borderColor = '#011d47'}
                  onBlur={e => e.target.style.borderColor = '#e8e4e0'} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>TIPO</label>
                  <input value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                    placeholder="Ex: Reels, Carrossel"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}
                    onFocus={e => e.target.style.borderColor = '#011d47'}
                    onBlur={e => e.target.style.borderColor = '#e8e4e0'} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>MODELAGEM</label>
                  <select value={form.modelagem} onChange={e => setForm({ ...form, modelagem: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}>
                    <option value="">—</option>
                    <option value="hero">Hero</option>
                    <option value="hub">Hub</option>
                    <option value="help">Help</option>
                    <option value="misto">Misto</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>PERMEABILIDADE</label>
                  <select value={form.permeabilidade} onChange={e => setForm({ ...form, permeabilidade: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}>
                    <option value="">—</option>
                    <option value="aderencia">Aderência</option>
                    <option value="profundidade">Profundidade</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>STATUS</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}>
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>PRAZO</label>
                  <input type="date" value={form.prazo} onChange={e => setForm({ ...form, prazo: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}
                    onFocus={e => e.target.style.borderColor = '#011d47'}
                    onBlur={e => e.target.style.borderColor = '#e8e4e0'} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>RESPONSÁVEL</label>
                  <select value={form.responsavel_id} onChange={e => setForm({ ...form, responsavel_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}>
                    <option value="">—</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>CONVERSÃO ESPERADA</label>
                <input value={form.conversao_esperada} onChange={e => setForm({ ...form, conversao_esperada: e.target.value })}
                  placeholder="Ex: Seguidores, Salvamentos, Leads"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}
                  onFocus={e => e.target.style.borderColor = '#011d47'}
                  onBlur={e => e.target.style.borderColor = '#e8e4e0'} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>COPY / LEGENDA</label>
                <textarea value={form.copy} onChange={e => setForm({ ...form, copy: e.target.value })}
                  placeholder="Texto final do post..." rows={4}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6', resize: 'vertical', lineHeight: 1.5 }}
                  onFocus={e => e.target.style.borderColor = '#011d47'}
                  onBlur={e => e.target.style.borderColor = '#e8e4e0'} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>ROTEIRO / BRIEFING</label>
                <textarea value={form.roteiro} onChange={e => setForm({ ...form, roteiro: e.target.value })}
                  placeholder="Direcionamento de gravação ou produção..." rows={4}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6', resize: 'vertical', lineHeight: 1.5 }}
                  onFocus={e => e.target.style.borderColor = '#011d47'}
                  onBlur={e => e.target.style.borderColor = '#e8e4e0'} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>LINK GOOGLE DRIVE</label>
                <input value={form.link_drive} onChange={e => setForm({ ...form, link_drive: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}
                  onFocus={e => e.target.style.borderColor = '#011d47'}
                  onBlur={e => e.target.style.borderColor = '#e8e4e0'} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>COMENTÁRIOS</label>
                <textarea value={form.comentarios} onChange={e => setForm({ ...form, comentarios: e.target.value })}
                  placeholder="Observações internas..." rows={3}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6', resize: 'vertical', lineHeight: 1.5 }}
                  onFocus={e => e.target.style.borderColor = '#011d47'}
                  onBlur={e => e.target.style.borderColor = '#e8e4e0'} />
              </div>

              <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
                <button onClick={() => setShowForm(false)}
                  style={{ flex: 1, padding: '11px', background: 'none', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#6b7280', fontWeight: 500 }}>
                  Cancelar
                </button>
                <button onClick={salvar} disabled={salvando || !form.cliente_id || !form.tema.trim()}
                  style={{ flex: 2, padding: '11px', background: salvando || !form.cliente_id || !form.tema.trim() ? '#94a3b8' : '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: salvando || !form.cliente_id || !form.tema.trim() ? 'not-allowed' : 'pointer' }}>
                  {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar demanda'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}