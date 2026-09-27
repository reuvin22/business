import { useState, type FormEvent } from 'react'
import { respondToReview } from '../api/network'
import type { Review } from '../api/types'
import { RATING_DIMENSIONS } from '../constants/options'
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
    <article className="card review-card">
      <header>
        <strong>{review.reviewerBusinessName}</strong>
        <Stars rating={review.rating} />
        <span className="muted">{formatDateTime(review.createdAt)}</span>
        {review.status === 'HIDDEN' && <Badge value="HIDDEN" label="Hidden by admin" />}
      </header>
      <p className="rating-breakdown">
        {RATING_DIMENSIONS.filter((d) => review.ratings[d.value as keyof typeof review.ratings]).map((d) => (
          <span key={d.value}>
            {d.label}: {review.ratings[d.value as keyof typeof review.ratings]}★
          </span>
        ))}
      </p>
      {review.review && <p className="pre-line">{review.review}</p>}
      {review.response ? (
        <blockquote className="review-response">
          <strong>Reply from the business:</strong> {review.response}
        </blockquote>
      ) : (
        respondAsBusinessId && (
          <form onSubmit={handleRespond} className="inline-form">
            <input value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Write a public reply…" />
            <button type="submit" className="btn btn-ghost" disabled={!response.trim()}>
              Reply
            </button>
          </form>
        )
      )}
      <ErrorBox message={error} />
    </article>
  )
}
