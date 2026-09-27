import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getPublicProfile } from '../../api/directory'
import * as network from '../../api/network'
import { useBusiness } from '../../businessContext'
import { EmptyState, ErrorBox, Loading, PageHeader } from '../../components/ui'
import { useLoad } from '../../hooks/useLoad'
import { formatDateTime, initials } from '../../utils/format'

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
    <div className="page">
      <PageHeader title="Messages" subtitle="Talk with suppliers, customers, and partners." />
      <ErrorBox message={conversations.error} />

      <div className="chat-layout card">
        <aside className="chat-list">
          {!conversations.data ? (
            <Loading />
          ) : conversations.data.length === 0 && !toBusinessId ? (
            <p className="hint chat-empty">No conversations yet. Start one from a business's page in the directory.</p>
          ) : (
            conversations.data.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chat-list-item${c.id === selectedId ? ' active' : ''}${c.unread ? ' unread' : ''}`}
                onClick={() => select(c.id)}
              >
                <span className="item-avatar">{initials(c.otherBusinessName)}</span>
                <span className="chat-list-text">
                  <strong>{c.otherBusinessName}</strong>
                  <span className="ellipsis">{c.lastMessage}</span>
                </span>
                {c.unread && <span className="unread-dot" aria-label="Unread" />}
              </button>
            ))
          )}
        </aside>

        <section className="chat-thread">
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
      <header className="chat-header">
        <strong>{data.conversation.otherBusinessName}</strong>
      </header>
      <div className="chat-messages">
        {data.messages.map((m) => {
          const mine = m.senderBusinessId === business.id
          return (
            <div key={m.id} className={`bubble${mine ? ' mine' : ''}`}>
              <p className="pre-line">{m.message}</p>
              <span className="bubble-meta">
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
        <p className="hint chat-empty">You don't have permission to send messages.</p>
      )}
    </>
  )
}

function NewConversation({ toBusinessId, canSend, onStarted }: { toBusinessId: string; canSend: boolean; onStarted: (id: string) => void }) {
  const { business } = useBusiness()
  const { data: profile, error } = useLoad(() => getPublicProfile(toBusinessId), [toBusinessId])

  return (
    <>
      <header className="chat-header">
        <strong>{profile?.business.businessName ?? '…'}</strong>
      </header>
      <ErrorBox message={error} />
      <div className="chat-messages">
        <p className="hint chat-empty">Write your first message.</p>
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
    <form className="chat-composer" onSubmit={handleSubmit}>
      <ErrorBox message={error} />
      <div className="chat-composer-row">
        <textarea
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
        <button type="submit" className="btn btn-primary btn-auto" disabled={sending || !text.trim()}>
          Send
        </button>
      </div>
    </form>
  )
}
