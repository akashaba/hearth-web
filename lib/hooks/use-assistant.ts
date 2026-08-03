'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/lib/supabase/browser'
import { useAuthedQuery } from './use-authed-query'
import { qk } from '@/lib/query/keys'

export type AssistantMessage = {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: {
    text?: string
    parts?: Array<{ text?: string; functionCall?: unknown; functionResponse?: unknown }>
    functionCall?: unknown
    functionResponse?: unknown
  }
  created_at: string
}

/** Extract displayable text from either shape (flat `text` or inside `parts`). */
export function messageText(m: AssistantMessage): string {
  if (m.content.text) return m.content.text
  const parts = m.content.parts ?? []
  return parts
    .map((p) => (p as { text?: string }).text ?? '')
    .filter(Boolean)
    .join('')
}

export function useAssistantMessages(conversationId: string | null) {
  const supabase = useSupabase()
  return useAuthedQuery<AssistantMessage[]>({
    queryKey: qk.assistantConversation(conversationId ?? '__none__'),
    queryFn: async () => {
      if (!conversationId) return []
      const { data, error } = await supabase
        .from('assistant_messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at')
      if (error) throw error
      return (data ?? []) as AssistantMessage[]
    },
    enabled: !!conversationId,
  })
}

export function useAskAssistant() {
  const supabase = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { conversationId: string | null; message: string }) => {
      const { data, error } = await supabase.functions.invoke('ask', {
        body: { conversation_id: input.conversationId, message: input.message },
      })
      if (error) {
        let detail = error.message
        const ctx = (error as { context?: Response | { body?: unknown } }).context
        if (ctx) {
          try {
            if (ctx instanceof Response) {
              detail = `${error.message} — ${await ctx.text()}`
            } else if ((ctx as { body?: unknown }).body) {
              const body = (ctx as { body: unknown }).body
              const text =
                typeof body === 'string' ? body : await new Response(body as BodyInit).text()
              detail = `${error.message} — ${text}`
            }
          } catch {
            /* ignore */
          }
        }
        throw new Error(detail)
      }
      return data as { conversation_id: string; text: string }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.assistantConversation(data.conversation_id) })
    },
  })
}
