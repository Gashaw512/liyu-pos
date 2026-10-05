import { redirect } from 'next/navigation'

export default async function ShiftsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/sales`)
}
