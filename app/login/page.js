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
      setError('Este e-mail não está autorizado. Solicite acesso à Zeronze Creative.')
      setLoading(false)
      return
    }

    if (mode === 'register') {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      setError('Conta criada! Verifique seu e-mail para confirmar e então faça login.')
      setMode('login')
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError('E-mail ou senha incorretos.'); setLoading(false); return }
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1a3c34', letterSpacing: '-0.5px' }}>ZERONZE</div>
          <div style={{ fontSize: 13, color: '#c9a89a', fontWeight: 500, letterSpacing: 2, marginTop: 2 }}>SISTEMA OPERACIONAL</div>
        </div>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: 16, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3c34', marginBottom: 8 }}>
            {mode === 'login' ? 'Bem-vinda de volta' : 'Criar conta'}
          </h2>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 28 }}>
            {mode === 'login' ? 'Entre com suas credenciais para acessar o sistema.' : 'Crie sua senha de acesso.'}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1a3c34', marginBottom: 6 }}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1a3c34', marginBottom: 6 }}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#faf8f6' }}
              />
            </div>

            {error && (
              <div style={{ background: error.includes('criada') ? '#e8f0ee' : '#fdf0ee', border: `1px solid ${error.includes('criada') ? '#1a3c34' : '#c9a89a'}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: error.includes('criada') ? '#1a3c34' : '#8b4a3a', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px', background: loading ? '#ccc' : '#1a3c34', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              style={{ background: 'none', border: 'none', fontSize: 13, color: '#c9a89a', cursor: 'pointer', fontWeight: 500 }}
            >
              {mode === 'login' ? 'Primeiro acesso? Criar senha' : 'Já tenho conta — entrar'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 24 }}>
          Zeronze Creative © 2026
        </p>
      </div>
    </div>
  )
}