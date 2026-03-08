'use client'

import { useEffect, useRef } from 'react'

interface Props {
  text: string
}

// Scrolling typewriter token display inside each agent card
export function TokenStream({ text }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [text])

  if (!text) return null

  return (
    <div
      ref={ref}
      className="mt-2 max-h-32 overflow-y-auto rounded bg-black/30 p-2 font-mono text-xs leading-relaxed text-slate-300 scrollbar-thin"
    >
      {text}
      <span className="inline-block h-3 w-1 animate-pulse bg-blue-400 ml-0.5" />
    </div>
  )
}
