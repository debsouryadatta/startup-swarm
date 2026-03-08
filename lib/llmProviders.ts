// Provider IDs must match what @mariozechner/pi-ai's getModel() accepts exactly

export type ProviderId = 'openai' | 'anthropic' | 'openrouter'

export interface ProviderConfig {
  label: string
  defaultModel: string
  models: string[]       // empty = free-text input
  freeText: boolean
  comingSoon?: boolean   // disabled in UI, shows "Coming soon" tooltip
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4.1',
    models: ['gpt-4.1', 'gpt-4.1-mini', 'o4-mini', 'o3', 'gpt-4o'],
    freeText: false,
  },
  anthropic: {
    label: 'Anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022'],
    freeText: false,
    comingSoon: true,
  },
  openrouter: {
    label: 'OpenRouter',
    defaultModel: 'openai/gpt-4o',
    models: [],
    freeText: true,
    comingSoon: true,
  },
}

export const DEFAULT_PROVIDER: ProviderId = 'openai'

// Phase each agent runs in — used by /api/iterate to pass AGENT_PHASE
export const AGENT_PHASES: Record<string, number> = {
  ceoOrchestrator: 4,  // phase 4 for iteration (re-run the finalize)
  productManager:  1,
  backendEngineer: 2,
  marketingGrowth: 2,
  contentPitch:    2,
  frontendEngineer: 3,
}
