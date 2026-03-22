import './globals.css'

export const metadata = {
  title: 'Zeronze Sistema',
  description: 'Sistema Operacional Zeronze Creative',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}