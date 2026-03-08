import { NextResponse }  from 'next/server'
import { auth }          from '@/auth'
import { db }            from '@/db'
import { sessions }      from '@/db/schema'
import { eq, desc }      from 'drizzle-orm'

// GET /api/sessions — returns all sessions owned by the authenticated user
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await db.select({
    id:             sessions.id,
    status:         sessions.status,
    idea:           sessions.idea,
    llmProvider:    sessions.llmProvider,
    llmModel:       sessions.llmModel,
    selectedAgents: sessions.selectedAgents,
    downloadUrl:    sessions.downloadUrl,
    createdAt:      sessions.createdAt,
  })
    .from(sessions)
    .where(eq(sessions.userId, session.user.id))
    .orderBy(desc(sessions.createdAt))

  return NextResponse.json({ sessions: rows })
}
