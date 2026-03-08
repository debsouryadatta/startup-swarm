import { NextRequest, NextResponse } from 'next/server'
import { db }                        from '@/db'
import { paymentRequests, users }    from '@/db/schema'
import { auth }                      from '@/auth'
import { eq }                        from 'drizzle-orm'
import type { Plan }                 from '@/db/schema'

function isAdmin(email: string | null | undefined) {
  if (!email) return false
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
  return admins.includes(email.toLowerCase())
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id }  = await params
  const { note } = await req.json().catch(() => ({ note: '' })) as { note?: string }

  const request = await db.query.paymentRequests.findFirst({
    where: eq(paymentRequests.id, id),
  })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (request.status !== 'pending') {
    return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })
  }

  // Upgrade the user's plan
  await db.update(users)
    .set({ plan: request.plan as Plan, runsUsed: 0, runsResetAt: new Date() })
    .where(eq(users.id, request.userId))

  // Mark request as approved
  await db.update(paymentRequests)
    .set({ status: 'approved', adminNote: note ?? null, reviewedAt: new Date() })
    .where(eq(paymentRequests.id, id))

  return NextResponse.json({ ok: true })
}
