import { NextRequest, NextResponse } from 'next/server'
import bcrypt                        from 'bcryptjs'
import { randomUUID }                from 'crypto'
import { db }                        from '@/db'
import { users }                     from '@/db/schema'
import { eq }                        from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json() as {
    name: string
    email: string
    password: string
  }

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim()),
  })
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.insert(users).values({
    id:           randomUUID(),
    name:         name.trim(),
    email:        email.toLowerCase().trim(),
    passwordHash,
  })

  return NextResponse.json({ ok: true })
}
