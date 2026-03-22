'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
const MODELAGEM_TIPOS = {
  hero: { label: 'Hero', color: '#011d47', bg: '#eff6ff' },
  hub: { label: 'Hub', color: '#065f46', bg: '#ecfdf5' },
  help: { label: 'Help', color: '#92400e', bg: '#fffbeb' },
  misto: { label: 'Misto', color: '#6b21a8', bg: '#faf5ff' },
}
const FORMATOS_SUGERIDOS = ['Reels', 'Carrossel', 'Foto', 'Stories', 'Variável', 'Vídeo longo', 'Shorts', 'Live']

export default function ModelagemPage() {
  const [user, setUser] = useState(null)
  const [clientes, setClientes] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [redes, setRedes] = useState([])
  const [redeSelecionada, setRedeSelecionada] = useState(null)
  const [mes, setMes] = useState(new Date().getMonth())
  const [ano, setAno] = useState(new Date().getFullYear())
  const [modelagem, setModelagem] = useState(null)
  const [slots, setSlots] = useState([])
  const [formatos, setFormatos] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [modo, setModo] = useState('dias_semana')
  const [numPosts, setNumPosts] = useState(7)
  const [editandoEstrutura, setEditandoEstrutura] = useState(false)
  const [visuMode, setVisuMode] = useState('construir')
  const [todasRedes, setTodasRedes] = useState([])
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
    setRedeSelecionada(null)
    setModelagem(null)
    setSlots([])
    setVisuMode('construir')
    const { data } = await supabase.from('redes_sociais').select('*').eq('cliente_id', cliente.id).eq('ativa', true).order('criado_em')
    setRedes(data || [])
    if (data?.length > 0) await selecionarRede(data[0], cliente.id)
  }

  async function selecionarRede(rede, clienteId) {
    setRedeSelecionada(rede)
    setEditandoEstrutura(false)
    setVisuMode('construir')
    await carregarModelagem(clienteId || clienteSelecionado?.id, rede.id, mes, ano)
    const { data } = await supabase.from('cobo_formatos').select('*').eq('rede_social_id', rede.id).eq('ativo', true).order('tipo, nome')
    setFormatos(data || [])
  }

  async function carregarModelagem(clienteId, redeId, m, a) {
    const ordemDias = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
    const { data: mod } = await supabase.from('modelagem').select('*').eq('cliente_id', clienteId).eq('rede_social_id', redeId).eq('mes', m + 1).eq('ano', a).single()
    if (mod) {
      setModelagem(mod)
      setModo(mod.modo)
      const { data: slotsData } = await supabase.from('modelagem_slots').select('*, cobo_formatos(nome)').eq('modelagem_id', mod.id)
      const ordenados = mod.modo === 'dias_semana'
        ? (slotsData || []).sort((a, b) => ordemDias.indexOf(a.slot) - ordemDias.indexOf(b.slot))
        : (slotsData || []).sort((a, b) => parseInt(a.slot) - parseInt(b.slot))
      setSlots(ordenados)
      if (mod.modo === 'numero_post') setNumPosts(ordenados.length || 7)
    } else {
      setModelagem(null)
      setSlots([])
    }
  }

  async function carregarVisualizacaoPanoramica() {
    if (!clienteSelecionado) return
    const ordemDias = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
    const resultado = []
    for (const rede of redes) {
      const { data: mod } = await supabase.from('modelagem').select('*').eq('cliente_id', clienteSelecionado.id).eq('rede_social_id', rede.id).eq('mes', mes + 1).eq('ano', ano).single()
      const { data: fmts } = await supabase.from('cobo_formatos').select('*').eq('rede_social_id', rede.id).eq('ativo', true)
      if (mod) {
        const { data: slotsData } = await supabase.from('modelagem_slots').select('*, cobo_formatos(nome)').eq('modelagem_id', mod.id)
        const ordenados = mod.modo === 'dias_semana'
          ? (slotsData || []).sort((a, b) => ordemDias.indexOf(a.slot) - ordemDias.indexOf(b.slot))
          : (slotsData || []).sort((a, b) => {
              const diaA = ordemDias.indexOf(a.slot)
              const diaB = ordemDias.indexOf(b.slot)
              if (diaA !== diaB) return diaA - diaB
              return parseInt(a.slot) - parseInt(b.slot)
            })
        resultado.push({ rede, modelagem: mod, slots: ordenados, formatos: fmts || [] })
      } else {
        resultado.push({ rede, modelagem: null, slots: [], formatos: fmts || [] })
      }
    }
    setTodasRedes(resultado)
  }

  async function alternarModo(novoModo) {
    setVisuMode(novoModo)
    if (novoModo === 'visualizar') await carregarVisualizacaoPanoramica()
  }

  async function criarModelagem() {
    if (!clienteSelecionado || !redeSelecionada) return
    setSalvando(true)
    if (modelagem) {
      await supabase.from('modelagem_slots').delete().eq('modelagem_id', modelagem.id)
      await supabase.from('modelagem').delete().eq('id', modelagem.id)
    }
    const { data } = await supabase.from('modelagem').insert({
      cliente_id: clienteSelecionado.id, rede_social_id: redeSelecionada.id,
      mes: mes + 1, ano, modo
    }).select().single()
    if (data) {
      const slotNames = modo === 'dias_semana' ? DIAS_SEMANA : Array.from({ length: numPosts }, (_, i) => String(i + 1))
      for (const slot of slotNames) {
        await supabase.from('modelagem_slots').insert({ modelagem_id: data.id, slot, dia_respiro: false })
      }
      await carregarModelagem(clienteSelecionado.id, redeSelecionada.id, mes, ano)
    }
    setEditandoEstrutura(false)
    setSalvando(false)
  }

  async function atualizarSlot(slotId, campo, valor) {
    await supabase.from('modelagem_slots').update({ [campo]: valor || null }).eq('id', slotId)
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, [campo]: valor } : s))
  }

  async function toggleRespiro(slotId, atual) {
    await supabase.from('modelagem_slots').update({ dia_respiro: !atual }).eq('id', slotId)
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, dia_respiro: !atual } : s))
  }

  async function mudarMes(novoMes, novoAno) {
    setMes(novoMes)
    setAno(novoAno)
    setEditandoEstrutura(false)
    setVisuMode('construir')
    if (redeSelecionada) await carregarModelagem(clienteSelecionado.id, redeSelecionada.id, novoMes, novoAno)
  }

  const equilibrio = {
    hero: slots.filter(s => !s.dia_respiro && s.modelagem_tipo === 'hero').length,
    hub: slots.filter(s => !s.dia_respiro && s.modelagem_tipo === 'hub').length,
    help: slots.filter(s => !s.dia_respiro && s.modelagem_tipo === 'help').length,
    misto: slots.filter(s => !s.dia_respiro && s.modelagem_tipo === 'misto').length,
  }
  const totalAtivos = slots.filter(s => !s.dia_respiro).length

  if (!user) return null
  const mostraFormCriacao = !modelagem || editandoEstrutura

  function TabelaVisualizacao({ rede, mod, slotsData, fmts }) {
    if (!mod) return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#faf8f6', borderRadius: 8 }}>
        Nenhuma modelagem criada para {MESES[mes]} {ano}
      </div>
    )
    const ordemDias = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
    const slotsOrdenados = mod.modo === 'numero_post'
      ? [...slotsData].sort((a, b) => {
          const diaA = ordemDias.indexOf(a.slot)
          const diaB = ordemDias.indexOf(b.slot)
          if (diaA !== diaB) return diaA - diaB
          return parseInt(a.slot) - parseInt(b.slot)
        })
      : slotsData
    const colunas = slotsOrdenados.map((s, idx) => ({
      label: mod.modo === 'dias_semana' ? s.slot : `${idx + 1}º`,
      slot: s
    }))

    const linhas = [
      ...(mod.modo === 'numero_post' ? [{ key: 'dia', label: 'Dia', render: s => s.slot || '—', color: null }] : []),
      { key: 'conteudo', label: 'Conteúdo', render: s => s.cobo_formatos?.nome || '—', color: null },
      { key: 'modelagem', label: 'Modelagem', render: s => s.modelagem_tipo ? MODELAGEM_TIPOS[s.modelagem_tipo]?.label : '—', color: s => s.modelagem_tipo ? MODELAGEM_TIPOS[s.modelagem_tipo] : null },
      { key: 'permeabilidade', label: 'Permeabilidade', render: s => s.permeabilidade === 'aderencia' ? 'AD' : s.permeabilidade === 'profundidade' ? 'PROF' : '—', color: null },
      { key: 'formato', label: 'Formato', render: s => s.formato || '—', color: null },
      { key: 'conversao', label: 'Conversão', render: s => s.conversao || '—', color: null },
      { key: 'horario', label: 'Horário', render: s => s.horario || '—', color: null },
    ]

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', background: '#011d47', color: 'white', fontWeight: 600, textAlign: 'left', width: 120, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                Atributo
              </th>
              {colunas.map(col => (
                <th key={col.slot.id} style={{ padding: '8px 12px', background: col.slot.dia_respiro ? '#ea580c' : '#011d47', color: 'white', fontWeight: 700, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', minWidth: 110 }}>
                  {col.label}
                  {col.slot.dia_respiro && <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.8 }}>RESPIRO</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, li) => (
              <tr key={linha.key} style={{ background: li % 2 === 0 ? 'white' : '#faf8f6' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700, color: '#6b7280', fontSize: 11, letterSpacing: 0.3, background: '#f5f3f0', borderRight: '1px solid #e8e4e0', borderBottom: '1px solid #f0ece8' }}>
                  {linha.label.toUpperCase()}
                </td>
                {colunas.map(col => {
                  const tipoInfo = linha.color ? linha.color(col.slot) : null
                  return (
                    <td key={col.slot.id} style={{ padding: '8px 12px', textAlign: 'center', borderRight: '1px solid #f0ece8', borderBottom: '1px solid #f0ece8', background: col.slot.dia_respiro ? '#fff7ed' : tipoInfo ? tipoInfo.bg : 'inherit', color: tipoInfo ? tipoInfo.color : '#374151', fontWeight: tipoInfo ? 700 : 400 }}>
                      {col.slot.dia_respiro ? '—' : linha.render(col.slot)}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr style={{ background: '#f0f4ff', borderTop: '2px solid #e8e4e0' }}>
              <td style={{ padding: '8px 12px', fontWeight: 700, color: '#011d47', fontSize: 11, letterSpacing: 0.3, background: '#f5f3f0', borderRight: '1px solid #e8e4e0' }}>
                POSTS ATIVOS
              </td>
              <td colSpan={colunas.length} style={{ padding: '8px 12px', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  {Object.entries(MODELAGEM_TIPOS).map(([tipo, info]) => {
                    const count = slotsData.filter(s => !s.dia_respiro && s.modelagem_tipo === tipo).length
                    if (count === 0) return null
                    return (
                      <span key={tipo} style={{ fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 4, background: info.bg, color: info.color }}>
                        {info.label}: {count}
                      </span>
                    )
                  })}
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    · {slotsData.filter(s => s.dia_respiro).length} respiro{slotsData.filter(s => s.dia_respiro).length !== 1 ? 's' : ''}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0ece8' }}>
      <Sidebar user={user} />
      <main style={{ marginLeft: 220, flex: 1, padding: '40px 48px' }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 1, marginBottom: 6 }}>ESTRATÉGIA</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#011d47' }}>Modelagem Estratégica</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Grade de conteúdo por cliente, rede e mês.</p>
        </div>

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={mes} onChange={e => mudarMes(parseInt(e.target.value), ano)}
                  style={{ padding: '8px 12px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 13, outline: 'none', background: 'white' }}>
                  {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={ano} onChange={e => mudarMes(mes, parseInt(e.target.value))}
                  style={{ padding: '8px 12px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 13, outline: 'none', background: 'white' }}>
                  {[2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', background: 'white', border: '1.5px solid #e8e4e0', borderRadius: 10, padding: 4, gap: 4 }}>
                <button onClick={() => alternarModo('construir')}
                  style={{ padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: visuMode === 'construir' ? '#011d47' : 'transparent', color: visuMode === 'construir' ? 'white' : '#6b7280' }}>
                  ✏️ Construir
                </button>
                <button onClick={() => alternarModo('visualizar')}
                  style={{ padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: visuMode === 'visualizar' ? '#011d47' : 'transparent', color: visuMode === 'visualizar' ? 'white' : '#6b7280' }}>
                  👁 Visualizar todas
                </button>
              </div>
            </div>

            {visuMode === 'visualizar' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {todasRedes.map(({ rede, modelagem: mod, slots: slotsData, formatos: fmts }) => (
                  <div key={rede.id} style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', background: '#faf8f6', borderBottom: '1px solid #e8e4e0', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#011d47' }}>{rede.plataforma}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#eff6ff', color: '#011d47' }}>{rede.camada}</span>
                      {mod && <span style={{ fontSize: 12, color: '#6b7280' }}>{mod.modo === 'dias_semana' ? 'Dias da semana' : 'Por nº de post'} · {slotsData.length} slots</span>}
                    </div>
                    <div style={{ padding: '16px 24px' }}>
                      <TabelaVisualizacao rede={rede} mod={mod} slotsData={slotsData} fmts={fmts} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {visuMode === 'construir' && (
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ width: 220, flexShrink: 0 }}>
                  <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', padding: '16px', marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5, marginBottom: 12 }}>REDE SOCIAL</div>
                    {redes.length === 0 ? (
                      <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>Nenhuma rede no COBO</div>
                    ) : redes.map(r => (
                      <button key={r.id} onClick={() => selecionarRede(r)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid', marginBottom: 6, textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 600, borderColor: redeSelecionada?.id === r.id ? '#011d47' : '#e8e4e0', background: redeSelecionada?.id === r.id ? '#011d47' : '#faf8f6', color: redeSelecionada?.id === r.id ? 'white' : '#011d47' }}>
                        {r.plataforma}
                      </button>
                    ))}
                  </div>

                  {modelagem && !editandoEstrutura && (
                    <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', padding: '16px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5, marginBottom: 12 }}>EQUILÍBRIO</div>
                      {Object.entries(equilibrio).map(([tipo, count]) => (
                        <div key={tipo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 4, background: MODELAGEM_TIPOS[tipo].bg, color: MODELAGEM_TIPOS[tipo].color }}>
                            {MODELAGEM_TIPOS[tipo].label}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 50, height: 5, background: '#f0ece8', borderRadius: 3 }}>
                              <div style={{ width: totalAtivos > 0 ? `${(count / totalAtivos) * 100}%` : '0%', height: '100%', background: MODELAGEM_TIPOS[tipo].color, borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#011d47', width: 16, textAlign: 'right' }}>{count}</span>
                          </div>
                        </div>
                      ))}
                      <div style={{ borderTop: '1px solid #f0ece8', marginTop: 8, paddingTop: 8, fontSize: 12, color: '#6b7280' }}>
                        {totalAtivos} ativos · {slots.filter(s => s.dia_respiro).length} respiro
                      </div>
                      <button onClick={() => setEditandoEstrutura(true)}
                        style={{ width: '100%', marginTop: 12, padding: '8px', background: 'none', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#6b7280', cursor: 'pointer' }}>
                        Recriar estrutura
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  {!redeSelecionada ? (
                    <div style={{ background: 'white', borderRadius: 12, border: '1.5px dashed #e8e4e0', padding: '64px', textAlign: 'center', color: '#9ca3af' }}>
                      <div style={{ fontSize: 14 }}>Selecione uma rede social</div>
                    </div>

                  ) : mostraFormCriacao ? (
                    <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', padding: '48px', textAlign: 'center' }}>
                      <div style={{ fontSize: 32, marginBottom: 16 }}>◎</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#011d47', marginBottom: 8 }}>
                        {editandoEstrutura ? 'Recriar estrutura da grade' : `Nenhuma modelagem para ${MESES[mes]} ${ano}`}
                      </div>
                      <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>
                        {editandoEstrutura ? 'Atenção: isso vai apagar a modelagem atual.' : `Crie a modelagem do ${redeSelecionada.plataforma} para este mês.`}
                      </div>
                      <div style={{ maxWidth: 380, margin: '0 auto', marginBottom: 24 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 8, letterSpacing: 0.3 }}>ESTRUTURA DA GRADE</div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                          {['dias_semana', 'numero_post'].map(m => (
                            <button key={m} onClick={() => setModo(m)}
                              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderColor: modo === m ? '#011d47' : '#e8e4e0', background: modo === m ? '#011d47' : 'white', color: modo === m ? 'white' : '#6b7280' }}>
                              {m === 'dias_semana' ? 'Dias da semana' : 'Nº de posts'}
                            </button>
                          ))}
                        </div>
                        {modo === 'numero_post' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                            <span style={{ fontSize: 13, color: '#6b7280' }}>Quantidade de posts:</span>
                            <input type="number" value={numPosts} onChange={e => setNumPosts(parseInt(e.target.value))} min={1} max={60}
                              style={{ width: 64, padding: '8px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', textAlign: 'center', background: '#faf8f6' }} />
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        {editandoEstrutura && (
                          <button onClick={() => setEditandoEstrutura(false)}
                            style={{ padding: '10px 24px', background: 'none', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#6b7280', fontWeight: 500 }}>
                            Cancelar
                          </button>
                        )}
                        <button onClick={criarModelagem} disabled={salvando}
                          style={{ padding: '11px 32px', background: salvando ? '#94a3b8' : editandoEstrutura ? '#dc2626' : '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer' }}>
                          {salvando ? 'Criando...' : editandoEstrutura ? 'Recriar (apaga a atual)' : `Criar modelagem de ${MESES[mes]}`}
                        </button>
                      </div>
                    </div>

                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#011d47' }}>
                          {redeSelecionada.plataforma} — {MESES[mes]} {ano}
                        </div>
                        <span style={{ fontSize: 12, color: '#6b7280', background: 'white', padding: '4px 12px', borderRadius: 6, border: '1px solid #e8e4e0' }}>
                          {modelagem.modo === 'dias_semana' ? 'Dias da semana' : 'Por nº de post'}
                        </span>
                      </div>

                      {/* Cabeçalho colunas */}
                      <div style={{ display: 'grid', gridTemplateColumns: modelagem.modo === 'dias_semana' ? '100px 1fr 100px 120px 140px 90px 70px' : '70px 100px 1fr 100px 120px 140px 90px 70px', gap: 8, padding: '6px 16px', marginBottom: 4 }}>
                        {(modelagem.modo === 'numero_post'
                          ? ['Post', 'Dia', 'Conteúdo', 'Formato', 'Modelagem', 'Permeab.', 'Horário', '']
                          : ['Dia', 'Conteúdo', 'Formato', 'Modelagem', 'Permeab.', 'Horário', '']
                        ).map(h => (
                          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5 }}>{h}</div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {slots.map((slot, idx) => (
                          <div key={slot.id} style={{ background: slot.dia_respiro ? '#fff7ed' : 'white', borderRadius: 10, border: `1.5px solid ${slot.dia_respiro ? '#fed7aa' : '#e8e4e0'}`, overflow: 'hidden' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: modelagem.modo === 'dias_semana' ? '100px 1fr 100px 120px 140px 90px 70px' : '70px 100px 1fr 100px 120px 140px 90px 70px', gap: 8, padding: '12px 16px', alignItems: 'center' }}>

                              {/* Nº post */}
                              {modelagem.modo === 'numero_post' && (
                                <div style={{ fontSize: 12, fontWeight: 700, color: slot.dia_respiro ? '#ea580c' : '#011d47' }}>{idx + 1}º</div>
                              )}

                              {/* Dia */}
                              {modelagem.modo === 'dias_semana' ? (
                                <div style={{ fontSize: 13, fontWeight: 700, color: slot.dia_respiro ? '#ea580c' : '#011d47' }}>
                                  {slot.slot}
                                  {slot.dia_respiro && <div style={{ fontSize: 10, color: '#ea580c' }}>RESPIRO</div>}
                                </div>
                              ) : (
                                <select value={slot.slot || ''} onChange={e => atualizarSlot(slot.id, 'slot', e.target.value)}
                                  disabled={slot.dia_respiro}
                                  style={{ width: '100%', padding: '7px 8px', border: '1.5px solid #e8e4e0', borderRadius: 6, fontSize: 12, outline: 'none', background: slot.dia_respiro ? '#f9fafb' : '#faf8f6', color: '#011d47' }}>
                                  <option value="">Dia...</option>
                                  {DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                              )}

                              {/* Conteúdo (COBO) */}
                              <select value={slot.cobo_formato_id || ''} onChange={e => atualizarSlot(slot.id, 'cobo_formato_id', e.target.value)}
                                disabled={slot.dia_respiro}
                                style={{ width: '100%', padding: '7px 8px', border: '1.5px solid #e8e4e0', borderRadius: 6, fontSize: 12, outline: 'none', background: slot.dia_respiro ? '#f9fafb' : '#faf8f6', color: '#011d47' }}>
                                <option value="">Conteúdo...</option>
                                {formatos.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                              </select>

                              {/* Formato técnico */}
                              <div style={{ position: 'relative' }}>
                                <input
                                  list={`formatos-${slot.id}`}
                                  value={slot.formato || ''}
                                  onChange={e => atualizarSlot(slot.id, 'formato', e.target.value)}
                                  disabled={slot.dia_respiro}
                                  placeholder="Formato..."
                                  style={{ width: '100%', padding: '7px 8px', border: '1.5px solid #e8e4e0', borderRadius: 6, fontSize: 12, outline: 'none', background: slot.dia_respiro ? '#f9fafb' : '#faf8f6', color: '#011d47' }}
                                />
                                <datalist id={`formatos-${slot.id}`}>
                                  {FORMATOS_SUGERIDOS.map(f => <option key={f} value={f} />)}
                                </datalist>
                              </div>

                              {/* Modelagem */}
                              <select value={slot.modelagem_tipo || ''} onChange={e => atualizarSlot(slot.id, 'modelagem_tipo', e.target.value)}
                                disabled={slot.dia_respiro}
                                style={{ width: '100%', padding: '7px 8px', border: 'none', borderRadius: 6, fontSize: 12, outline: 'none', fontWeight: 600, background: slot.modelagem_tipo && !slot.dia_respiro ? MODELAGEM_TIPOS[slot.modelagem_tipo]?.bg : '#f3f4f6', color: slot.modelagem_tipo && !slot.dia_respiro ? MODELAGEM_TIPOS[slot.modelagem_tipo]?.color : '#9ca3af' }}>
                                <option value="">Modelagem...</option>
                                {Object.entries(MODELAGEM_TIPOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                              </select>

                              {/* Permeabilidade */}
                              <select value={slot.permeabilidade || ''} onChange={e => atualizarSlot(slot.id, 'permeabilidade', e.target.value)}
                                disabled={slot.dia_respiro}
                                style={{ width: '100%', padding: '7px 8px', border: '1.5px solid #e8e4e0', borderRadius: 6, fontSize: 12, outline: 'none', background: slot.dia_respiro ? '#f9fafb' : '#faf8f6', color: '#011d47' }}>
                                <option value="">Permeab...</option>
                                <option value="aderencia">Aderência</option>
                                <option value="profundidade">Profundidade</option>
                              </select>

                              {/* Horário */}
                              <input type="time" value={slot.horario || ''} onChange={e => atualizarSlot(slot.id, 'horario', e.target.value)}
                                disabled={slot.dia_respiro}
                                style={{ width: '100%', padding: '7px 8px', border: '1.5px solid #e8e4e0', borderRadius: 6, fontSize: 12, outline: 'none', background: slot.dia_respiro ? '#f9fafb' : '#faf8f6', color: '#011d47' }} />

                              {/* Respiro */}
                              <button onClick={() => toggleRespiro(slot.id, slot.dia_respiro)}
                                style={{ width: '100%', padding: '7px 4px', borderRadius: 6, border: '1.5px solid', fontSize: 11, cursor: 'pointer', borderColor: slot.dia_respiro ? '#fed7aa' : '#e8e4e0', background: slot.dia_respiro ? '#fff7ed' : 'white', color: slot.dia_respiro ? '#ea580c' : '#9ca3af' }}>
                                🌿
                              </button>
                            </div>

                            {!slot.dia_respiro && (
                              <div style={{ padding: '0 16px 12px' }}>
                                <input value={slot.conversao || ''} onChange={e => atualizarSlot(slot.id, 'conversao', e.target.value)}
                                  placeholder="Conversão esperada..."
                                  style={{ width: '100%', padding: '6px 10px', border: '1px solid #f0ece8', borderRadius: 6, fontSize: 12, outline: 'none', background: '#faf8f6', color: '#6b7280' }} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}