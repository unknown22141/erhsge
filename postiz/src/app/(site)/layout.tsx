import { ReactNode } from 'react';
import { Providers } from '@/components/layout/providers';
import { LayoutComponent } from '@/components/layout/layout.component';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <LayoutComponent>{children}</LayoutComponent>
    </Providers>
  );
}
