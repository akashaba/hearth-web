import { DebtDetailView } from '@/components/debts/debt-detail-view'

// Next 15: dynamic-route params are async.
export default async function DebtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <DebtDetailView id={id} />
}
