import { doc, onSnapshot } from 'firebase/firestore'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { del, post } from '../api/client'
import { locationsApi } from '../api/resources'
import { db } from '../firebase'
import { useLoad } from '../hooks/useLoad'
import { cx, ui } from '../styles'
import { BusyButton, ErrorBox, Modal } from './ui'

/** What the API returns when a session starts: this browser's own one-time code, as a QR code and as text. */
type Started = { session: { id: string; locationName: string }; pairingCode: string; qrText: string; pairingExpiresAt: number }
type Live = { active: boolean; scannerName: string; pairedAt: number | null; approved?: boolean }

const DEVICE_KEY = 'siris:device-id'
const sessionKey = (businessId: string) => `siris:admin-scanner:${businessId}`

/** A random id for this browser, made once: its phone connections never touch another browser's (or till's). */
function deviceId(): string {
  try {
    const saved = localStorage.getItem(DEVICE_KEY)
    if (saved) return saved
    const made = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, made)
    return made
  } catch {
    return crypto.randomUUID()
  }
}

function readStarted(businessId: string): Started | null {
  try {
    return JSON.parse(localStorage.getItem(sessionKey(businessId)) ?? 'null') as Started | null
  } catch {
    return null
  }
}

function saveStarted(businessId: string, started: Started | null) {
  try {
    if (started) localStorage.setItem(sessionKey(businessId), JSON.stringify(started))
    else localStorage.removeItem(sessionKey(businessId))
  } catch {
    // Not kept: after a reload, connect the phone again
  }
}

/** "ABCD2345" -> "ABCD-2345" */
const showCode = (code: string) => code.replace(/(.{4})(?=.)/g, '$1-')

/**
 * "Connect phone": shows a QR code for the SIRIS Scanner app, so a phone can register products by scanning their
 * barcodes (Options → Register product). The code belongs to this browser only, works once, for 10 minutes.
 */
