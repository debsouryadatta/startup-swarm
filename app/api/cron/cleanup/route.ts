import { NextResponse }  from 'next/server'
import { db }            from '@/db'
import { sessions }      from '@/db/schema'
import { lt, and, ne }   from 'drizzle-orm'
import { daytona }       from '@/lib/daytona'

// Called by Vercel Cron once daily at 2am UTC (configured in vercel.json)
// Daytona auto-stops sandboxes after 15min idle, so this is just DB hygiene

export async function GET() {
  const expired = await db.query.sessions.findMany({
    where: (s, { lt, and, ne }) =>
      and(lt(s.expiresAt, new Date()), ne(s.status, 'complete')),
  })

  const results = await Promise.allSettled(
    expired.map(async session => {
      if (session.sandboxId) {
        try {
          const sandbox = await daytona.get(session.sandboxId)
          await sandbox.delete()
        } catch {
          // Sandbox may already be gone — that's fine
        }
      }
      await db.update(sessions)
        .set({ status: 'expired' })
        .where(lt(sessions.expiresAt, new Date()))
    })
  )

  const failed = results.filter(r => r.status === 'rejected').length
  return NextResponse.json({ cleaned: expired.length, failed })
}
