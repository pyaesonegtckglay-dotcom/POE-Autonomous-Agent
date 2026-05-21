import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'POE Autonomous Agent',
  description: 'Production-grade autonomous AI developer operating system',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-poe-dark">
        <Navbar />
        <main className="pt-16">
          {children}
        </main>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0D1B3E',
              color: '#e2e8f0',
              border: '1px solid #4C7DFF44',
            },
          }}
        />
      </body>
    </html>
  )
}