export default function PhoneScannerConnect({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false)
  const [started, setStarted] = useState<Started | null>(() => readStarted(businessId))
  const [live, setLive] = useState<Live | null>(null)

  // Is the phone connected? (live, from the session)
  useEffect(() => {
    if (!started) return
    return onSnapshot(
      doc(db, 'businesses', businessId, 'scannerSessions', started.session.id),
      (snapshot) => setLive(snapshot.exists() ? (snapshot.data() as Live) : null),
      () => setLive(null),
    )
  }, [businessId, started])

  const connected = !!live?.active && !!live.pairedAt && !!live.approved
  // A phone scanned the QR code and waits for an OK here (it can do nothing until then)
  const waitingName = live?.active && live.pairedAt && !live.approved ? live.scannerName || 'A phone' : ''
  const ended = !!started && !!live && !live.active
  const [askedFor, setAskedFor] = useState('')
  if (waitingName && askedFor !== waitingName) {
    setAskedFor(waitingName)
    setOpen(true)
  }

  function update(next: Started | null) {
    saveStarted(businessId, next)
    setLive(null)
    setStarted(next)
  }

  return (
    <>
      <button
        type="button"
        className={cx(ui.btnGhost, connected && 'border-accent text-accent')}
        onClick={() => setOpen(true)}
        title="Use a phone to register products by scanning their barcodes"
      >
        {waitingName ? '📱 Approve phone?' : connected ? `📱 ${live?.scannerName || 'Phone'} connected` : '📱 Connect phone'}
      </button>
      {open && (
        <ConnectDialog
          businessId={businessId}
          started={ended ? null : started}
          connected={connected}
          waitingName={waitingName}
          scannerName={live?.scannerName ?? ''}
          onChange={update}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function ConnectDialog({
  businessId,
  started,
  connected,
  waitingName,
  scannerName,
  onChange,
  onClose,
}: {
  businessId: string
  started: Started | null
  connected: boolean
  waitingName: string
  scannerName: string
  onChange: (started: Started | null) => void
  onClose: () => void
}) {
  const { data: locations = [] } = useLoad(() => locationsApi.list(businessId), [businessId])
  const [locationId, setLocationId] = useState('')
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const store = locationId || locations.find((l) => l.isPrimary)?.id || locations[0]?.id || ''

  // Drawn here, in this browser: the code never goes to another service
  useEffect(() => {
    if (!started) return
    QRCode.toDataURL(started.qrText, { width: 260, margin: 1, errorCorrectionLevel: 'M' }).then(setQr, () => setQr(''))
  }, [started])

  async function run(action: () => Promise<void>) {
    setError('')
    setBusy(true)
    try {
      await action()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const start = () =>
    run(async () => {
      if (started) await del(`/businesses/${businessId}/admin-scanner-sessions/${started.session.id}?till_device_id=${deviceId()}`).catch(() => undefined)
      const next = await post<Started>(`/businesses/${businessId}/admin-scanner-sessions`, { locationId: store, tillDeviceId: deviceId() })
      onChange(next)
    })

  const approve = () =>
    run(async () => {
      if (started) await post<void>(`/businesses/${businessId}/admin-scanner-sessions/${started.session.id}/approve?till_device_id=${deviceId()}`)
    })

  const disconnect = () =>
    run(async () => {
      if (started) await del(`/businesses/${businessId}/admin-scanner-sessions/${started.session.id}?till_device_id=${deviceId()}`)
      onChange(null)
    })

  return (
    <Modal title="Connect a phone" onClose={onClose}>
      <div className="flex flex-col gap-3.5 p-6 max-sm:p-4">
        <div>
          <h2 className={ui.h2}>Connect a phone</h2>
          <p className={cx(ui.hint, 'm-0')}>
            Register products with a phone: open <strong>SIRIS Scanner</strong>, scan this QR code (no sign-in needed), then scan
            each new product’s barcode. Finish on the phone, or here on the web with the barcode filled in.
          </p>
        </div>

        {waitingName ? (
          <div className="flex flex-col gap-2 rounded-lg border-2 border-warn bg-warn-soft px-4 py-3 text-heading">
            <strong className="text-[1.05rem]">“{waitingName}” wants to connect</strong>
            <span className="text-[0.9rem]">
              Only allow it if it is your phone: it can add products in your name. If you do not know it, reject it.
            </span>
            <div className="flex gap-2">
              <BusyButton className={ui.btnPrimary} busy={busy} disabled={busy} onClick={approve}>
                Allow
              </BusyButton>
              <BusyButton className={ui.btnGhost} busy={busy} disabled={busy} onClick={disconnect}>
                Reject
              </BusyButton>
            </div>
          </div>
        ) : connected ? (
          <div className="flex flex-col gap-1 rounded-lg bg-info-soft px-4 py-3 text-heading">
            <strong>Connected: {scannerName || 'Phone'}</strong>
            <span className="text-[0.88rem]">
              Products it registers show up in your product list. It disconnects after 30 minutes unused (2 hours at most).
            </span>
          </div>
        ) : started ? (
          <div className="flex flex-col items-center gap-2 text-center">
            {qr ? <img src={qr} alt="QR code to connect the phone" className="size-[260px] rounded-lg bg-white p-2" /> : <div className="size-[260px]" />}
            <p className="m-0 text-[0.85rem] text-muted">
              Or type the code: <strong className="font-mono text-[1.1rem] tracking-widest text-heading">{showCode(started.pairingCode)}</strong>
            </p>
            <p className="m-0 text-[0.8rem] text-muted">
              This code belongs to this browser only. It works once, for 10 minutes. New stock goes to {started.session.locationName}.
              Waiting for the phone…
            </p>
          </div>
        ) : (
          <label className={ui.label}>
            Store for the new products’ starting stock
            <select className={ui.input} value={store} onChange={(e) => setLocationId(e.target.value)}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.locationName}
                </option>
              ))}
            </select>
          </label>
        )}

        {!started && !locations.length && <p className={ui.alertWarn}>Add a location first (Profile → Locations).</p>}
        <ErrorBox message={error} />

        <div className="flex flex-wrap justify-end gap-2">
          {started && (
            <BusyButton className={ui.btnGhost} busy={busy} disabled={busy} onClick={disconnect}>
              Disconnect
            </BusyButton>
          )}
          {!connected && !waitingName && (
            <BusyButton className={ui.btnPrimary} busy={busy} disabled={busy || !store} onClick={start}>
              {started ? 'New code' : 'Show QR code'}
            </BusyButton>
          )}
          <button type="button" className={ui.btnGhost} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
