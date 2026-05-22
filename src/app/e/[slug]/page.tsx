import { redirect } from 'next/navigation';
import { eventsDb } from '@/lib/db';

export default async function SlugRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await eventsDb.getBySlug(slug);
  if (!event) redirect('/');
  redirect(`/event/${event.id}`);
}
