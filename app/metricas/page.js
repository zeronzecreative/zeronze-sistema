'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

const REDES_DISPONIVEIS = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Pinterest', 'Twitter/X']

export default function MetricasPage() {
  const [user, setUser] = useState(null)
  const [clientes, setClientes] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [redes, setRedes] = useState([])
  const [redeSelecionada, setRedeSelecionada] = useState(null)
  const [mes, setMes] = useState(new Date().getMonth())
  const [ano, setAno] = useState(new Date().getFullYear())
  const [visuMode, setVisuMode] = useState('macro') // 'macro' | 'rede'
  const [abaAtiva, setAbaAtiva] = useState('mensal') // 'mensal' | 'semanal' | 'posts' | 'crm'
  const [metricasMensal, setMetricasMensal] = useState(null)
  const [metricasSemanal, setMetricasSemanal] = useState([])
  const [metricasPosts, setMetricasPosts] = useState([])
  const [crmDados, setCrmDados] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const router = useRouter()

  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      carregarClientes()
    })
  }, [])

  async function carregarClientes() {
    const { data } = await supabase.from('clientes').select('id, nome, crm_ativo').eq('ativo', true).order('nome')
    setClientes(data || [])
    if (data?.length > 0) selecionarCliente(data[0])
  }

  async function selecionarCliente(cliente) {
    setClienteSelecionado(cliente)
    setRedeSelecionada(null)
    setVisuMode('macro')
    const { data } = await supabase.from('redes_sociais').select('*').eq('cliente_id', cliente.id).eq('ativa', true).order('criado_em')
    setRedes(data || [])
  }

  async function selecionarRede(rede) {
    setRedeSelecionada(rede)
    setVisuMode('rede')
    setAbaAtiva('mensal')
    await carregarMetricas(rede.id)
  }

  async function carregarMetricas(redeId) {
    const { data: mensal } = await supabase.from('metricas_mensal').select('*')
      .eq('cliente_id', clienteSelecionado.id).eq('rede_social_id', redeId)
      .eq('mes', mes + 1).eq('ano', ano).maybeSingle()
    setMetricasMensal(mensal)

    const { data: semanal } = await supabase.from('metricas_semanal').select('*')
      .eq('cliente_id', clienteSelecionado.id).eq('rede_social_id', redeId)
      .gte('semana_inicio', `${ano}-${String(mes + 1).padStart(2, '0')}-01`)
      .lte('semana_fim', `${ano}-${String(mes + 1).padStart(2, '0')}-${new Date(ano, mes + 1, 0).getDate()}`)
      .order('semana_inicio')
    setMetricasSemanal(semanal || [])

    const { data: posts } = await supabase.from('metricas_post').select('*, calendario(conteudo_nome, data)')
      .eq('cliente_id', clienteSelecionado.id).eq('rede_social_id', redeId)
      .gte('data', `${ano}-${String(mes + 1).padStart(2, '0')}-01`)
      .lte('data', `${ano}-${String(mes + 1).padStart(2, '0')}-${new Date(ano, mes + 1, 0).getDate()}`)
      .order('data')
    setMetricasPosts(posts || [])
  }

  async function carregarCRM() {
    const { data } = await supabase.from('crm_dados').select('*')
      .eq('cliente_id', clienteSelecionado.id)
      .eq('mes', mes + 1).eq('ano', ano).maybeSingle()
    setCrmDados(data)
  }

  if (!user) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0ece8' }}>
      <Sidebar user={user} />
      <main style={{ marginLeft: 220, flex: 1, padding: '40px 48px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 1, marginBottom: 6 }}>ANÁLISE</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#011d47' }}>Métricas</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Acompanhamento de performance por cliente e rede social.</p>
        </div>

        {/* Seletor cliente */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {clientes.map(c => (
            <button key={c.id} onClick={() => selecionarCliente(c)}
              style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderColor: clienteSelecionado?.id === c.id ? '#011d47' : '#e8e4e0', background: clienteSelecionado?.id === c.id ? '#011d47' : 'white', color: clienteSelecionado?.id === c.id ? 'white' : '#6b7280' }}>
              {c.nome}
            </button>
          ))}
        </div>

        {clienteSelecionado && (
          <>
            {/* Controles mês + modo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
                  style={{ padding: '8px 12px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 13, outline: 'none', background: 'white' }}>
                  {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={ano} onChange={e => setAno(parseInt(e.target.value))}
                  style={{ padding: '8px 12px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 13, outline: 'none', background: 'white' }}>
                  {[2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', background: 'white', border: '1.5px solid #e8e4e0', borderRadius: 10, padding: 4, gap: 4 }}>
                <button onClick={() => { setVisuMode('macro'); setRedeSelecionada(null) }}
                  style={{ padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: visuMode === 'macro' ? '#011d47' : 'transparent', color: visuMode === 'macro' ? 'white' : '#6b7280' }}>
                  📊 Visão geral
                </button>
                <button onClick={() => visuMode !== 'rede' && redes.length > 0 && selecionarRede(redes[0])}
                  style={{ padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: visuMode === 'rede' ? '#011d47' : 'transparent', color: visuMode === 'rede' ? 'white' : '#6b7280' }}>
                  📱 Por rede
                </button>
              </div>
            </div>

            {/* VISÃO MACRO */}
            {visuMode === 'macro' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                  {redes.map(r => (
                    <div key={r.id} onClick={() => selecionarRede(r)}
                      style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', padding: '20px 24px', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#011d47' }}>{r.plataforma}</div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: '#eff6ff', color: '#011d47' }}>{r.camada}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>
                        Clique para ver as métricas
                      </div>
                    </div>
                  ))}
                  {clienteSelecionado?.crm_ativo && (
                    <div onClick={() => { setVisuMode('rede'); setAbaAtiva('crm'); carregarCRM() }}
                      style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', padding: '20px 24px', cursor: 'pointer' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#011d47', marginBottom: 16 }}>CRM</div>
                      <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>
                        Clique para ver os dados
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VISÃO POR REDE */}
            {visuMode === 'rede' && (
              <div style={{ display: 'flex', gap: 20 }}>

                {/* Coluna esquerda — seletor de rede */}
                <div style={{ width: 200, flexShrink: 0 }}>
                  <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', padding: '16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5, marginBottom: 12 }}>REDE SOCIAL</div>
                    {redes.map(r => (
                      <button key={r.id} onClick={() => selecionarRede(r)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid', marginBottom: 6, textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 600, borderColor: redeSelecionada?.id === r.id ? '#011d47' : '#e8e4e0', background: redeSelecionada?.id === r.id ? '#011d47' : '#faf8f6', color: redeSelecionada?.id === r.id ? 'white' : '#011d47' }}>
                        {r.plataforma}
                      </button>
                    ))}
                    {clienteSelecionado?.crm_ativo && (
                      <button onClick={() => { setRedeSelecionada(null); setAbaAtiva('crm'); carregarCRM() }}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid', marginBottom: 6, textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 600, borderColor: abaAtiva === 'crm' && !redeSelecionada ? '#011d47' : '#e8e4e0', background: abaAtiva === 'crm' && !redeSelecionada ? '#011d47' : '#faf8f6', color: abaAtiva === 'crm' && !redeSelecionada ? 'white' : '#011d47' }}>
                        CRM
                      </button>
                    )}
                  </div>
                </div>

                {/* Área principal */}
                <div style={{ flex: 1 }}>
                  {redeSelecionada && (
                    <>
                      {/* Abas */}
                      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'white', border: '1.5px solid #e8e4e0', borderRadius: 10, padding: 4, width: 'fit-content' }}>
                        {['mensal', 'semanal', 'posts'].map(aba => (
                          <button key={aba} onClick={() => setAbaAtiva(aba)}
                            style={{ padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: abaAtiva === aba ? '#011d47' : 'transparent', color: abaAtiva === aba ? 'white' : '#6b7280', textTransform: 'capitalize' }}>
                            {aba === 'posts' ? 'Por post' : aba.charAt(0).toUpperCase() + aba.slice(1)}
                          </button>
                        ))}
                      </div>

                      {/* Conteúdo das abas */}
                      <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', padding: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#011d47' }}>
                            {redeSelecionada.plataforma} — {abaAtiva === 'mensal' ? MESES[mes] : abaAtiva === 'semanal' ? 'Semanas de ' + MESES[mes] : 'Posts de ' + MESES[mes]} {ano}
                          </div>
                          <button onClick={() => setShowForm(true)}
                            style={{ padding: '8px 16px', background: '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            + Inserir dados
                          </button>
                        </div>

                        {abaAtiva === 'mensal' && (
                          <div>
                            {!metricasMensal ? (
                              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                                <div style={{ fontSize: 14 }}>Nenhuma métrica mensal registrada para {MESES[mes]} {ano}</div>
                                <button onClick={() => setShowForm(true)} style={{ marginTop: 16, padding: '10px 24px', background: '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                  Inserir métricas
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                                {Object.entries(metricasMensal.dados || {}).map(([key, value]) => (
                                  <div key={key} style={{ background: '#faf8f6', borderRadius: 10, padding: '16px', border: '1px solid #e8e4e0' }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                                      {key.replace(/_/g, ' ')}
                                    </div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: '#011d47' }}>
                                      {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {abaAtiva === 'semanal' && (
                          <div>
                            {metricasSemanal.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
                                <div style={{ fontSize: 14 }}>Nenhuma métrica semanal registrada</div>
                                <button onClick={() => setShowForm(true)} style={{ marginTop: 16, padding: '10px 24px', background: '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                  Inserir métricas
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {metricasSemanal.map((semana, i) => (
                                  <div key={semana.id} style={{ border: '1px solid #e8e4e0', borderRadius: 10, overflow: 'hidden' }}>
                                    <div style={{ background: '#faf8f6', padding: '12px 16px', fontWeight: 600, color: '#011d47', fontSize: 13 }}>
                                      Semana {i + 1} — {new Date(semana.semana_inicio + 'T12:00:00').toLocaleDateString('pt-BR')} a {new Date(semana.semana_fim + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </div>
                                    <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                                      {Object.entries(semana.dados || {}).map(([key, value]) => (
                                        <div key={key}>
                                          <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>
                                            {key.replace(/_/g, ' ')}
                                          </div>
                                          <div style={{ fontSize: 18, fontWeight: 700, color: '#011d47' }}>
                                            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {abaAtiva === 'posts' && (
                          <div>
                            {metricasPosts.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
                                <div style={{ fontSize: 14 }}>Nenhuma métrica por post registrada</div>
                                <button onClick={() => setShowForm(true)} style={{ marginTop: 16, padding: '10px 24px', background: '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                  Inserir métricas
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {metricasPosts.map(post => (
                                  <div key={post.id} style={{ border: '1px solid #e8e4e0', borderRadius: 10, overflow: 'hidden' }}>
                                    <div style={{ background: '#faf8f6', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ fontWeight: 600, color: '#011d47', fontSize: 13 }}>
                                        {post.calendario?.conteudo_nome || 'Post sem título'}
                                      </div>
                                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                                        {post.data && new Date(post.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                                      </div>
                                    </div>
                                    <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                                      {Object.entries(post.dados || {}).map(([key, value]) => (
                                        <div key={key}>
                                          <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>
                                            {key.replace(/_/g, ' ')}
                                          </div>
                                          <div style={{ fontSize: 18, fontWeight: 700, color: '#011d47' }}>
                                            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* CRM */}
                  {abaAtiva === 'crm' && !redeSelecionada && (
                    <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', padding: '28px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#011d47' }}>CRM — {MESES[mes]} {ano}</div>
                        <button onClick={() => setShowForm(true)}
                          style={{ padding: '8px 16px', background: '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          {crmDados ? 'Editar dados' : '+ Inserir dados'}
                        </button>
                      </div>
                      {!crmDados ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                          <div style={{ fontSize: 14 }}>Nenhum dado de CRM registrado para {MESES[mes]} {ano}</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5, marginBottom: 12 }}>ORIGEM DOS LEADS</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                              {[
                                { label: 'Redes Sociais', value: crmDados.leads_redes_sociais, color: '#011d47' },
                                { label: 'WhatsApp', value: crmDados.leads_whatsapp, color: '#065f46' },
                                { label: 'Tráfego Pago', value: crmDados.leads_trafego_pago, color: '#92400e' },
                                { label: 'Outros', value: crmDados.leads_outros, color: '#6b7280' },
                              ].map(item => (
                                <div key={item.label} style={{ background: '#faf8f6', borderRadius: 10, padding: '16px', border: '1px solid #e8e4e0', textAlign: 'center' }}>
                                  <div style={{ fontSize: 28, fontWeight: 800, color: item.color }}>{item.value || 0}</div>
                                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{item.label}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                            <div style={{ background: '#faf8f6', borderRadius: 10, padding: '16px', border: '1px solid #e8e4e0', textAlign: 'center' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>TOTAL DE LEADS</div>
                              <div style={{ fontSize: 28, fontWeight: 800, color: '#011d47' }}>
                                {(crmDados.leads_redes_sociais || 0) + (crmDados.leads_whatsapp || 0) + (crmDados.leads_trafego_pago || 0) + (crmDados.leads_outros || 0)}
                              </div>
                            </div>
                            <div style={{ background: '#ecfdf5', borderRadius: 10, padding: '16px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#065f46', marginBottom: 6 }}>ATENDIDOS</div>
                              <div style={{ fontSize: 28, fontWeight: 800, color: '#065f46' }}>{crmDados.total_atendidos || 0}</div>
                            </div>
                            <div style={{ background: '#eff6ff', borderRadius: 10, padding: '16px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#011d47', marginBottom: 6 }}>NEGÓCIOS FECHADOS</div>
                              <div style={{ fontSize: 28, fontWeight: 800, color: '#011d47' }}>{crmDados.negocios_fechados || 0}</div>
                            </div>
                          </div>
                          {crmDados.observacoes && (
                            <div style={{ background: '#faf8f6', borderRadius: 8, padding: '16px', border: '1px solid #e8e4e0' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>OBSERVAÇÕES</div>
                              <div style={{ fontSize: 14, color: '#374151' }}>{crmDados.observacoes}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal inserir dados — será expandido por rede */}
      {showForm && (
        <FormMetricas
          rede={redeSelecionada}
          aba={abaAtiva}
          cliente={clienteSelecionado}
          mes={mes}
          ano={ano}
          metricasMensal={metricasMensal}
          onClose={() => setShowForm(false)}
          onSalvo={async () => {
            setShowForm(false)
            if (redeSelecionada) await carregarMetricas(redeSelecionada.id)
            else await carregarCRM()
          }}
          crmDados={crmDados}
        />
      )}
    </div>
  )
}

function FormMetricas({ rede, aba, cliente, mes, ano, metricasMensal, crmDados, onClose, onSalvo }) {
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const [dados, setDados] = useState({})
  const [semanaInicio, setSemanaInicio] = useState('')
  const [semanaFim, setSemanaFim] = useState('')
  const [calendarioId, setCalendarioId] = useState('')
  const [postsDoMes, setPostsDoMes] = useState([])
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (metricasMensal && aba === 'mensal') setDados(metricasMensal.dados || {})
    if (aba === 'crm' && crmDados) {
      setDados({
        leads_redes_sociais: crmDados.leads_redes_sociais || 0,
        leads_whatsapp: crmDados.leads_whatsapp || 0,
        leads_trafego_pago: crmDados.leads_trafego_pago || 0,
        leads_outros: crmDados.leads_outros || 0,
        total_atendidos: crmDados.total_atendidos || 0,
        negocios_fechados: crmDados.negocios_fechados || 0,
        observacoes: crmDados.observacoes || '',
      })
    }
    if (aba === 'posts' && rede) carregarPostsDoMes()
  }, [])

  async function carregarPostsDoMes() {
    const { data } = await supabase.from('calendario').select('id, conteudo_nome, data')
      .eq('cliente_id', cliente.id).eq('rede_social_id', rede.id)
      .gte('data', `${ano}-${String(mes + 1).padStart(2, '0')}-01`)
      .lte('data', `${ano}-${String(mes + 1).padStart(2, '0')}-${new Date(ano, mes + 1, 0).getDate()}`)
      .order('data')
    setPostsDoMes(data || [])
  }

  function getCampos() {
    const plataforma = rede?.plataforma
    if (aba === 'mensal') {
      if (plataforma === 'Instagram') return ['contas_alcancadas', 'visualizacoes', 'visitas_perfil', 'toques_link', 'interacoes_totais', 'interacoes_posts', 'interacoes_reels', 'interacoes_stories', 'seguidores']
      if (plataforma === 'TikTok') return ['visualizacoes_publicacao', 'visualizacoes_perfil', 'curtidas', 'comentarios', 'compartilhamentos', 'seguidores', 'recompensas_estimadas']
      if (plataforma === 'YouTube') return ['visualizacoes_total', 'tempo_exibicao_total', 'inscritos_total', 'visualizacoes_shorts', 'visualizacoes_intencionais_shorts', 'shorts_gostei', 'visualizacoes_videos', 'impressoes_videos', 'taxa_cliques_videos', 'tmv_videos']
      if (plataforma === 'LinkedIn') return ['engajamento', 'visualizacoes_perfil', 'seguidores', 'impressoes']
      if (plataforma === 'Pinterest') return ['alcance', 'engajamento', 'salvamentos']
      if (plataforma === 'Twitter/X') return ['alcance', 'engajamento', 'seguidores']
    }
    if (aba === 'semanal') {
      if (plataforma === 'Instagram') return ['contas_alcancadas', 'visualizacoes', 'visitas_perfil', 'toques_link', 'interacoes', 'seguidores']
      if (plataforma === 'TikTok') return ['visualizacoes_publicacao', 'visualizacoes_perfil', 'curtidas', 'comentarios', 'compartilhamentos', 'seguidores']
      if (plataforma === 'YouTube') return ['visualizacoes_total', 'tempo_exibicao_total', 'inscritos_total']
      if (plataforma === 'LinkedIn') return ['engajamento', 'visualizacoes_perfil', 'seguidores', 'impressoes']
      if (plataforma === 'Pinterest') return ['alcance', 'engajamento', 'salvamentos']
      if (plataforma === 'Twitter/X') return ['alcance', 'engajamento', 'seguidores']
    }
    if (aba === 'posts') {
      if (plataforma === 'Instagram') return ['contas_alcancadas', 'visualizacoes', 'perc_seguidores', 'perc_nao_seguidores', 'curtidas', 'reposts', 'salvamentos', 'compartilhamentos', 'respostas', 'visitas_perfil', 'seguidores', 'tmv']
      if (plataforma === 'TikTok') return ['visualizacoes_video', 'tmv', 'novos_seguidores', 'curtidas', 'comentarios', 'compartilhamentos', 'salvamentos']
      if (plataforma === 'YouTube') return ['visualizacoes', 'tempo_exibicao', 'impressoes', 'taxa_clique', 'comentarios', 'gostei']
    }
    return []
  }

  function formatLabel(key) {
    const labels = {
      contas_alcancadas: 'Contas Alcançadas', visualizacoes: 'Visualizações', visitas_perfil: 'Visitas ao Perfil',
      toques_link: 'Toques em Link', interacoes: 'Interações', interacoes_totais: 'Interações Totais',
      interacoes_posts: 'Interações Posts', interacoes_reels: 'Interações Reels', interacoes_stories: 'Interações Stories',
      seguidores: 'Seguidores', curtidas: 'Curtidas', comentarios: 'Comentários', compartilhamentos: 'Compartilhamentos',
      salvamentos: 'Salvamentos', reposts: 'Reposts', respostas: 'Respostas', tmv: 'TMV',
      perc_seguidores: '% Seguidores', perc_nao_seguidores: '% Não Seguidores',
      visualizacoes_publicacao: 'Visualizações de Publicação', visualizacoes_perfil: 'Visualizações de Perfil',
      recompensas_estimadas: 'Recompensas Estimadas', novos_seguidores: 'Novos Seguidores',
      visualizacoes_video: 'Visualizações de Vídeo', visualizacoes_total: 'Visualizações Total',
      tempo_exibicao_total: 'Tempo de Exibição Total', inscritos_total: 'Inscritos Total',
      visualizacoes_shorts: 'Visualizações Shorts', visualizacoes_intencionais_shorts: 'Visualizações Intencionais Shorts',
      shorts_gostei: 'Shorts Marcados com Gostei', visualizacoes_videos: 'Visualizações Vídeos',
      impressoes_videos: 'Impressões Vídeos', taxa_cliques_videos: 'Taxa de Cliques Vídeos', tmv_videos: 'TMV Vídeos',
      engajamento: 'Engajamento', impressoes: 'Impressões', alcance: 'Alcance',
      tempo_exibicao: 'Tempo de Exibição', taxa_clique: 'Taxa de Clique', gostei: 'Gostei',
    }
    return labels[key] || key.replace(/_/g, ' ')
  }

  async function salvar() {
    setSalvando(true)
    if (aba === 'crm') {
      if (crmDados) {
        await supabase.from('crm_dados').update({ ...dados }).eq('id', crmDados.id)
      } else {
        await supabase.from('crm_dados').insert({ cliente_id: cliente.id, mes: mes + 1, ano, ...dados })
      }
    } else if (aba === 'mensal') {
      if (metricasMensal) {
        await supabase.from('metricas_mensal').update({ dados }).eq('id', metricasMensal.id)
      } else {
        await supabase.from('metricas_mensal').insert({ cliente_id: cliente.id, rede_social_id: rede.id, mes: mes + 1, ano, dados })
      }
    } else if (aba === 'semanal') {
      await supabase.from('metricas_semanal').insert({ cliente_id: cliente.id, rede_social_id: rede.id, semana_inicio: semanaInicio, semana_fim: semanaFim, dados })
    } else if (aba === 'posts') {
      const postSelecionado = postsDoMes.find(p => p.id === calendarioId)
      await supabase.from('metricas_post').insert({ cliente_id: cliente.id, rede_social_id: rede.id, calendario_id: calendarioId || null, data: postSelecionado?.data || null, dados })
    }
    setSalvando(false)
    onSalvo()
  }

  const campos = getCampos()

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,29,71,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(1,29,71,0.25)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#011d47', marginBottom: 4 }}>
          {aba === 'crm' ? 'Dados de CRM' : `Métricas ${aba === 'mensal' ? 'Mensais' : aba === 'semanal' ? 'Semanais' : 'por Post'}`}
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
          {rede?.plataforma} — {MESES[mes]} {ano}
        </p>

        {aba === 'semanal' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6 }}>INÍCIO DA SEMANA</label>
              <input type="date" value={semanaInicio} onChange={e => setSemanaInicio(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6 }}>FIM DA SEMANA</label>
              <input type="date" value={semanaFim} onChange={e => setSemanaFim(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }} />
            </div>
          </div>
        )}

        {aba === 'posts' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6 }}>POST DO CALENDÁRIO</label>
            <select value={calendarioId} onChange={e => setCalendarioId(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}>
              <option value="">Selecione o post...</option>
              {postsDoMes.map(p => (
                <option key={p.id} value={p.id}>
                  {new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')} — {p.conteudo_nome || 'Sem título'}
                </option>
              ))}
            </select>
          </div>
        )}

        {aba === 'crm' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5 }}>ORIGEM DOS LEADS</div>
            {['leads_redes_sociais', 'leads_whatsapp', 'leads_trafego_pago', 'leads_outros'].map(campo => (
              <div key={campo}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6 }}>{formatLabel(campo).toUpperCase()}</label>
                <input type="number" value={dados[campo] || ''} onChange={e => setDados({ ...dados, [campo]: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }} />
              </div>
            ))}
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5, marginTop: 8 }}>RESULTADOS</div>
            {['total_atendidos', 'negocios_fechados'].map(campo => (
              <div key={campo}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6 }}>{formatLabel(campo).toUpperCase()}</label>
                <input type="number" value={dados[campo] || ''} onChange={e => setDados({ ...dados, [campo]: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6 }}>OBSERVAÇÕES</label>
              <textarea value={dados.observacoes || ''} onChange={e => setDados({ ...dados, observacoes: e.target.value })} rows={3}
                style={{ width: '100%', padding: '10px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6', resize: 'vertical' }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {campos.map(campo => (
              <div key={campo}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>
                  {formatLabel(campo).toUpperCase()}
                </label>
                <input type={campo.startsWith('perc') || campo === 'taxa_clique' || campo === 'taxa_cliques_videos' || campo === 'tmv' || campo === 'tmv_videos' ? 'text' : 'number'}
                  value={dados[campo] || ''}
                  onChange={e => setDados({ ...dados, [campo]: campo.startsWith('perc') || campo.includes('taxa') || campo.includes('tmv') ? e.target.value : parseInt(e.target.value) || 0 })}
                  placeholder={campo.startsWith('perc') ? 'Ex: 45%' : campo.includes('tmv') ? 'Ex: 0:32' : '0'}
                  style={{ width: '100%', padding: '10px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }} />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '11px', background: 'none', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#6b7280' }}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando}
            style={{ flex: 2, padding: '11px', background: salvando ? '#94a3b8' : '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer' }}>
            {salvando ? 'Salvando...' : 'Salvar métricas'}
          </button>
        </div>
      </div>
    </div>
  )
}