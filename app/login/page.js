'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: allowed } = await supabase
      .from('allowed_users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single()

    if (!allowed) {
      setError('E-mail não autorizado. Solicite acesso à Zeronze Creative.')
      setLoading(false)
      return
    }

    if (mode === 'register') {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      setError('Conta criada! Verifique seu e-mail e faça login.')
      setMode('login')
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError('E-mail ou senha incorretos.'); setLoading(false); return }
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f0ece8' }}>

      {/* Painel esquerdo — branding */}
      <div style={{ width: '45%', background: '#011d47', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 56px', minHeight: '100vh' }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 300, color: 'white', letterSpacing: '-0.5px' }}>zeronze</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, fontWeight: 600, marginTop: 2 }}>CREATIVE</div>
        </div>
        <div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'white', lineHeight: 1.3, marginBottom: 16 }}>
            Sistema de Gestão<br />Zeronze Creative
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Planejamento estratégico, gestão de clientes e demandas em um só lugar.
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
          © 2026 Zeronze Creative
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#011d47', marginBottom: 8 }}>
              {mode === 'login' ? 'Bem-vinda de volta' : 'Criar acesso'}
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              {mode === 'login' ? 'Entre com suas credenciais para acessar.' : 'Defina sua senha de acesso ao sistema.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>E-MAIL</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="seu@email.com"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, background: 'white', outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#011d47'}
                onBlur={e => e.target.style.borderColor = '#e8e4e0'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#011d47', marginBottom: 6, letterSpacing: 0.3 }}>SENHA</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e8e4e0', borderRadius: 8, fontSize: 14, background: 'white', outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#011d47'}
                onBlur={e => e.target.style.borderColor = '#e8e4e0'}
              />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, background: error.includes('criada') ? '#eef6f0' : '#fef2f2', color: error.includes('criada') ? '#166534' : '#991b1b', border: `1px solid ${error.includes('criada') ? '#bbf7d0' : '#fecaca'}` }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '12px', background: loading ? '#94a3b8' : '#011d47', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4, letterSpacing: 0.2 }}>
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar no sistema' : 'Criar conta'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              style={{ background: 'none', border: 'none', fontSize: 13, color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}>
              {mode === 'login' ? 'Primeiro acesso? Criar senha' : 'Já tenho conta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}