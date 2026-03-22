'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

export default function ClientesPage() {
  const [user, setUser] = useState(null)
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', segmento: '', tipo_contrato: 'agencia', fluxo_aprovacao: 'A', crm_ativo: false })
  const [salvando, setSalvando] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      carregarClientes()
    })
  }, [])

  async function carregarClientes() {
    const { data } = await supabase.from('clientes').select('*').order('criado_em', { ascending: false })
    setClientes(data || [])
    setLoading(false)
  }

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', segmento: '', tipo_contrato: 'agencia', fluxo_aprovacao: 'A', crm_ativo: false })
    setShowForm(true)
  }

  function abrirEditar(c) {
    setEditando(c.id)
    setForm({ nome: c.nome, segmento: c.segmento || '', tipo_contrato: c.tipo_contrato, fluxo_aprovacao: c.fluxo_aprovacao, crm_ativo: c.crm_ativo })
    setShowForm(true)
  }

  async function salvar() {
    if (!form.nome.trim()) return
    setSalvando(true)
    if (editando) {
      await supabase.from('clientes').update(form).eq('id', editando)
    } else {
      await supabase.from('clientes').insert({ ...form, objetivo_macro: 'atracao' })
    }
    await carregarClientes()
    setShowForm(false)
    setSalvando(false)
  }

  async function arquivar(id) {
    if (!confirm('Arquivar este cliente?')) return
    await supabase.from('clientes').update({ ativo: false }).eq('id', id)
    await carregarClientes()
  }

  const tipoLabel = { agencia: 'Agência', consultoria_ativa: 'Consultoria', consultoria_pos: 'Pós-consultoria', gestao_visualizacao: 'Gestão' }
  const tipoColor = { agencia: '#011d47', consultoria_ativa: '#065f46', consultoria_pos: '#92400e', gestao_visualizacao: '#6b21a8' }
  const tipoBg = { agencia: '#eff6ff', consultoria_ativa: '#ecfdf5', consultoria_pos: '#fffbeb', gestao_visualizacao: '#faf5ff' }

  if (!user) return null

  const ativos = clientes.filter(c => c.ativo)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0ece8' }}>
      <Sidebar user={user} />

      <main style={{ marginLeft: 220, flex: 1, padding: '40px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 1, marginBottom: 6 }}>GESTÃO</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#011d47' }}>Clientes</h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{ativos.length} cliente{ativos.length !== 1 ? 's' : ''} ativo{ativos.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={abrirNovo}
            style={{ padding: '10px 20px', background: '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            + Novo cliente
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total', value: ativos.length },
            { label: 'Agência', value: ativos.filter(c => c.tipo_contrato === 'agencia').length },
            { label: 'Consultoria', value: ativos.filter(c => c.tipo_contrato === 'consultoria_ativa').length },
            { label: 'Gestão', value: ativos.filter(c => c.tipo_contrato === 'gestao_visualizacao').length },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: 10, padding: '18px 22px', border: '1.5px solid #e8e4e0' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#011d47' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Lista */}
        {ativos.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', padding: '64px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#011d47', marginBottom: 6 }}>Nenhum cliente cadastrado</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>Adicione seu primeiro cliente para começar.</div>
            <button onClick={abrirNovo} style={{ padding: '10px 24px', background: '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+ Novo cliente</button>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', overflow: 'hidden' }}>
            {/* Cabeçalho tabela */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 120px', padding: '12px 24px', borderBottom: '1px solid #f0ece8', background: '#faf8f6' }}>
              {['Cliente', 'Tipo', 'Fluxo', 'CRM', 'Ações'].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 0.5 }}>{h.toUpperCase()}</div>
              ))}
            </div>
            {ativos.map((c, i) => (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 120px', padding: '16px 24px', borderBottom: i < ativos.length - 1 ? '1px solid #f5f3f1' : 'none', alignItems: 'center', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#faf8f6'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#011d47' }}>{c.nome}</div>
                  {c.segmento && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{c.segmento}</div>}
                </div>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 6, background: tipoBg[c.tipo_contrato], color: tipoColor[c.tipo_contrato] }}>
                    {tipoLabel[c.tipo_contrato]}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>Fluxo {c.fluxo_aprovacao}</div>
                <div>
                  {c.crm_ativo
                    ? <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 6, background: '#ecfdf5', color: '#065f46' }}>Ativo</span>
                    : <span style={{ fontSize: 12, color: '#d1d5db' }}>—</span>
                  }
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => abrirEditar(c)}
                    style={{ padding: '5px 12px', background: 'none', border: '1.5px solid #e8e4e0', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#011d47', cursor: 'pointer' }}>
                    Editar
                  </button>
                  <button onClick={() => arquivar(c.id)}
                    style={{ padding: '5px 12px', background: 'none', border: '1.5px solid #e8e4e0', borderRadius: 6, fontSize: 12, color: '#9ca3af', cursor: 'pointer' }}>
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,29,71,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 500, boxShadow: '0 25px 60px rgba(1,29,71,0.25)' }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#011d47' }}>{editando ? 'Editar cliente' : 'Novo cliente'}</h2>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Preencha os dados do cliente.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>NOME DO CLIENTE *</label>
                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: RE/MAX Elevare"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}
                  onFocus={e => e.target.style.borderColor = '#011d47'}
                  onBlur={e => e.target.style.borderColor = '#e8e4e0'} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>SEGMENTO</label>
                <input value={form.segmento} onChange={e => setForm({ ...form, segmento: e.target.value })}
                  placeholder="Ex: Imobiliário, Moda, Educação"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}
                  onFocus={e => e.target.style.borderColor = '#011d47'}
                  onBlur={e => e.target.style.borderColor = '#e8e4e0'} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>TIPO DE CONTRATO</label>
                  <select value={form.tipo_contrato} onChange={e => setForm({ ...form, tipo_contrato: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}>
                    <option value="agencia">Agência Boutique</option>
                    <option value="consultoria_ativa">Consultoria Ativa</option>
                    <option value="consultoria_pos">Pós-consultoria</option>
                    <option value="gestao_visualizacao">Gestão / Visualização</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>FLUXO DE APROVAÇÃO</label>
                  <select value={form.fluxo_aprovacao} onChange={e => setForm({ ...form, fluxo_aprovacao: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}>
                    <option value="A">Fluxo A — admin aprova</option>
                    <option value="B">Fluxo B — cliente aprova</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#faf8f6', borderRadius: 8, border: '1.5px solid #e8e4e0' }}>
                <input type="checkbox" id="crm" checked={form.crm_ativo} onChange={e => setForm({ ...form, crm_ativo: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: '#011d47', cursor: 'pointer' }} />
                <label htmlFor="crm" style={{ fontSize: 13, color: '#011d47', cursor: 'pointer', fontWeight: 500 }}>Ativar módulo de CRM para este cliente</label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <button onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: '11px', background: 'none', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#6b7280', fontWeight: 500 }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando || !form.nome.trim()}
                style={{ flex: 2, padding: '11px', background: salvando || !form.nome.trim() ? '#94a3b8' : '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: salvando || !form.nome.trim() ? 'not-allowed' : 'pointer' }}>
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}