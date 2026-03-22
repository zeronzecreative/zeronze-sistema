'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

const PLATAFORMAS = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Facebook', 'Pinterest', 'Twitter/X', 'Podcast', 'Outro']
const CAMADAS = {
  primaria: { label: 'Primária', color: '#011d47', bg: '#eff6ff' },
  secundaria: { label: 'Secundária', color: '#065f46', bg: '#ecfdf5' },
  terciaria: { label: 'Terciária', color: '#92400e', bg: '#fffbeb' },
  lateral: { label: 'Lateral', color: '#6b7280', bg: '#f3f4f6' },
}

export default function CoboPage() {
  const [user, setUser] = useState(null)
  const [clientes, setClientes] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [redesComFormatos, setRedesComFormatos] = useState([])
  const [showFormRede, setShowFormRede] = useState(false)
  const [showFormFormato, setShowFormFormato] = useState(false)
  const [redeSelecionadaParaFormato, setRedeSelecionadaParaFormato] = useState(null)
  const [formRede, setFormRede] = useState({ plataforma: 'Instagram', camada: 'primaria' })
  const [formFormato, setFormFormato] = useState({ nome: '', tipo: 'sistematico', grupo_rotativo: '' })
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
    const { data } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome')
    setClientes(data || [])
    if (data?.length > 0) selecionarCliente(data[0])
  }

  async function selecionarCliente(cliente) {
    setClienteSelecionado(cliente)
    await carregarRedesComFormatos(cliente.id)
  }

  async function carregarRedesComFormatos(clienteId) {
    const { data: redes } = await supabase
      .from('redes_sociais')
      .select('*')
      .eq('cliente_id', clienteId)
      .eq('ativa', true)
      .order('criado_em')

    if (!redes || redes.length === 0) {
      setRedesComFormatos([])
      return
    }

    const redesIds = redes.map(r => r.id)
    const { data: formatos } = await supabase
      .from('cobo_formatos')
      .select('*')
      .in('rede_social_id', redesIds)
      .eq('ativo', true)
      .order('tipo, nome')

    const resultado = redes.map(r => ({
      ...r,
      formatos: formatos?.filter(f => f.rede_social_id === r.id) || []
    }))

    setRedesComFormatos(resultado)
  }

  async function salvarRede() {
    if (!clienteSelecionado) return
    setSalvando(true)
    await supabase.from('redes_sociais').insert({ ...formRede, cliente_id: clienteSelecionado.id })
    await carregarRedesComFormatos(clienteSelecionado.id)
    setShowFormRede(false)
    setSalvando(false)
  }

  async function excluirRede(id) {
    if (!confirm('Remover esta rede e todos os seus formatos?')) return
    await supabase.from('redes_sociais').update({ ativa: false }).eq('id', id)
    await carregarRedesComFormatos(clienteSelecionado.id)
  }

  async function salvarFormato() {
    if (!redeSelecionadaParaFormato || !formFormato.nome.trim()) return
    setSalvando(true)
    await supabase.from('cobo_formatos').insert({
      ...formFormato,
      rede_social_id: redeSelecionadaParaFormato.id,
      cliente_id: clienteSelecionado.id
    })
    await carregarRedesComFormatos(clienteSelecionado.id)
    setShowFormFormato(false)
    setFormFormato({ nome: '', tipo: 'sistematico', grupo_rotativo: '' })
    setSalvando(false)
  }

  async function excluirFormato(id) {
    if (!confirm('Remover este formato?')) return
    await supabase.from('cobo_formatos').update({ ativo: false }).eq('id', id)
    await carregarRedesComFormatos(clienteSelecionado.id)
  }

  if (!user) return null

  const totalFormatos = redesComFormatos.reduce((acc, r) => acc + r.formatos.length, 0)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0ece8' }}>
      <Sidebar user={user} />

      <main style={{ marginLeft: 220, flex: 1, padding: '40px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 1, marginBottom: 6 }}>ESTRATÉGIA</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#011d47' }}>Content Board</h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Visão completa dos formatos de conteúdo por cliente.</p>
          </div>
          {clienteSelecionado && (
            <button onClick={() => setShowFormRede(true)}
              style={{ padding: '10px 20px', background: '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Nova rede social
            </button>
          )}
        </div>

        {/* Seletor de cliente */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 36, flexWrap: 'wrap' }}>
          {clientes.map(c => (
            <button key={c.id} onClick={() => selecionarCliente(c)}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', borderColor: clienteSelecionado?.id === c.id ? '#011d47' : '#e8e4e0', background: clienteSelecionado?.id === c.id ? '#011d47' : 'white', color: clienteSelecionado?.id === c.id ? 'white' : '#6b7280' }}>
              {c.nome}
            </button>
          ))}
        </div>

        {/* Visão panorâmica */}
        {clienteSelecionado && (
          <div>
            {/* Resumo */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
              <div style={{ background: 'white', borderRadius: 10, padding: '14px 20px', border: '1.5px solid #e8e4e0', display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#011d47' }}>{redesComFormatos.length}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Redes ativas</div>
                </div>
                <div style={{ width: 1, background: '#e8e4e0' }} />
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#011d47' }}>{totalFormatos}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Formatos no total</div>
                </div>
                <div style={{ width: 1, background: '#e8e4e0' }} />
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#065f46' }}>{redesComFormatos.reduce((acc, r) => acc + r.formatos.filter(f => f.tipo === 'sistematico').length, 0)}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Sistemáticos</div>
                </div>
                <div style={{ width: 1, background: '#e8e4e0' }} />
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#92400e' }}>{redesComFormatos.reduce((acc, r) => acc + r.formatos.filter(f => f.tipo === 'rotativo').length, 0)}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Rotativos</div>
                </div>
              </div>
            </div>

            {redesComFormatos.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 12, border: '1.5px dashed #e8e4e0', padding: '64px 32px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📱</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#011d47', marginBottom: 6 }}>Nenhuma rede cadastrada</div>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>Adicione as redes sociais deste cliente para começar o Content Board.</div>
                <button onClick={() => setShowFormRede(true)}
                  style={{ padding: '10px 24px', background: '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  + Adicionar rede social
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {redesComFormatos.map(rede => {
                  const sistematicos = rede.formatos.filter(f => f.tipo === 'sistematico')
                  const rotativos = rede.formatos.filter(f => f.tipo === 'rotativo')
                  const grupos = Array.from(new Set(rotativos.map(f => f.grupo_rotativo || '')))

                  return (
                    <div key={rede.id} style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', overflow: 'hidden' }}>

                      {/* Header da rede */}
                      <div style={{ padding: '20px 28px', borderBottom: '1px solid #f0ece8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#faf8f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#011d47' }}>{rede.plataforma}</div>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: CAMADAS[rede.camada]?.bg, color: CAMADAS[rede.camada]?.color }}>
                            {CAMADAS[rede.camada]?.label}
                          </span>
                          <span style={{ fontSize: 12, color: '#9ca3af' }}>{rede.formatos.length} formato{rede.formatos.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => { setRedeSelecionadaParaFormato(rede); setFormFormato({ nome: '', tipo: 'sistematico', grupo_rotativo: '' }); setShowFormFormato(true) }}
                            style={{ padding: '6px 14px', background: '#011d47', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            + Formato
                          </button>
                          <button onClick={() => excluirRede(rede.id)}
                            style={{ padding: '6px 12px', background: 'none', border: '1.5px solid #e8e4e0', borderRadius: 6, fontSize: 12, color: '#9ca3af', cursor: 'pointer' }}>
                            Remover rede
                          </button>
                        </div>
                      </div>

                      <div style={{ padding: '20px 28px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                          {/* Sistemáticos */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', letterSpacing: 0.5, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                              SISTEMÁTICOS
                              <span style={{ fontSize: 11, background: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{sistematicos.length}</span>
                            </div>
                            {sistematicos.length === 0 ? (
                              <div style={{ padding: '16px', background: '#faf8f6', borderRadius: 8, textAlign: 'center', color: '#9ca3af', fontSize: 13, border: '1.5px dashed #e8e4e0' }}>
                                Nenhum
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {sistematicos.map(f => (
                                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#ecfdf5', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#011d47' }}>{f.nome}</span>
                                    <button onClick={() => excluirFormato(f.id)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Rotativos */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', letterSpacing: 0.5, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                              ROTATIVOS
                              <span style={{ fontSize: 11, background: '#fffbeb', color: '#92400e', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{rotativos.length}</span>
                            </div>
                            {rotativos.length === 0 ? (
                              <div style={{ padding: '16px', background: '#faf8f6', borderRadius: 8, textAlign: 'center', color: '#9ca3af', fontSize: 13, border: '1.5px dashed #e8e4e0' }}>
                                Nenhum
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {grupos.map(grupo => (
                                  <div key={grupo}>
                                    {grupo && (
                                      <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', letterSpacing: 0.5, marginBottom: 6 }}>
                                        GRUPO: {grupo.toUpperCase()}
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      {rotativos.filter(f => (f.grupo_rotativo || '') === grupo).map(f => (
                                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
                                          <span style={{ fontSize: 13, fontWeight: 600, color: '#011d47' }}>{f.nome}</span>
                                          <button onClick={() => excluirFormato(f.id)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal nova rede */}
      {showFormRede && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,29,71,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) setShowFormRede(false) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 440, boxShadow: '0 25px 60px rgba(1,29,71,0.25)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#011d47', marginBottom: 24 }}>Adicionar rede social</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>PLATAFORMA</label>
                <select value={formRede.plataforma} onChange={e => setFormRede({ ...formRede, plataforma: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}>
                  {PLATAFORMAS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>CAMADA</label>
                <select value={formRede.camada} onChange={e => setFormRede({ ...formRede, camada: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}>
                  {Object.entries(CAMADAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <button onClick={() => setShowFormRede(false)}
                style={{ flex: 1, padding: '11px', background: 'none', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#6b7280' }}>
                Cancelar
              </button>
              <button onClick={salvarRede} disabled={salvando}
                style={{ flex: 2, padding: '11px', background: salvando ? '#94a3b8' : '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer' }}>
                {salvando ? 'Salvando...' : 'Adicionar rede'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo formato */}
      {showFormFormato && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,29,71,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) setShowFormFormato(false) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 440, boxShadow: '0 25px 60px rgba(1,29,71,0.25)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#011d47', marginBottom: 6 }}>Novo formato</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>{redeSelecionadaParaFormato?.plataforma}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>NOME DO FORMATO *</label>
                <input value={formFormato.nome} onChange={e => setFormFormato({ ...formFormato, nome: e.target.value })}
                  placeholder="Ex: Você Sabia, Expert, Backstage"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}
                  onFocus={e => e.target.style.borderColor = '#011d47'}
                  onBlur={e => e.target.style.borderColor = '#e8e4e0'} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>TIPO</label>
                <select value={formFormato.tipo} onChange={e => setFormFormato({ ...formFormato, tipo: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}>
                  <option value="sistematico">Sistemático — sai toda semana</option>
                  <option value="rotativo">Rotativo — frequência variável</option>
                </select>
              </div>
              {formFormato.tipo === 'rotativo' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>GRUPO ROTATIVO</label>
                  <input value={formFormato.grupo_rotativo} onChange={e => setFormFormato({ ...formFormato, grupo_rotativo: e.target.value })}
                    placeholder="Ex: Carrossel"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}
                    onFocus={e => e.target.style.borderColor = '#011d47'}
                    onBlur={e => e.target.style.borderColor = '#e8e4e0'} />
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Formatos do mesmo grupo se revezam na rotação</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <button onClick={() => setShowFormFormato(false)}
                style={{ flex: 1, padding: '11px', background: 'none', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#6b7280' }}>
                Cancelar
              </button>
              <button onClick={salvarFormato} disabled={salvando || !formFormato.nome.trim()}
                style={{ flex: 2, padding: '11px', background: salvando || !formFormato.nome.trim() ? '#94a3b8' : '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: salvando || !formFormato.nome.trim() ? 'not-allowed' : 'pointer' }}>
                {salvando ? 'Salvando...' : 'Adicionar formato'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}