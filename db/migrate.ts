import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const client = postgres(process.env.DATABASE_URL!, { onnotice: () => {} })
const db = drizzle(client)

async function main() {
  await migrate(db, { migrationsFolder: './db/migrations' })
  console.log('[✓] migrations applied successfully!')
  await client.end()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
