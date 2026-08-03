import { DebtDetailView } from '@/components/debts/debt-detail-view'

export default function DebtDetailPage({ params }: { params: { id: string } }) {
  return <DebtDetailView id={params.id} />
}
