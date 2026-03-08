import { pgTable, text, serial, integer, jsonb, timestamp } from 'drizzle-orm/pg-core'
export type Plan = 'hobby' | 'builder' | 'studio'

export const PLAN_LIMITS: Record<Plan, number> = {
  hobby:   3,
  builder: 30,
  studio:  Infinity,
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:           text('id').primaryKey(),           // crypto.randomUUID()
  name:         text('name').notNull(),
  email:        text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt:    timestamp('created_at').defaultNow(),
  // Pricing / plan
  plan:         text('plan').notNull().default('hobby'),  // 'hobby' | 'builder' | 'studio'
  runsUsed:     integer('runs_used').notNull().default(0),
  runsResetAt:  timestamp('runs_reset_at'),               // null on hobby (lifetime)
})

export const sessions = pgTable('sessions', {
  id:             text('id').primaryKey(),
  sandboxId:      text('sandbox_id'),
  userId:         text('user_id').notNull(),
  status:         text('status').notNull().default('spawning'),
  // 'spawning' | 'running' | 'complete' | 'error' | 'expired'
  idea:           text('idea').notNull(),
  selectedAgents: jsonb('selected_agents').notNull().$type<string[]>(),
  llmProvider:    text('llm_provider').notNull(),
  llmModel:       text('llm_model').notNull(),
  downloadUrl:    text('download_url'),
  webhookSecret:  text('webhook_secret').notNull(),
  createdAt:      timestamp('created_at').defaultNow(),
  expiresAt:      timestamp('expires_at').notNull(),
})

// Append-only event log — the message bus between sandbox and browser
export const agentEvents = pgTable('agent_events', {
  id:          serial('id').primaryKey(),
  sessionId:   text('session_id').notNull().references(() => sessions.id),
  eventType:   text('event_type').notNull(),
  // 'phase_started' | 'phase_done' | 'agent_started' | 'agent_token'
  // 'agent_done' | 'agent_error' | 'swarm_complete' | 'download_ready'
  agentName:   text('agent_name'),
  phase:       integer('phase'),
  chunk:       text('chunk'),
  message:     text('message'),
  payload:     jsonb('payload'),
  createdAt:   timestamp('created_at').defaultNow(),
})

// Final structured output per agent
export const agentOutputs = pgTable('agent_outputs', {
  id:          serial('id').primaryKey(),
  sessionId:   text('session_id').notNull().references(() => sessions.id),
  agentName:   text('agent_name').notNull(),
  output:      jsonb('output').notNull(),
  createdAt:   timestamp('created_at').defaultNow(),
})

// UPI payment upgrade requests — admin reviews and manually applies the plan
export const paymentRequests = pgTable('payment_requests', {
  id:             text('id').primaryKey(),            // crypto.randomUUID()
  userId:         text('user_id').notNull(),
  plan:           text('plan').notNull(),             // 'builder' | 'studio'
  screenshotUrl:  text('screenshot_url').notNull(),   // Supabase Storage URL
  status:         text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  adminNote:      text('admin_note'),
  createdAt:      timestamp('created_at').defaultNow(),
  reviewedAt:     timestamp('reviewed_at'),
  // denormalized for easy admin display
  userEmail:      text('user_email').notNull(),
  userName:       text('user_name').notNull(),
})
