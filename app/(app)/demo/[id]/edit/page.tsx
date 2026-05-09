import { InitiativeFormClient } from '@/components/InitiativeFormClient';

export default async function EditInitiativePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <InitiativeFormClient mode="edit" initiativeId={id} />;
}
