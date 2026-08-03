import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { QueryProvider } from '@/lib/query/provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Hearth — Personal finance for your household',
  description:
    'Track spending, forecast cashflow, pay off debt faster, and get straight answers from an AI assistant that knows your numbers.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={jakarta.variable} suppressHydrationWarning>
        <body suppressHydrationWarning>
          <QueryProvider>{children}</QueryProvider>
          <Toaster richColors closeButton />
        </body>
      </html>
    </ClerkProvider>
  )
}
