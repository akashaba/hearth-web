'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAskAssistant, useAssistantMessages, messageText, type AssistantMessage } from '@/lib/hooks/use-assistant'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'How much did I spend on Coffee this month?',
  'What was my biggest expense category last month?',
  'Am I ready to start investing?',
  'Should I pay down my debt or save more first?',
]

export function AssistantView() {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  // Optimistic user message: shown instantly on send so the UI stays reactive
  // while the edge function does its 5–15s tool loop.
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { data: messages = [], isLoading } = useAssistantMessages(conversationId)
  const ask = useAskAssistant()

  // Filter to displayable messages (user/assistant text — hide tool + intermediate functionCalls).
  const displayed = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ ...m, text: messageText(m) }))
    .filter((m) => !!m.text)

  // Auto-scroll on new messages.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [displayed.length, ask.isPending, pendingUserMessage])

  const send = async (message?: string) => {
    const text = (message ?? draft).trim()
    if (!text || ask.isPending) return
    setDraft('')
    setPendingUserMessage(text)
    try {
      const result = await ask.mutateAsync({ conversationId, message: text })
      setConversationId(result.conversation_id)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('ask failed:', (e as Error).message)
    } finally {
      setPendingUserMessage(null)
    }
  }

  const hasAny = displayed.length > 0 || !!pendingUserMessage || ask.isPending

  const newChat = () => {
    setConversationId(null)
    setDraft('')
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Assistant
            </h1>
            <p className="text-sm text-muted-foreground">
              Ask about your spending, budgets, or projections. Read-only.
            </p>
          </div>
        </div>
        {conversationId && (
          <Button variant="outline" onClick={newChat}>
            New chat
          </Button>
        )}
      </div>

      <Card className="flex-1 overflow-hidden">
        <CardContent className="flex h-full flex-col p-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
            {isLoading && !hasAny ? (
              <p className="text-center text-sm text-muted-foreground">Loading…</p>
            ) : !hasAny ? (
              <EmptyState onPick={send} />
            ) : (
              <div className="flex flex-col gap-4">
                {displayed.map((m) => (
                  <Bubble key={m.id} message={m} />
                ))}
                {pendingUserMessage && (
                  <Bubble
                    message={{
                      id: '__pending__',
                      role: 'user',
                      content: { text: pendingUserMessage },
                      created_at: '',
                      text: pendingUserMessage,
                    }}
                  />
                )}
                {ask.isPending && <TypingBubble />}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Ask about your spending…"
                rows={1}
                className="min-h-[44px] resize-none rounded-2xl"
                disabled={ask.isPending}
              />
              <Button
                onClick={() => send()}
                disabled={ask.isPending || !draft.trim()}
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full"
              >
                <ArrowUp className="h-5 w-5" strokeWidth={2.25} />
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              30 questions per household per day. Answers can be inaccurate — verify anything you act on.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Bubble({ message }: { message: AssistantMessage & { text: string } }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:my-1 prose-p:my-1 prose-p:leading-relaxed prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-strong:font-semibold prose-code:rounded prose-code:bg-white/60 prose-code:px-1 prose-code:py-0 prose-code:text-emerald-700 prose-code:before:content-none prose-code:after:content-none dark:prose-code:bg-slate-900/60 dark:prose-code:text-emerald-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onPick }: { onPick: (message: string) => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
        <Sparkles className="h-7 w-7 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
          Ask anything about your finances
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          I have read-only access to your transactions, budgets, goals, and setup.
        </p>
      </div>
      <div className="grid w-full gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/30"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
