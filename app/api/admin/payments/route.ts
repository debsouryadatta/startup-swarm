import { NextResponse }     from 'next/server'
import { db }               from '@/db'
import { paymentRequests }  from '@/db/schema'
import { auth }             from '@/auth'
import { desc }             from 'drizzle-orm'

function isAdmin(email: string | null | undefined) {
  if (!email) return false
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
  return admins.includes(email.toLowerCase())
}

export async function GET() {
  const session = await auth()
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const requests = await db.select()
    .from(paymentRequests)
    .orderBy(desc(paymentRequests.createdAt))

  return NextResponse.json({ requests })
}
