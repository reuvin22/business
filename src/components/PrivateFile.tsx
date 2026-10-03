import { useState } from 'react'
import { isPrivateFile, privateFileName } from '../api/uploads'
import { cx, ui } from '../styles'
import PdfViewer from './PdfViewer'
import { Spinner } from './ui'

/**
 * Opens a private file (a permit, an ID, a proof of payment) inside the app. Private files have no public
 * link: `open` asks the API for one that works for a few minutes, only for those allowed to see the file.
 * Older documents saved as a plain link (before uploads) open in a new tab.
 */
export default function PrivateFileButton({
  value,
  label,
  title,
  open,
  className,
}: {
  value: string
  label?: string
  title: string
  open: () => Promise<string>
  className?: string
}) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!value) return null
  if (!isPrivateFile(value)) {
    return (
      <a href={value} target="_blank" rel="noreferrer noopener" className={className}>
        {label ?? 'Open link'}
      </a>
    )
  }

  async function show() {
    setError('')
    setLoading(true)
    try {
      setUrl(await open())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button type="button" className={cx(ui.link, 'inline-flex items-center gap-1.5', className)} onClick={show} disabled={loading}>
        {loading && <Spinner />}
        {label ?? privateFileName(value)}
      </button>
      {error && <span className="text-[0.82rem] text-danger"> {error}</span>}
      {url && <PdfViewer url={url} title={title} onClose={() => setUrl('')} />}
    </>
  )
}
