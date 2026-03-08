import { redirect } from 'next/navigation'
import { auth }     from '@/auth'
import { AppSidebar } from '@/components/AppSidebar'

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/signin')

  return (
    <div className="flex h-screen overflow-hidden bg-[#fafafa]">
      <AppSidebar user={session.user} />
      {/* pt-14 = space for mobile top bar; pb-20 = space for mobile bottom tab bar */}
      <main className="flex-1 overflow-auto pt-14 pb-20 md:pt-0 md:pb-0">
        {children}
      </main>
    </div>
  )
}
