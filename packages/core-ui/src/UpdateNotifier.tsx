import React, { useEffect, useState } from 'react'

type UpdateAPI = {
  onUpdaterEvent?: (channel: string, callback: (payload?: unknown) => void) => () => void
  restartAndInstallUpdate?: () => Promise<unknown>
}

export function UpdateNotifier() {
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const api = (window as Window & { api?: UpdateAPI }).api
    return api?.onUpdaterEvent?.('updater:update-downloaded', () => setReady(true))
  }, [])

  if (!ready) return null
  return <div role="status" style={{ position: 'fixed', right: 16, bottom: 38, zIndex: 100000, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', color: '#d4d4d4', background: '#252526', border: '1px solid #454545', boxShadow: '0 2px 8px rgba(0,0,0,.35)', fontSize: 12 }}>
    <span><strong>CavalloCode update ready!</strong> Restart now to apply the latest version.</span>
    <button disabled={busy} onClick={() => {
      setBusy(true)
      void (window as Window & { api?: UpdateAPI }).api?.restartAndInstallUpdate?.().finally(() => setBusy(false))
    }} style={{ padding: '5px 8px', color: '#fff', background: '#0e639c', border: 0, cursor: 'pointer' }}>{busy ? 'Restarting…' : 'Restart & Update'}</button>
  </div>
}

export default UpdateNotifier
