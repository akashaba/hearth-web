'use client'

import { useRef, useState } from 'react'
import { FileText, Upload } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  onSelected: (file: File) => void
  disabled?: boolean
}

export function UploadView({ onSelected, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<File | null>(null)

  const accept = (file: File) => {
    if (file.type !== 'application/pdf') return
    setSelected(file)
    onSelected(file)
  }

  return (
    <Card>
      <CardContent className="p-8">
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors',
            dragging
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
              : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40',
          )}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file) accept(file)
          }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            {selected ? (
              <FileText className="h-6 w-6 text-emerald-700 dark:text-emerald-300" strokeWidth={1.75} />
            ) : (
              <Upload className="h-6 w-6 text-emerald-700 dark:text-emerald-300" strokeWidth={1.75} />
            )}
          </div>
          <div className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
            {selected ? selected.name : 'Drop your bank statement PDF here'}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {selected
              ? `${(selected.size / 1024).toFixed(0)} KB · Ready to parse`
              : 'or click below to pick one from your computer'}
          </div>
          <div className="mt-6">
            <Button
              type="button"
              variant={selected ? 'outline' : 'default'}
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              {selected ? 'Pick a different file' : 'Choose PDF'}
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) accept(file)
              // Reset so re-picking the same file re-triggers onChange
              if (inputRef.current) inputRef.current.value = ''
            }}
          />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          The PDF stays on our server only long enough to extract transactions via Gemini —
          it isn&apos;t stored. Your API key stays server-side.
        </p>
      </CardContent>
    </Card>
  )
}
