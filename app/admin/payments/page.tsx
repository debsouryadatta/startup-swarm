'use client'

import { useEffect, useState } from 'react'
import { useSession }          from 'next-auth/react'
import Image                   from 'next/image'
import {
  CheckCircle2, XCircle, Loader2, ExternalLink,
  Clock, User, CreditCard, RefreshCw,
} from 'lucide-react'

interface PaymentRequest {
  id:            string
  userId:        string
  userEmail:     string
  userName:      string
  plan:          string
  screenshotUrl: string
  status:        'pending' | 'approved' | 'rejected'
  adminNote:     string | null
  createdAt:     string
  reviewedAt:    string | null
}

const PLAN_LABELS: Record<string, string> = {
  builder: 'Builder — ₹1,999/mo',
  studio:  'Studio — ₹3,999/mo',
}

export default function AdminPaymentsPage() {
  const { data: authSession, status: sessionStatus } = useSession()

  const [requests,   setRequests]   = useState<PaymentRequest[]>([])
  const [loading,    setLoading]    = useState(true)
  const [actionId,   setActionId]   = useState<string | null>(null)
  const [noteMap,    setNoteMap]    = useState<Record<string, string>>({})
  const [lightbox,   setLightbox]   = useState<string | null>(null)
  const [filter,     setFilter]     = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')

  const load = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/payments')
      if (!res.ok) return
      const data = await res.json() as { requests: PaymentRequest[] }
      setRequests(data.requests)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (sessionStatus === 'authenticated') load() }, [sessionStatus])

  const act = async (id: string, action: 'approve' | 'reject') => {
    setActionId(id)
    try {
      const res = await fetch(`/api/admin/payments/${id}/${action}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ note: noteMap[id] ?? '' }),
      })
      if (res.ok) {
        setRequests(prev =>
          prev.map(r =>
            r.id === id
              ? { ...r, status: action === 'approve' ? 'approved' : 'rejected', adminNote: noteMap[id] ?? null, reviewedAt: new Date().toISOString() }
              : r
          )
        )
      }
    } finally {
      setActionId(null)
    }
  }

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={22} className="animate-spin text-indigo-500" />
      </div>
    )
  }

  const visible = requests.filter(r => filter === 'all' || r.status === filter)
  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <Image
              src={lightbox}
              alt="Payment screenshot"
              width={800}
              height={600}
              className="w-full rounded-2xl shadow-2xl"
            />
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Requests</h1>
            <p className="text-sm text-gray-400 mt-1">Review UPI payment screenshots and activate plans</p>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                <Clock size={12} />
                {pendingCount} pending
              </span>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {f}
              {f !== 'all' && (
                <span className="ml-1.5 opacity-70">
                  ({requests.filter(r => r.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table / list */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={22} className="animate-spin text-indigo-400" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
            <CheckCircle2 size={28} className="opacity-40" />
            <p className="text-sm">No {filter === 'all' ? '' : filter} requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map(req => (
              <div
                key={req.id}
                className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all ${
                  req.status === 'pending'  ? 'border-amber-200'  :
                  req.status === 'approved' ? 'border-green-200'  :
                  'border-red-200'
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-4 p-5 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      req.status === 'pending'  ? 'bg-amber-100'  :
                      req.status === 'approved' ? 'bg-green-100'  :
                      'bg-red-100'
                    }`}>
                      {req.status === 'pending'  ? <Clock size={14} className="text-amber-600" /> :
                       req.status === 'approved' ? <CheckCircle2 size={14} className="text-green-600" /> :
                       <XCircle size={14} className="text-red-500" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">{req.userName}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          req.status === 'pending'  ? 'bg-amber-100 text-amber-700'  :
                          req.status === 'approved' ? 'bg-green-100 text-green-700'  :
                          'bg-red-100 text-red-600'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1"><User size={10} />{req.userEmail}</span>
                        <span className="flex items-center gap-1"><CreditCard size={10} />{PLAN_LABELS[req.plan] ?? req.plan}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {req.adminNote && (
                        <p className="mt-2 text-xs text-gray-500 italic">Note: {req.adminNote}</p>
                      )}
                    </div>
                  </div>

                  {/* Screenshot thumbnail */}
                  <button
                    onClick={() => setLightbox(req.screenshotUrl)}
                    className="group relative w-20 h-16 rounded-xl overflow-hidden border border-gray-200 shrink-0 hover:border-indigo-300 transition-colors"
                  >
                    <Image
                      src={req.screenshotUrl}
                      alt="Payment screenshot"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ExternalLink size={14} className="text-white" />
                    </div>
                  </button>
                </div>

                {/* Actions (pending only) */}
                {req.status === 'pending' && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 flex items-center gap-3 flex-wrap">
                    <input
                      type="text"
                      placeholder="Optional note (e.g. verified via UPI ref)"
                      value={noteMap[req.id] ?? ''}
                      onChange={e => setNoteMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                      className="flex-1 min-w-[180px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                    />
                    <button
                      onClick={() => act(req.id, 'reject')}
                      disabled={actionId === req.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {actionId === req.id ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                      Reject
                    </button>
                    <button
                      onClick={() => act(req.id, 'approve')}
                      disabled={actionId === req.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {actionId === req.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Approve & Activate
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
