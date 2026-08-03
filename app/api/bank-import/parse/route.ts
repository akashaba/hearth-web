import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { SEED_CATEGORIES } from '@/shared/categories'
import { bankParseResponseSchema } from '@/shared/schemas/bank-import'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // seconds — Gemini parse of a multi-page PDF can take a while

// `gemini-flash-latest` auto-tracks the current stable Flash release. The pinned
// `gemini-2.5-flash` name has been retired for new API keys.
const GEMINI_MODEL = 'gemini-flash-latest'
const MAX_BYTES = 8 * 1024 * 1024 // 8MB — most bank statements are well under 2MB

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not set. Add it to .env.local — see .env.local.example.' },
      { status: 500 },
    )
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file field required (multipart/form-data)' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'file must be application/pdf' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `file too large (${(file.size / 1024 / 1024).toFixed(1)}MB, max 8MB)` },
      { status: 400 },
    )
  }

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')

  const categoryNames = SEED_CATEGORIES.map((c) => c.name)

  const systemInstruction = `You extract transactions from bank statement PDFs.

Rules:
- Return one row per transaction on the statement — no rollups, no interest summaries, no opening/closing balance rows.
- Date must be YYYY-MM-DD in the transaction's own year. Use the posted/settle date, not the pending date.
- Amount must be a positive number. Do not include currency symbols. Use "type": "debit" for money out (purchases, withdrawals, fees) and "type": "credit" for money in (deposits, refunds, interest earned).
- Description should be the merchant/payee name as it appears, trimmed of long reference codes when practical.
- For "suggested_category", pick the single best match from this exact list — do NOT invent new categories. If nothing fits well, use "Miscellaneous":
${categoryNames.join(', ')}
- If the PDF is not a bank statement, or contains no transactions, return { "transactions": [] }.
- If a row is ambiguous (e.g. a check with no payee), still include it — the user reviews before saving.`

  const responseSchema = {
    type: 'object',
    properties: {
      statement_period: {
        type: 'object',
        properties: {
          start_date: { type: 'string' },
          end_date: { type: 'string' },
        },
      },
      transactions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            description: { type: 'string' },
            amount: { type: 'number' },
            type: { type: 'string', enum: ['debit', 'credit'] },
            suggested_category: { type: 'string' },
          },
          required: ['date', 'description', 'amount', 'type'],
        },
      },
    },
    required: ['transactions'],
  }

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  let geminiRes: Response
  try {
    geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Extract every transaction from this bank statement.' },
              { inlineData: { mimeType: 'application/pdf', data: base64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.1,
        },
      }),
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to reach Gemini: ' + (e as Error).message },
      { status: 502 },
    )
  }

  if (!geminiRes.ok) {
    const body = await geminiRes.text()
    return NextResponse.json(
      { error: `Gemini responded ${geminiRes.status}: ${body.slice(0, 500)}` },
      { status: 502 },
    )
  }

  const gemJson = (await geminiRes.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    promptFeedback?: unknown
  }
  const text = gemJson.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    return NextResponse.json(
      { error: 'Gemini returned no text', raw: gemJson },
      { status: 502 },
    )
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(text)
  } catch {
    return NextResponse.json(
      { error: 'Gemini returned non-JSON output', raw: text.slice(0, 500) },
      { status: 502 },
    )
  }

  const validated = bankParseResponseSchema.safeParse(parsedJson)
  if (!validated.success) {
    return NextResponse.json(
      { error: 'Gemini output did not match schema', issues: validated.error.issues },
      { status: 502 },
    )
  }

  return NextResponse.json(validated.data)
}
