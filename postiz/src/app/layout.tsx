import type { Metadata } from 'next';
import { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Postiz Clone - Social Media Scheduler',
  description: 'A frontend recreation of the Postiz social media scheduling tool',
  icons: { icon: '/favicon.png' },
};

// applies the saved theme before the first paint, so there is no flash
const themeScript = `try{var m=JSON.parse(localStorage.getItem('mode')||'{}');document.body.className=(m.state&&m.state.mode)||'dark'}catch(e){document.body.className='dark'}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={{ ['--font-jakarta' as any]: "'Plus Jakarta Sans'" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,500&display=swap" rel="stylesheet" />
      </head>
      <body className="dark" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
