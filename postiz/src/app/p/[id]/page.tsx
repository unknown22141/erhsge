import { Providers } from '@/components/layout/providers';
import { PreviewPage } from '@/components/preview/preview.page';

export const metadata = { title: 'Postiz Preview' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Providers>
      <PreviewPage id={id} />
    </Providers>
  );
}
