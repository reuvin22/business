import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as chat from '../../api/chat'
import { getPublicProfile } from '../../api/directory'
import * as network from '../../api/network'
import type { ChatAccess, ChatMessage, LiveMessage } from '../../api/types'
import { useBusiness } from '../../businessContext'
import { BusyButton, EmptyState, ErrorBox, Loading, PageHeader } from '../../components/ui'
import { useOnActivity } from '../../hooks/useActivity'
import { useLoad } from '../../hooks/useLoad'
import { useRealtimeMessages, useRealtimeValue } from '../../hooks/useRealtime'
import { formatDateTime, initials } from '../../utils/format'
import { cx, ui } from '../../styles'

// The conversation list (who wrote last, unread dots) is checked this often. The messages
// themselves arrive live from the Realtime Database.
const LIST_REFRESH_MS = 10_000

/** Re-runs `callback` every few seconds while the page is open. */
function useRefreshTimer(callback: () => void) {
  const latest = useRef(callback)
  useEffect(() => {
    latest.current = callback
  })
  useEffect(() => {
    const timer = setInterval(() => latest.current(), LIST_REFRESH_MS)
    return () => clearInterval(timer)
  }, [])
}

type Channel = 'team' | 'market'

export default function MessagesPage() {
  const { business, can } = useBusiness()
  const [params, setParams] = useSearchParams()
  // Asking the API first lets this user read the business's chats in the Realtime Database
  const access = useLoad(() => chat.getChatAccess(business.id), [business.id])
  const conversations = useLoad(() => network.listConversations(business.id), [business.id])
  useRefreshTimer(conversations.reload)
  // A new message from another business: its conversation moves up with an unread dot right away
  useOnActivity(business.id, ['MESSAGES'], () => conversations.reload())

  // ?c=team | market | <conversationId>; ?to=<businessId> opens (or starts) the chat with that business
  const toBusinessId = params.get('to')
  const existing = conversations.data?.find((c) => c.otherBusinessId === toBusinessId)
  const selected = params.get('c') ?? existing?.id ?? (toBusinessId ? null : 'team')
  const select = (id: string) => setParams({ c: id })

  return (
    <div className={ui.page}>
      <PageHeader title="Messages" subtitle="Your team, the market, and businesses you work with. Messages arrive live." />
      <ErrorBox message={access.error || conversations.error} />

      <div className={cx(ui.card, 'grid h-[calc(100vh-200px)] min-h-105 grid-cols-[280px_1fr] overflow-hidden p-0 max-md:h-auto max-md:grid-cols-1 max-sm:p-0')}>
        <aside className="flex flex-col overflow-y-auto border-r border-line max-md:max-h-60 max-md:border-r-0 max-md:border-b">
          <SidebarHeading>Channels</SidebarHeading>
          <SidebarItem active={selected === 'team'} onClick={() => select('team')} badge="#" title="Team" subtitle={`Only ${business.businessName}`} />
          <SidebarItem active={selected === 'market'} onClick={() => select('market')} badge="#" title="Market" subtitle="Every business on SIRIS" />

          <SidebarHeading>Direct messages</SidebarHeading>
          {!conversations.data ? (
            <Loading />
          ) : conversations.data.length === 0 ? (
            <p className={cx(ui.hint, 'm-0 px-4 py-3')}>No conversations yet. Start one from a business's page in the directory.</p>
          ) : (
            conversations.data.map((c) => (
              <SidebarItem
                key={c.id}
                active={c.id === selected}
                onClick={() => select(c.id)}
                badge={initials(c.otherBusinessName)}
                title={c.otherBusinessName}
                subtitle={c.lastMessage}
                unread={c.unread}
              />
            ))
          )}
        </aside>

        <section className="flex min-w-0 flex-col">
          {!access.data ? (
            access.error ? <EmptyState text="Messages are not available right now." /> : <Loading />
          ) : selected === 'team' || selected === 'market' ? (
            <ChannelView key={selected} channel={selected} access={access.data} canPost={selected === 'team' || can('messages.send')} />
          ) : selected ? (
            <Thread key={selected} conversationId={selected} onChange={conversations.reload} canSend={can('messages.send')} />
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

function SidebarHeading({ children }: { children: ReactNode }) {
  return <h2 className="m-0 px-3.5 pt-4 pb-1.5 text-[0.72rem] font-bold tracking-wider text-muted uppercase">{children}</h2>
}

function SidebarItem(props: { active: boolean; onClick: () => void; badge: string; title: string; subtitle: string; unread?: boolean }) {
  return (
    <button
      type="button"
      className={cx(
        'flex cursor-pointer items-center gap-2.5 border-0 border-b border-line px-3.5 py-3 text-left text-body hover:bg-page',
        props.active ? 'bg-chip' : 'bg-transparent',
        props.unread && '[&_strong]:text-heading',
      )}
      onClick={props.onClick}
    >
      <span className={ui.avatar}>{props.badge}</span>
      <span className="flex min-w-0 flex-1 flex-col text-[0.88rem] [&>strong]:font-semibold">
        <strong>{props.title}</strong>
        <span className="truncate">{props.subtitle}</span>
      </span>
      {props.unread && <span className="size-2.25 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
    </button>
  )
}

// ---- Team and market channels -----------------------------------------------------------------

const CHANNEL_INFO: Record<Channel, { title: string; about: (businessName: string) => string; empty: string }> = {
  team: {
    title: '# Team',
    about: (name) => `Only members of ${name} can see this channel.`,
    empty: 'No messages yet. Say hello to your team.',
  },
  market: {
    title: '# Market',
    about: () => "Every business on SIRIS can read this. Post offers, new products, and what you're looking for.",
    empty: 'No posts yet. Be the first to share an offer.',
  },
}

function ChannelView({ channel, access, canPost }: { channel: Channel; access: ChatAccess; canPost: boolean }) {
  const { business } = useBusiness()
  const info = CHANNEL_INFO[channel]
  const messages = useRealtimeMessages<Omit<ChatMessage, 'id'>>(channel === 'team' ? access.teamPath : access.marketPath)
  const [error, setError] = useState('')

  async function remove(id: string) {
    setError('')
    try {
      await chat.deleteMarketMessage(business.id, id)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <>
      <header className="border-b border-line px-4.5 py-3.5">
        <strong className="text-heading">{info.title}</strong>
        <p className={cx(ui.hint, 'm-0')}>{info.about(business.businessName)}</p>
      </header>
      <ErrorBox message={messages.error || error} />
      <MessageList count={messages.data?.length} loading={!messages.data && !messages.error} empty={info.empty}>
        {messages.data?.map((m) => {
          const mine = channel === 'team' ? m.senderUid === access.uid : m.businessId === business.id
          return (
            <Bubble
              key={m.id}
              mine={mine}
              text={m.message}
              footer={
                <>
                  {channel === 'market' ? (
                    <>
                      <Link to={`/dashboard/directory/${m.businessId}`} className="font-semibold text-accent no-underline hover:underline">
                        {m.businessName}
                      </Link>
                      {' · '}
                      {m.senderName}
                    </>
                  ) : (
                    m.senderName
                  )}
                  {' · '}
                  {formatDateTime(m.createdAt)}
                  {channel === 'market' && mine && canPost && (
                    <>
                      {' · '}
                      <button type="button" className={cx(ui.linkDanger, 'text-[0.72rem]')} onClick={() => remove(m.id)}>
                        Delete
                      </button>
                    </>
                  )}
                </>
              }
            />
          )
        })}
      </MessageList>
      {canPost ? (
        <Composer
          placeholder={channel === 'team' ? 'Message your team…' : 'Share an offer with every business…'}
          onSend={async (text) => {
            await (channel === 'team' ? chat.sendTeamMessage(business.id, text) : chat.sendMarketMessage(business.id, text))
          }}
        />
      ) : (
        <p className={cx(ui.hint, 'm-0 border-t border-line p-4')}>You don't have permission to post in the market.</p>
      )}
    </>
  )
}

// ---- Direct messages with another business ----------------------------------------------------

function Thread({ conversationId, onChange, canSend }: { conversationId: string; onChange: () => void; canSend: boolean }) {
  const { business } = useBusiness()
  // Opening it through the API sets the chat up for live reading and marks it as read
  const opened = useLoad(() => network.openConversation(business.id, conversationId), [business.id, conversationId])
  const path = opened.data ? `chat/dm/${conversationId}` : null
  const live = useRealtimeMessages<Omit<LiveMessage, 'id'>>(path && `${path}/messages`)
  const lastReadAt = useRealtimeValue<Record<string, number>>(path && `${path}/meta/lastReadAt`)

  // Without live updates (e.g. the database rules are not deployed), show what the API returned
  const messages = live.data ?? (live.error ? opened.data?.messages : undefined)
  const otherId = opened.data?.conversation.otherBusinessId ?? ''
  const theyReadAt = lastReadAt.data?.[otherId] ?? 0

  // A new message from the other business while the chat is open: mark it as read
  const newest = live.data?.at(-1)
  const myReadAt = lastReadAt.data?.[business.id] ?? 0
  const unreadAt = newest && newest.senderBusinessId !== business.id && newest.createdAt > myReadAt ? newest.createdAt : 0
  useEffect(() => {
    if (!unreadAt) return
    network.openConversation(business.id, conversationId).then(onChange, () => undefined)
    // onChange only refreshes the list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadAt, business.id, conversationId])

  if (!opened.data) return opened.error ? <ErrorBox message={opened.error} /> : <Loading />

  return (
    <>
      <header className="border-b border-line px-4.5 py-3.5 text-heading">
        <strong>{opened.data.conversation.otherBusinessName}</strong>
      </header>
      {live.error && <p className={cx(ui.alertWarn, 'm-3')}>Live updates are off: {live.error}</p>}
      <MessageList count={messages?.length} loading={!messages} empty="No messages yet.">
        {messages?.map((m) => {
          const mine = m.senderBusinessId === business.id
          return (
            <Bubble
              key={m.id}
              mine={mine}
              text={m.message}
              footer={
                <>
                  {m.senderName} · {formatDateTime(m.createdAt)}
                  {mine && theyReadAt >= m.createdAt && ' · Seen'}
                </>
              }
            />
          )
        })}
      </MessageList>
      {canSend ? (
        <Composer
          onSend={async (text) => {
            await network.sendMessage(business.id, conversationId, text)
            onChange()
          }}
        />
      ) : (
        <p className={cx(ui.hint, 'm-0 border-t border-line p-4')}>You don't have permission to send messages.</p>
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

// ---- Shared pieces --------------------------------------------------------------------------------

/** The scrolling list of messages; it keeps the newest one in view. */
function MessageList({ count, loading, empty, children }: { count: number | undefined; loading: boolean; empty: string; children: ReactNode }) {
  const bottom = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [count])

  return (
    <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4.5 py-4 max-md:max-h-[55vh]">
      {loading ? <Loading /> : count === 0 ? <p className={cx(ui.hint, 'm-0 p-4')}>{empty}</p> : children}
      <div ref={bottom} />
    </div>
  )
}

function Bubble({ mine, text, footer }: { mine: boolean; text: string; footer: ReactNode }) {
  return (
    <div
      className={cx(
        'max-w-[70%] px-3.5 py-2.5',
        mine ? 'self-end rounded-[12px_12px_4px_12px] bg-info-soft' : 'self-start rounded-[12px_12px_12px_4px] bg-chip',
      )}
    >
      <p className="whitespace-pre-line text-heading">{text}</p>
      <span className="mt-1 block text-[0.72rem] text-muted">{footer}</span>
    </div>
  )
}

function Composer({ onSend, placeholder = 'Write a message…' }: { onSend: (text: string) => Promise<void>; placeholder?: string }) {
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
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <BusyButton type="submit" className={ui.btnPrimary} disabled={!text.trim()} busy={sending}>
          Send
        </BusyButton>
      </div>
    </form>
  )
}
