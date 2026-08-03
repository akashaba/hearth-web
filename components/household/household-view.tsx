'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Copy, Crown, User, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCurrentHousehold } from '@/lib/hooks/use-current-household'
import { useHouseholdMembers } from '@/lib/hooks/use-household-members'
import {
  useAcceptInvite,
  useGenerateInvite,
  usePendingInvites,
} from '@/lib/hooks/use-invites'
import { formatDate } from '@/shared/format'
import { cn } from '@/lib/utils'

export function HouseholdView() {
  const { user } = useUser()
  const { data: household } = useCurrentHousehold()
  const { data: members = [] } = useHouseholdMembers(household?.id)
  const { data: pending = [] } = usePendingInvites(household?.id)
  const generate = useGenerateInvite()
  const accept = useAcceptInvite()

  const [code, setCode] = useState('')
  const currentUserId = user?.id
  const isOwner = household?.owner_user_id === currentUserId

  const onGenerate = async () => {
    if (!household) return
    try {
      const c = await generate.mutateAsync(household.id)
      toast.success(`Invite code ${c} generated — expires in 7 days`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const onAccept = async () => {
    const c = code.trim().toUpperCase()
    if (c.length !== 6) return toast.error('Enter the 6-character code')
    try {
      const hh = await accept.mutateAsync(c)
      toast.success(`Joined "${hh.name}"`)
      setCode('')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const copyCode = async (c: string) => {
    try {
      await navigator.clipboard.writeText(c)
      toast.success('Code copied')
    } catch {
      /* clipboard may be blocked in insecure contexts */
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Household
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share this workspace with a partner or roommate. Everyone sees the same balance, budgets, and transactions.
        </p>
      </div>

      {/* Current household + members */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
              <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            </div>
            <CardTitle className="text-lg">{household?.name ?? 'Loading…'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Members ({members.length})
          </p>
          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  {m.role === 'owner' ? (
                    <Crown className="h-4 w-4 text-amber-600" strokeWidth={2} />
                  ) : (
                    <User className="h-4 w-4 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {m.user_id === currentUserId ? 'You' : maskUserId(m.user_id)}
                    {m.role === 'owner' && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                        Owner
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Joined {formatDate(m.joined_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invite someone (owner only) */}
      {isOwner && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                <UserPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
              </div>
              <CardTitle className="text-lg">Invite someone</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Generate a code, share it with your partner. They enter it on their app to join.
            </p>
            <Button className="mt-4" onClick={onGenerate} disabled={generate.isPending}>
              {generate.isPending ? 'Generating…' : 'Generate invite code'}
            </Button>

            {pending.length > 0 && (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Pending ({pending.length})
                </p>
                <div className="mt-2 space-y-2">
                  {pending.map((inv) => (
                    <div
                      key={inv.code}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div>
                        <div className="font-mono text-lg font-semibold tracking-widest text-slate-900 dark:text-slate-50">
                          {inv.code}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Expires {formatDate(inv.expires_at)}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => copyCode(inv.code)}>
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        Copy
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Join a household */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Join a household</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Got a code from someone? Enter it to join their household. Your current
            {' '}
            <em>empty</em>
            {' '}
            household (if any) is deleted when you join a real one.
          </p>
          <div className="mt-4 flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCDEF"
              maxLength={6}
              className={cn(
                'font-mono text-lg tracking-widest',
                code.length === 6 && 'border-emerald-500',
              )}
            />
            <Button onClick={onAccept} disabled={accept.isPending || code.trim().length !== 6}>
              {accept.isPending ? 'Joining…' : 'Join'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function maskUserId(userId: string): string {
  // user_2H3... → user_2H3…YFY
  if (userId.length <= 12) return userId
  return `${userId.slice(0, 8)}…${userId.slice(-4)}`
}
