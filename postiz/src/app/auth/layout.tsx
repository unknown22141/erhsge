import { ReactNode } from 'react';
import { AuthLayout } from '@/components/auth/auth';

export default function Layout({ children }: { children: ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
