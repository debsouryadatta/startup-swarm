import type { Metadata } from 'next'
import { Inter }         from 'next/font/google'
import { AuthProvider }  from '@/components/AuthProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title:       'Startup Swarm',
  description: 'Your AI founding team. Built in minutes.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
