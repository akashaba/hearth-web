'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAccounts, useCreateAccount } from '@/lib/hooks/use-accounts'
import { toast } from 'sonner'

type Props = {
  value: string | undefined
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
  placeholder?: string
}

export function AccountPicker({ value, onChange, disabled, id, placeholder = 'Select account' }: Props) {
  const { data: accounts = [], isLoading } = useAccounts()
  const create = useCreateAccount()
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const submitNew = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      const acct = await create.mutateAsync(name)
      onChange(acct.id)
      setNewName('')
      setOpen(false)
      toast.success(`Account "${acct.name}" added`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === '__new__') {
            setOpen(true)
            return
          }
          onChange(v)
        }}
        disabled={disabled || isLoading}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
          {accounts.length > 0 && <SelectSeparator />}
          <SelectItem value="__new__">
            <span className="flex items-center gap-2 text-primary">
              <Plus className="h-4 w-4" /> New account
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New account</DialogTitle>
            <DialogDescription>e.g. Checking, Savings, Credit Card</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="acct-name">Name</Label>
            <Input
              id="acct-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submitNew()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitNew} disabled={create.isPending || !newName.trim()}>
              {create.isPending ? 'Adding…' : 'Add account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
