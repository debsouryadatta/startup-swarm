'use client'

import { Lock } from 'lucide-react'
import { PROVIDERS, ProviderId } from '@/lib/llmProviders'

interface Props {
  provider:    ProviderId
  model:       string
  apiKey:      string
  onProvider:  (p: ProviderId) => void
  onModel:     (m: string) => void
  onApiKey:    (k: string) => void
}

export function ProviderSelector({ provider, model, apiKey, onProvider, onModel, onApiKey }: Props) {
  const config      = PROVIDERS[provider]
  const providerIds = Object.keys(PROVIDERS) as ProviderId[]

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
      <p className="text-sm font-semibold text-slate-200">AI Provider</p>

      {/* Provider radio buttons */}
      <div className="flex gap-3 flex-wrap">
        {providerIds.map(id => (
          <button
            key={id}
            onClick={() => {
              onProvider(id)
              onModel(PROVIDERS[id].defaultModel)
            }}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
              provider === id
                ? 'border-blue-500 bg-blue-600 text-white'
                : 'border-white/10 text-slate-400 hover:border-white/30 hover:text-white'
            }`}
          >
            {PROVIDERS[id].label}
          </button>
        ))}
      </div>

      {/* Model selector */}
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Model</label>
        {config.freeText ? (
          <input
            type="text"
            value={model}
            onChange={e => onModel(e.target.value)}
            placeholder="e.g. openai/gpt-4o"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        ) : (
          <select
            value={model}
            onChange={e => onModel(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0e0e10] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            {config.models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
      </div>

      {/* API key */}
      <div>
        <label className="text-xs text-slate-400 mb-1 block">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={e => onApiKey(e.target.value)}
          placeholder={`${config.label} API key`}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          autoComplete="off"
        />
        <p className="mt-1 text-xs text-slate-500 flex items-center gap-1"><Lock size={10} className="shrink-0" /> Sent directly to sandbox — never stored on our servers</p>
      </div>
    </div>
  )
}
