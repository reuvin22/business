import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cx, ui } from '../styles'

/**
 * A barcode box: type the code, use a USB scanner (it types into the box), or tap "Scan" to read it with the
 * camera (a laptop webcam or a phone's back camera).
 */
export default function BarcodeInput({
  value,
  onChange,
  autoFocus,
  className,
}: {
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
  className?: string
}) {
  const [scanning, setScanning] = useState(false)
  return (
    <div className={cx('flex gap-2', className)}>
      <input
        className={cx(ui.input, 'min-w-0 flex-1')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type, or scan"
        inputMode="text"
        autoComplete="off"
        autoFocus={autoFocus}
        // A USB scanner types the code and presses Enter: that must not submit the whole form
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
      />
      <button type="button" className={cx(ui.btnGhost, 'shrink-0')} onClick={() => setScanning(true)} title="Read the barcode with the camera">
        📷 Scan
      </button>
      {scanning && (
        <CameraScanner
          onDetected={(code) => {
            onChange(code)
            setScanning(false)
          }}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  )
}

type Controls = { stop: () => void }

/** The camera, until it reads a barcode. Opens over everything (also over a form in a dialog). */
function CameraScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(true)
  const latest = useRef({ onDetected, onClose })
  useEffect(() => {
    latest.current = { onDetected, onClose }
  })

  // Escape closes only the camera, not the form under it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      e.preventDefault()
      latest.current.onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  useEffect(() => {
    let controls: Controls | null = null
    let stopped = false
    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser cannot use the camera here. Open SIRIS over https (or type the code).')
        setStarting(false)
        return
      }
      try {
        // Loaded only when needed: the barcode reader is big
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ])
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.ITF,
          BarcodeFormat.CODABAR,
          BarcodeFormat.QR_CODE,
        ])
        const reader = new BrowserMultiFormatReader(hints)
        if (stopped || !video.current) return
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } }, // a phone's back camera; a laptop's only camera
          video.current,
          (result, _error, scanControls) => {
            if (!result || stopped) return
            stopped = true
            scanControls.stop()
            navigator.vibrate?.(80)
            latest.current.onDetected(result.getText().trim())
          },
        )
        if (stopped) controls.stop()
        setStarting(false)
      } catch (err) {
        const name = (err as Error).name
        setError(
          name === 'NotAllowedError'
            ? 'The camera is blocked. Allow it for this site in the browser (the camera icon in the address bar).'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? 'No camera found on this device. Type the code instead.'
              : name === 'NotReadableError'
                ? 'The camera is in use by another app. Close it and try again.'
                : `Could not start the camera (${(err as Error).message || name}).`,
        )
        setStarting(false)
      }
    })()
    return () => {
      stopped = true
      controls?.stop()
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Scan a barcode"
        className="flex w-full max-w-md flex-col gap-3 rounded-xl bg-surface p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className={ui.h2}>Scan a barcode</h2>
          <button type="button" className={ui.btnGhost} onClick={onClose}>
            Close
          </button>
        </div>
        {error ? (
          <p className={ui.alertError}>{error}</p>
        ) : (
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video ref={video} className="aspect-[4/3] w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-x-[10%] top-1/2 h-[38%] -translate-y-1/2 rounded-lg border-[3px] border-lime" />
            {starting && <p className="absolute inset-0 m-0 grid place-items-center text-white">Starting the camera…</p>}
          </div>
        )}
        <p className={cx(ui.hint, 'm-0')}>Hold the barcode inside the frame. It fills in by itself.</p>
      </div>
    </div>,
    document.body,
  )
}
