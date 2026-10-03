import type { ReactNode } from 'react'
import { cx, ui } from '../styles'
import { Modal } from './ui'

/**
 * A PDF read inside the app, in a dialog (it does not open a new tab). The browser's PDF viewer shows it
 * without its toolbar, so there is no download or print button. (A determined person can still save
 * what their browser shows: no web page can fully prevent that.)
 */
export default function PdfViewer({
  url,
  title,
  onClose,
  children,
}: {
  url: string
  title: string
  onClose: () => void
  /** Shown above the PDF, e.g. the policy as text */
  children?: ReactNode
}) {
  return (
    <Modal title={title} onClose={onClose} size="lg">
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-h-[calc(100dvh-4rem)]">
        <header className="flex items-center justify-between gap-3 border-b border-line px-6 py-4 max-sm:px-4">
          <h2 className={ui.h2}>{title}</h2>
          <button type="button" className={ui.btnGhost} onClick={onClose} autoFocus>
            Close
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 max-sm:px-4">
          {children}
          <iframe
            title={title}
            // #toolbar=0: no download / print buttons in the viewer; FitH: the page fills the width
            src={`${url}#toolbar=0&navpanes=0&view=FitH`}
            className={cx('h-[70dvh] min-h-96 w-full shrink-0 rounded-lg border border-line bg-chip')}
          />
        </div>
      </div>
    </Modal>
  )
}
