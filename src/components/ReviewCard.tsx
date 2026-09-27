import { useState, type FormEvent } from 'react'
import { respondToReview } from '../api/network'
import type { Review } from '../api/types'
import { RATING_DIMENSIONS } from '../constants/options'
import { cx, ui } from '../styles'
import { formatDateTime } from '../utils/format'
import { Badge, ErrorBox, Stars } from './ui'

/** One review. Pass respondAsBusinessId to let that business reply (when it has no reply yet). */
export default function ReviewCard({
  review,
  respondAsBusinessId,
  onResponded,
}: {
  review: Review
  respondAsBusinessId?: string
  onResponded?: () => void
}) {
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')

  async function handleRespond(e: FormEvent) {
    e.preventDefault()
    try {
      await respondToReview(respondAsBusinessId!, review.id, response)
      onResponded?.()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <article className={cx(ui.card, 'flex flex-col gap-2 px-4.5 py-4')}>
      <header className="flex flex-wrap items-center gap-3">
        <strong className="text-heading">{review.reviewerBusinessName}</strong>
        <Stars rating={review.rating} />
        <span className="text-muted">{formatDateTime(review.createdAt)}</span>
        {review.status === 'HIDDEN' && <Badge value="HIDDEN" label="Hidden by admin" />}
      </header>
      <p className="flex flex-wrap gap-x-3.5 gap-y-1 text-[0.8rem] text-muted">
        {RATING_DIMENSIONS.filter((d) => review.ratings[d.value as keyof typeof review.ratings]).map((d) => (
          <span key={d.value}>
            {d.label}: {review.ratings[d.value as keyof typeof review.ratings]}★
          </span>
        ))}
      </p>
      {review.review && <p className="whitespace-pre-line">{review.review}</p>}
      {review.response ? (
        <blockquote className="rounded-r-lg border-l-3 border-accent bg-page px-3.5 py-2.5 text-[0.9rem]">
          <strong>Reply from the business:</strong> {review.response}
        </blockquote>
      ) : (
        respondAsBusinessId && (
          <form onSubmit={handleRespond} className="flex flex-wrap items-center gap-2.5">
            <input
              className={cx(ui.input, 'min-w-45 flex-1')}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Write a public reply…"
            />
            <button type="submit" className={ui.btnGhost} disabled={!response.trim()}>
              Reply
            </button>
          </form>
        )
      )}
      <ErrorBox message={error} />
    </article>
  )
}
