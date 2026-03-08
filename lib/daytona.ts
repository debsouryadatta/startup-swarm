import { Daytona } from '@daytonaio/sdk'

// Lazy singleton — NOT instantiated at module load time.
// This prevents Vercel's build-time page-data collection from calling `new Daytona()`
// before DAYTONA_API_KEY is available in the serverless environment.
let _instance: Daytona | null = null

function getInstance(): Daytona {
  if (!_instance) _instance = new Daytona()
  return _instance
}

// Proxy keeps the same `daytona` export shape — no changes needed in callers.
export const daytona = new Proxy({} as Daytona, {
  get(_target, prop) {
    return getInstance()[prop as keyof Daytona]
  },
})
