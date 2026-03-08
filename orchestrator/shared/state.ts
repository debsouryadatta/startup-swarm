// Filesystem-based context hand-off between agent processes
// State lives at $HOME/state/ inside the Daytona sandbox

import * as fs   from 'fs/promises'
import * as path from 'path'

const STATE_DIR = path.join(process.env.HOME || '/home/daytona', 'state')

export async function writeState(agentName: string, data: unknown): Promise<void> {
  await fs.mkdir(STATE_DIR, { recursive: true })
  await fs.writeFile(
    path.join(STATE_DIR, `${agentName}.json`),
    JSON.stringify(data, null, 2),
    'utf-8'
  )
}

export async function readState(agentName: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(path.join(STATE_DIR, `${agentName}.json`), 'utf-8')
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function readAllState(): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {}
  try {
    const files = await fs.readdir(STATE_DIR)
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const name = file.replace('.json', '')
      const raw  = await fs.readFile(path.join(STATE_DIR, file), 'utf-8')
      result[name] = JSON.parse(raw)
    }
  } catch {}
  return result
}

// Helpers used by every agent script

export function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return (content as Array<{ type: string; text: string }>)
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
  }
  return ''
}

export function extractJSON(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return {}
  try {
    return JSON.parse(match[0]) as Record<string, unknown>
  } catch {
    return {}
  }
}
