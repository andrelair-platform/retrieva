import { EvaluationDetailPage } from '@/features/evaluations/components/evaluation-detail-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EvaluationDetailPage id={id} />;
}
