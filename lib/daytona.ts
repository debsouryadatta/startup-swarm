import { Daytona } from '@daytonaio/sdk'

// Singleton — instantiated once, reused across all API route invocations
// DAYTONA_API_KEY is read from env automatically by the SDK
export const daytona = new Daytona()
