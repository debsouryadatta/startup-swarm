import { Daytona } from '@daytonaio/sdk'

// Lazy singleton — NOT instantiated at module load time.
// This prevents Vercel's build-time page-data collection from calling `new Daytona()`
// before DAYTONA_API_KEY is available in the serverless environment.
let _instance: Daytona | null = null

function getInstance(): Daytona {
  if (!_instance) {
    // Explicitly pass config — the SDK's getEnvVar() returns undefined on Vercel
    // because it detects RUNTIME=serverless and only reads env vars for NODE/BUN.
    _instance = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      apiUrl: process.env.DAYTONA_API_URL ?? process.env.DAYTONA_SERVER_URL,
      organizationId: process.env.DAYTONA_ORGANIZATION_ID,
      target: process.env.DAYTONA_TARGET ?? 'us',
    })
  }
  return _instance
}

// Proxy keeps the same `daytona` export shape — no changes needed in callers.
export const daytona = new Proxy({} as Daytona, {
  get(_target, prop) {
    return getInstance()[prop as keyof Daytona]
  },
})
