import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getPublicProfile } from '../../api/directory'
import * as network from '../../api/network'
import { useBusiness } from '../../businessContext'
import { EmptyState, ErrorBox, Loading, PageHeader } from '../../components/ui'
import { useLoad } from '../../hooks/useLoad'
import { formatDateTime, initials } from '../../utils/format'
import { cx, ui } from '../../styles'

const REFRESH_EVERY_MS = 10_000

/** Re-runs `callback` every few seconds while the page is open (there are no live updates). */
function useRefreshTimer(callback: () => void) {
  const latest = useRef(callback)
  useEffect(() => {
    latest.current = callback
  })
  useEffect(() => {
    const timer = setInterval(() => latest.current(), REFRESH_EVERY_MS)
    return () => clearInterval(timer)
  }, [])
}

export default function MessagesPage() {
  const { business, can } = useBusiness()
  const [params, setParams] = useSearchParams()
  const conversations = useLoad(() => network.listConversations(business.id), [business.id])
  useRefreshTimer(conversations.reload)

  // ?c=<conversationId> opens a chat; ?to=<businessId> opens (or starts) the chat with that business
  const toBusinessId = params.get('to')
  const existing = conversations.data?.find((c) => c.otherBusinessId === toBusinessId)
  const selectedId = params.get('c') ?? existing?.id ?? null
  const select = (id: string) => setParams({ c: id })

  return (
    <div className={ui.page}>
      <PageHeader title="Messages" subtitle="Talk with suppliers, customers, and partners." />
      <ErrorBox message={conversations.error} />

      <div className={cx(ui.card, 'grid h-[calc(100vh-200px)] min-h-105 grid-cols-[280px_1fr] overflow-hidden p-0 max-md:h-auto max-md:grid-cols-1 max-sm:p-0')}>
        <aside className="flex flex-col overflow-y-auto border-r border-line max-md:max-h-50 max-md:border-r-0 max-md:border-b">
          {!conversations.data ? (
            <Loading />
          ) : conversations.data.length === 0 && !toBusinessId ? (
            <p className={cx(ui.hint, 'm-0 p-4')}>No conversations yet. Start one from a business's page in the directory.</p>
          ) : (
            conversations.data.map((c) => (
              <button
                key={c.id}
                type="button"
                className={cx(
                  'flex cursor-pointer items-center gap-2.5 border-0 border-b border-line px-3.5 py-3 text-left text-body hover:bg-page',
                  c.id === selectedId ? 'bg-chip' : 'bg-transparent',
                  c.unread && '[&_strong]:text-heading',
                )}
                onClick={() => select(c.id)}
              >
                <span className={ui.avatar}>{initials(c.otherBusinessName)}</span>
                <span className="flex min-w-0 flex-1 flex-col text-[0.88rem] [&>strong]:font-semibold">
                  <strong>{c.otherBusinessName}</strong>
                  <span className="truncate">{c.lastMessage}</span>
                </span>
                {c.unread && <span className="size-2.25 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
              </button>
            ))
          )}
        </aside>

        <section className="flex min-w-0 flex-col">
          {selectedId ? (
            <Thread key={selectedId} conversationId={selectedId} onSent={conversations.reload} canSend={can('messages.send')} />
          ) : toBusinessId ? (
            <NewConversation
              toBusinessId={toBusinessId}
              canSend={can('messages.send')}
              onStarted={(id) => {
                conversations.reload()
                select(id)
              }}
            />
          ) : (
            <EmptyState text="Choose a conversation." />
          )}
        </section>
      </div>
    </div>
  )
}

function Thread({ conversationId, onSent, canSend }: { conversationId: string; onSent: () => void; canSend: boolean }) {
  const { business } = useBusiness()
  const { data, error, reload } = useLoad(() => network.openConversation(business.id, conversationId), [business.id, conversationId])
  useRefreshTimer(reload)
  const bottom = useRef<HTMLDivElement>(null)
  const messageCount = data?.messages.length ?? 0

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messageCount])

  if (!data) return error ? <ErrorBox message={error} /> : <Loading />

  return (
    <>
      <header className="border-b border-line px-4.5 py-3.5 text-heading">
        <strong>{data.conversation.otherBusinessName}</strong>
      </header>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4.5 py-4 max-md:max-h-[55vh]">
        {data.messages.map((m) => {
          const mine = m.senderBusinessId === business.id
          return (
            <div
              key={m.id}
              className={cx(
                'max-w-[70%] px-3.5 py-2.5',
                mine ? 'self-end rounded-[12px_12px_4px_12px] bg-info-soft' : 'self-start rounded-[12px_12px_12px_4px] bg-chip',
              )}
            >
              <p className="whitespace-pre-line text-heading">{m.message}</p>
              <span className="mt-1 block text-[0.72rem] text-muted">
                {m.senderName} · {formatDateTime(m.createdAt)}
                {mine && m.readAt && ' · Seen'}
              </span>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>
      {canSend ? (
        <Composer
          onSend={async (text) => {
            await network.sendMessage(business.id, conversationId, text)
            reload()
            onSent()
          }}
        />
      ) : (
        <p className={cx(ui.hint, 'm-0 p-4')}>You don't have permission to send messages.</p>
      )}
    </>
  )
}

function NewConversation({ toBusinessId, canSend, onStarted }: { toBusinessId: string; canSend: boolean; onStarted: (id: string) => void }) {
  const { business } = useBusiness()
  const { data: profile, error } = useLoad(() => getPublicProfile(toBusinessId), [toBusinessId])

  return (
    <>
      <header className="border-b border-line px-4.5 py-3.5 text-heading">
        <strong>{profile?.business.businessName ?? '…'}</strong>
      </header>
      <ErrorBox message={error} />
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4.5 py-4 max-md:max-h-[55vh]">
        <p className={cx(ui.hint, 'm-0 p-4')}>Write your first message.</p>
      </div>
      {canSend && (
        <Composer
          onSend={async (text) => {
            const conversation = await network.startConversation(business.id, { participantBusinessId: toBusinessId, message: text })
            onStarted(conversation.id)
          }}
        />
      )}
    </>
  )
}

function Composer({ onSend }: { onSend: (text: string) => Promise<void> }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setError('')
    setSending(true)
    try {
      await onSend(text.trim())
      setText('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="flex flex-col gap-2 border-t border-line px-3.5 py-3" onSubmit={handleSubmit}>
      <ErrorBox message={error} />
      <div className="flex items-end gap-2.5">
        <textarea
          className={cx(ui.input, 'flex-1 resize-none')}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <button type="submit" className={ui.btnPrimary} disabled={sending || !text.trim()}>
          Send
        </button>
      </div>
    </form>
  )
}
