'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA_MAP = { 'Segunda': 1, 'Terça': 2, 'Quarta': 3, 'Quinta': 4, 'Sexta': 5, 'Sábado': 6, 'Domingo': 0 }
const MODELAGEM_TIPOS = {
  hero: { label: 'Hero', color: '#011d47', bg: '#eff6ff' },
  hub: { label: 'Hub', color: '#065f46', bg: '#ecfdf5' },
  help: { label: 'Help', color: '#92400e', bg: '#fffbeb' },
  misto: { label: 'Misto', color: '#6b21a8', bg: '#faf5ff' },
}
const CORES_REDE = ['#011d47', '#065f46', '#92400e', '#6b21a8', '#0369a1', '#b45309']

export default function CalendarioPage() {
  const [user, setUser] = useState(null)
  const [clientes, setClientes] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [mes, setMes] = useState(new Date().getMonth())
  const [ano, setAno] = useState(new Date().getFullYear())
  const [itens, setItens] = useState([])
  const [redes, setRedes] = useState([])
  const [gerando, setGerando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [itemSelecionado, setItemSelecionado] = useState(null)
  const [showFormAvulso, setShowFormAvulso] = useState(false)
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  const [formAvulso, setFormAvulso] = useState({ conteudo_nome: '', assunto: '', formato: '', horario: '', rede_social_id: '', modelagem_tipo: '', conversao: '' })
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
    const { data: redesData } = await supabase.from('redes_sociais').select('*').eq('cliente_id', cliente.id).eq('ativa', true).order('criado_em')
    setRedes(redesData || [])
    await carregarCalendario(cliente.id, mes, ano)
  }

  async function carregarCalendario(clienteId, m, a) {
    const inicio = `${a}-${String(m + 1).padStart(2, '0')}-01`
    const fim = `${a}-${String(m + 1).padStart(2, '0')}-${new Date(a, m + 1, 0).getDate()}`
    const { data } = await supabase
      .from('calendario')
      .select('*, redes_sociais(plataforma)')
      .eq('cliente_id', clienteId)
      .gte('data', inicio)
      .lte('data', fim)
      .order('data, horario')
    setItens(data || [])
  }

  async function gerarCalendario() {
    if (!clienteSelecionado) return
    setGerando(true)
    const { data: modelagens } = await supabase
      .from('modelagem')
      .select('*, redes_sociais(plataforma)')
      .eq('cliente_id', clienteSelecionado.id)
      .eq('mes', mes + 1)
      .eq('ano', ano)

    if (!modelagens || modelagens.length === 0) {
      alert('Nenhuma modelagem encontrada para este mês. Crie a modelagem primeiro.')
      setGerando(false)
      return
    }

    const inicio = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
    const fim = `${ano}-${String(mes + 1).padStart(2, '0')}-${new Date(ano, mes + 1, 0).getDate()}`
   await supabase.from('calendario').delete()
      .eq('cliente_id', clienteSelecionado.id)
      .gte('data', inicio)
      .lte('data', fim)

    const diasNoMes = new Date(ano, mes + 1, 0).getDate()
    const novosItens = []

    for (const mod of modelagens) {
      const { data: slots } = await supabase
        .from('modelagem_slots')
        .select('*, cobo_formatos(nome)')
        .eq('modelagem_id', mod.id)
        .eq('dia_respiro', false)
      .not('cobo_formato_id', 'is', null)
      if (!slots || slots.length === 0) continue

      if (mod.modo === 'dias_semana') {
        for (const slot of slots) {
          const diaSemana = DIAS_SEMANA_MAP[slot.slot]
          if (diaSemana === undefined) continue
          for (let dia = 1; dia <= diasNoMes; dia++) {
            const data = new Date(ano, mes, dia)
            if (data.getDay() === diaSemana) {
              novosItens.push({
                cliente_id: clienteSelecionado.id,
                rede_social_id: mod.rede_social_id,
                data: `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
                slot_modelagem_id: slot.id,
                conteudo_nome: slot.cobo_formatos?.nome || '',
                assunto: '',
                formato: slot.formato || '',
                modelagem_tipo: slot.modelagem_tipo || '',
                permeabilidade: slot.permeabilidade || '',
                horario: slot.horario || '',
                conversao: slot.conversao || '',
                origem: 'modelagem',
              })
            }
          }
        }
      } else {
        const ordemDias = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
        const slotsOrdenados = [...slots].sort((a, b) => {
          const diaA = ordemDias.indexOf(a.slot)
          const diaB = ordemDias.indexOf(b.slot)
          if (diaA !== diaB) return diaA - diaB
          return parseInt(a.slot) - parseInt(b.slot)
        })

        const primeiroMes = new Date(ano, mes, 1)
        const semanas = []
        let diaAtual = new Date(ano, mes, 1)
        while (diaAtual.getDay() !== 1) {
          diaAtual = new Date(diaAtual.getTime() + 86400000)
          if (diaAtual.getMonth() !== mes) break
        }
        while (diaAtual.getMonth() === mes) {
          semanas.push(new Date(diaAtual))
          diaAtual = new Date(diaAtual.getTime() + 7 * 86400000)
        }
        if (primeiroMes.getDay() !== 1) {
          let inicioSemana = new Date(primeiroMes)
          while (inicioSemana.getDay() !== 1) {
            inicioSemana = new Date(inicioSemana.getTime() - 86400000)
          }
          if (!semanas.find(s => s.getTime() === inicioSemana.getTime())) {
            semanas.unshift(inicioSemana)
          }
        }

        for (const inicioSemana of semanas) {
          for (const slot of slotsOrdenados) {
            const diaSemana = DIAS_SEMANA_MAP[slot.slot]
            if (diaSemana === undefined) continue
            const dataPost = new Date(inicioSemana)
            const diffDias = (diaSemana - 1 + 7) % 7
            dataPost.setDate(inicioSemana.getDate() + diffDias)
            if (dataPost.getMonth() === mes && dataPost.getFullYear() === ano) {
              novosItens.push({
                cliente_id: clienteSelecionado.id,
                rede_social_id: mod.rede_social_id,
                data: `${dataPost.getFullYear()}-${String(dataPost.getMonth() + 1).padStart(2, '0')}-${String(dataPost.getDate()).padStart(2, '0')}`,
                slot_modelagem_id: slot.id,
                conteudo_nome: slot.cobo_formatos?.nome || '',
                assunto: '',
                formato: slot.formato || '',
                modelagem_tipo: slot.modelagem_tipo || '',
                permeabilidade: slot.permeabilidade || '',
                horario: slot.horario || '',
                conversao: slot.conversao || '',
                origem: 'modelagem',
              })
            }
          }
        }
      }
    }

    if (novosItens.length > 0) {
      const loteSize = 50
      for (let i = 0; i < novosItens.length; i += loteSize) {
        await supabase.from('calendario').insert(novosItens.slice(i, i + loteSize))
      }
    }
    await carregarCalendario(clienteSelecionado.id, mes, ano)
    setGerando(false)
  }

async function criarDemandas() {
    if (!clienteSelecionado || itens.length === 0) return
    setSalvando(true)
    let criadas = 0
    for (const item of itens) {
      // Verifica se já existe demanda para este item do calendário
      const { data: existe } = await supabase
        .from('demandas')
        .select('id')
        .eq('calendario_id', item.id)
        .maybeSingle()
      if (!existe) {
        await supabase.from('demandas').insert({
          cliente_id: clienteSelecionado.id,
          rede_social_id: item.rede_social_id || null,
          calendario_id: item.id,
          origem: 'calendario',
          tipo: item.formato || '',
          tema: item.conteudo_nome || '',
          prazo: item.data,
          status: 'a_fazer',
          modelagem: item.modelagem_tipo || '',
          permeabilidade: item.permeabilidade || '',
          conversao_esperada: item.conversao || '',
          comentarios: item.assunto || '',
        })
        criadas++
      }
    }
    alert(`${criadas} demanda${criadas !== 1 ? 's' : ''} criada${criadas !== 1 ? 's' : ''}!`)
    setSalvando(false)
  }

  async function salvarAssunto(itemId, assunto) {
    await supabase.from('calendario').update({ assunto }).eq('id', itemId)
    setItens(prev => prev.map(i => i.id === itemId ? { ...i, assunto } : i))
  }

async function salvarAvulso() {
    if (!diaSelecionado || !formAvulso.conteudo_nome.trim()) return
    setSalvando(true)
    
    // Salva no calendário
    const { data: itemCalendario } = await supabase.from('calendario').insert({
      ...formAvulso,
      cliente_id: clienteSelecionado.id,
      data: diaSelecionado,
      origem: 'avulso',
    }).select().single()

    // Cria demanda automaticamente
    if (itemCalendario) {
      await supabase.from('demandas').insert({
        cliente_id: clienteSelecionado.id,
        rede_social_id: formAvulso.rede_social_id || null,
        calendario_id: itemCalendario.id,
        origem: 'avulso',
        tipo: formAvulso.formato || '',
        tema: formAvulso.conteudo_nome,
        prazo: diaSelecionado,
        status: 'a_fazer',
        comentarios: formAvulso.assunto || '',
      })
    }

    await carregarCalendario(clienteSelecionado.id, mes, ano)
    setShowFormAvulso(false)
    setFormAvulso({ conteudo_nome: '', assunto: '', formato: '', horario: '', rede_social_id: '', modelagem_tipo: '', conversao: '' })
    setSalvando(false)
  }

  async function excluirItem(id) {
    if (!confirm('Remover este item do calendário?')) return
    await supabase.from('calendario').delete().eq('id', id)
    setItens(prev => prev.filter(i => i.id !== id))
    setItemSelecionado(null)
  }

  function mudarMes(novoMes, novoAno) {
    setMes(novoMes)
    setAno(novoAno)
    setItemSelecionado(null)
    if (clienteSelecionado) carregarCalendario(clienteSelecionado.id, novoMes, novoAno)
  }

  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const celulas = []
  for (let i = 0; i < primeiroDia; i++) celulas.push(null)
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d)
  while (celulas.length % 7 !== 0) celulas.push(null)

  function getItensDia(dia) {
    if (!dia) return []
    const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return itens.filter(i => i.data === dataStr).sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))
  }

  function getCorRede(redeId) {
    const idx = redes.findIndex(r => r.id === redeId)
    return CORES_REDE[idx % CORES_REDE.length] || '#011d47'
  }

  if (!user) return null
  const temCalendario = itens.length > 0

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0ece8' }}>
      <Sidebar user={user} />
      <main style={{ marginLeft: 220, flex: 1, padding: '40px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 1, marginBottom: 6 }}>ESTRATÉGIA</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#011d47' }}>Calendário Editorial</h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Planejamento de conteúdo por cliente e mês.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {temCalendario && (
              <button onClick={criarDemandas} disabled={salvando}
                style={{ padding: '10px 20px', background: salvando ? '#94a3b8' : '#065f46', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer' }}>
                {salvando ? 'Criando...' : '✓ Criar demandas'}
              </button>
            )}
        {!temCalendario && (
              <button onClick={gerarCalendario} disabled={gerando || !clienteSelecionado}
                style={{ padding: '10px 20px', background: gerando ? '#94a3b8' : '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: gerando ? 'not-allowed' : 'pointer' }}>
                {gerando ? 'Gerando...' : '⚡ Gerar calendário'}
              </button>
            )}
          </div>
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

        {/* Controles mês + legenda */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => { const d = new Date(ano, mes - 1, 1); mudarMes(d.getMonth(), d.getFullYear()) }}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e8e4e0', background: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#011d47', minWidth: 140, textAlign: 'center' }}>{MESES[mes]} {ano}</span>
            <button onClick={() => { const d = new Date(ano, mes + 1, 1); mudarMes(d.getMonth(), d.getFullYear()) }}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e8e4e0', background: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {redes.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: CORES_REDE[i % CORES_REDE.length] }} />
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{r.plataforma}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grid calendário */}
        <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e8e4e0', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1.5px solid #e8e4e0' }}>
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
              <div key={d} style={{ padding: '10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5, borderRight: '1px solid #f0ece8' }}>
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {celulas.map((dia, idx) => {
              const itensDia = getItensDia(dia)
              const hoje = new Date()
              const isHoje = dia && ano === hoje.getFullYear() && mes === hoje.getMonth() && dia === hoje.getDate()
              const dataStr = dia ? `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}` : null

              return (
                <div key={idx} style={{ minHeight: 110, borderRight: '1px solid #f0ece8', borderBottom: '1px solid #f0ece8', padding: '8px', background: !dia ? '#faf8f6' : 'white' }}>
                  {dia && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: isHoje ? 700 : 500, color: isHoje ? 'white' : '#011d47', background: isHoje ? '#011d47' : 'transparent', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {dia}
                        </span>
                        <button onClick={() => { setDiaSelecionado(dataStr); setShowFormAvulso(true) }}
                          style={{ width: 18, height: 18, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: '#d1d5db' }}>+</button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {itensDia.map(item => (
                          <div key={item.id} onClick={() => setItemSelecionado(item)}
                            style={{ padding: '3px 6px', borderRadius: 4, background: getCorRede(item.rede_social_id) + '18', borderLeft: `3px solid ${getCorRede(item.rede_social_id)}`, cursor: 'pointer', fontSize: 10, color: '#374151', lineHeight: 1.3 }}>
                            <div style={{ fontWeight: 600, color: getCorRede(item.rede_social_id), fontSize: 9 }}>
                              {item.redes_sociais?.plataforma}{item.horario && ` · ${item.horario}`}
                            </div>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                              {item.assunto || item.conteudo_nome || 'Sem título'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Resumo */}
        {temCalendario && (
          <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
            <div style={{ background: 'white', borderRadius: 10, border: '1.5px solid #e8e4e0', padding: '12px 20px', fontSize: 13, color: '#6b7280' }}>
              <span style={{ fontWeight: 700, color: '#011d47', fontSize: 18 }}>{itens.length}</span> posts em {MESES[mes]}
            </div>
            {redes.map((r, i) => {
              const count = itens.filter(it => it.rede_social_id === r.id).length
              return (
                <div key={r.id} style={{ background: 'white', borderRadius: 10, border: `1.5px solid ${CORES_REDE[i]}40`, padding: '12px 20px', fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: CORES_REDE[i], fontSize: 18 }}>{count}</span>
                  <span style={{ color: '#6b7280', marginLeft: 6 }}>{r.plataforma}</span>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Painel detalhe */}
      {itemSelecionado && (
        <div style={{ width: 380, minHeight: '100vh', background: 'white', borderLeft: '1.5px solid #e8e4e0', position: 'fixed', right: 0, top: 0, bottom: 0, overflowY: 'auto', zIndex: 40 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0ece8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 1 }}>DETALHE DO POST</div>
            <button onClick={() => setItemSelecionado(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: getCorRede(itemSelecionado.rede_social_id) + '18', color: getCorRede(itemSelecionado.rede_social_id) }}>
                {itemSelecionado.redes_sociais?.plataforma}
              </span>
              {itemSelecionado.modelagem_tipo && MODELAGEM_TIPOS[itemSelecionado.modelagem_tipo] && (
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: MODELAGEM_TIPOS[itemSelecionado.modelagem_tipo].bg, color: MODELAGEM_TIPOS[itemSelecionado.modelagem_tipo].color }}>
                  {MODELAGEM_TIPOS[itemSelecionado.modelagem_tipo].label}
                </span>
              )}
              {itemSelecionado.origem === 'avulso' && (
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: '#f3f4f6', color: '#6b7280' }}>Avulso</span>
              )}
            </div>

            {[
              { label: 'Data', value: new Date(itemSelecionado.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) },
              { label: 'Horário', value: itemSelecionado.horario },
              { label: 'Conteúdo', value: itemSelecionado.conteudo_nome },
              { label: 'Formato', value: itemSelecionado.formato },
              { label: 'Permeabilidade', value: itemSelecionado.permeabilidade },
              { label: 'Conversão', value: itemSelecionado.conversao },
            ].filter(f => f.value).map(f => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5, marginBottom: 3 }}>{f.label.toUpperCase()}</div>
                <div style={{ fontSize: 14, color: '#011d47' }}>{f.value}</div>
              </div>
            ))}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5, marginBottom: 6 }}>ASSUNTO / TEMA</div>
              <textarea
                value={itemSelecionado.assunto || ''}
                onChange={e => {
                  setItemSelecionado({ ...itemSelecionado, assunto: e.target.value })
                  salvarAssunto(itemSelecionado.id, e.target.value)
                }}
                placeholder="Ex: 3 dicas para comprar seu primeiro imóvel..."
                rows={4}
                style={{ width: '100%', padding: '10px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#faf8f6', resize: 'vertical', lineHeight: 1.5, color: '#011d47' }}
              />
            </div>

            <button onClick={() => excluirItem(itemSelecionado.id)}
              style={{ width: '100%', padding: '10px', background: 'none', border: '1.5px solid #fecaca', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}>
              Remover do calendário
            </button>
          </div>
        </div>
      )}

      {/* Modal avulso */}
      {showFormAvulso && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,29,71,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) setShowFormAvulso(false) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(1,29,71,0.25)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#011d47', marginBottom: 4 }}>Adicionar item avulso</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
              {diaSelecionado && new Date(diaSelecionado + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>REDE SOCIAL</label>
                <select value={formAvulso.rede_social_id} onChange={e => setFormAvulso({ ...formAvulso, rede_social_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}>
                  <option value="">Selecione...</option>
                  {redes.map(r => <option key={r.id} value={r.id}>{r.plataforma}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>CONTEÚDO / TÍTULO *</label>
                <input value={formAvulso.conteudo_nome} onChange={e => setFormAvulso({ ...formAvulso, conteudo_nome: e.target.value })}
                  placeholder="Ex: Post sazonal — Dia do Corretor"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>ASSUNTO</label>
                <input value={formAvulso.assunto} onChange={e => setFormAvulso({ ...formAvulso, assunto: e.target.value })}
                  placeholder="Tema específico do post..."
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>FORMATO</label>
                  <input value={formAvulso.formato} onChange={e => setFormAvulso({ ...formAvulso, formato: e.target.value })}
                    placeholder="Ex: Reels, Carrossel"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>HORÁRIO</label>
                  <input type="time" value={formAvulso.horario} onChange={e => setFormAvulso({ ...formAvulso, horario: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowFormAvulso(false)}
                style={{ flex: 1, padding: '11px', background: 'none', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#6b7280' }}>
                Cancelar
              </button>
              <button onClick={salvarAvulso} disabled={salvando || !formAvulso.conteudo_nome.trim()}
                style={{ flex: 2, padding: '11px', background: salvando || !formAvulso.conteudo_nome.trim() ? '#94a3b8' : '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: salvando || !formAvulso.conteudo_nome.trim() ? 'not-allowed' : 'pointer' }}>
                {salvando ? 'Salvando...' : 'Adicionar ao calendário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}