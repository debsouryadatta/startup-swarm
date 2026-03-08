import { NextRequest, NextResponse } from 'next/server'
import { randomUUID }               from 'crypto'
import { createClient }             from '@supabase/supabase-js'
import { db }                       from '@/db'
import { paymentRequests, users }   from '@/db/schema'
import { auth }                     from '@/auth'
import { eq }                       from 'drizzle-orm'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const plan      = formData.get('plan')      as string | null
  const screenshot = formData.get('screenshot') as File | null

  if (!plan || !['builder', 'studio'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 })
  }
  if (!screenshot || screenshot.size === 0) {
    return NextResponse.json({ error: 'Payment screenshot is required.' }, { status: 400 })
  }
  if (screenshot.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Screenshot must be under 5 MB.' }, { status: 400 })
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 })

  // Upload screenshot to Supabase Storage
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const ext       = screenshot.name.split('.').pop() ?? 'jpg'
  const fileName  = `payment-${session.user.id}-${Date.now()}.${ext}`
  const buffer    = Buffer.from(await screenshot.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('payment-screenshots')
    .upload(fileName, buffer, { contentType: screenshot.type, upsert: false })

  if (uploadError) {
    console.error('[payment/submit] upload error:', uploadError)
    return NextResponse.json({ error: 'Failed to upload screenshot. Please try again.' }, { status: 500 })
  }

  const { data: urlData } = supabase.storage
    .from('payment-screenshots')
    .getPublicUrl(fileName)

  // Create the payment request row
  await db.insert(paymentRequests).values({
    id:            randomUUID(),
    userId:        session.user.id,
    plan,
    screenshotUrl: urlData.publicUrl,
    status:        'pending',
    userEmail:     user.email,
    userName:      user.name,
  })

  return NextResponse.json({ ok: true })
}
