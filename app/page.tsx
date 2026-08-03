import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LandingView } from '@/components/landing/landing-view'

export default async function RootPage() {
  // If already signed in, skip the marketing pitch and drop the user at the app.
  const { userId } = await auth()
  if (userId) redirect('/dashboard')
  return <LandingView />
}
