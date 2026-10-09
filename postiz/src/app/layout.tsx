import type { Metadata } from 'next';
import { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Postiz - Social Media Scheduler',
  description: 'A frontend recreation of the Postiz social media scheduling tool',
  icons: { icon: '/favicon.png' },
};

// Some browser extensions (Bitdefender, Avast...) add attributes like bis_skin_checked
// to every div before React starts, which shows up as a hydration error. Remove them.
const extensionScript = `(function(){var a=['bis_skin_checked','bis_register','__processed_'];function c(n){if(n.nodeType!==1)return;for(var i=0;i<a.length;i++){if(n.hasAttribute&&n.hasAttribute(a[i]))n.removeAttribute(a[i])}}var o=new MutationObserver(function(m){for(var i=0;i<m.length;i++){c(m[i].target);var l=m[i].addedNodes;if(l)for(var j=0;j<l.length;j++){c(l[j]);if(l[j].querySelectorAll){var q=l[j].querySelectorAll('[bis_skin_checked],[bis_register]');for(var k=0;k<q.length;k++)c(q[k])}}}});o.observe(document.documentElement,{attributes:true,childList:true,subtree:true,attributeFilter:a});setTimeout(function(){o.disconnect()},10000)})();`;

// applies the saved theme before the first paint, so there is no flash
const themeScript = `try{var m=JSON.parse(localStorage.getItem('mode')||'{}');document.body.className=(m.state&&m.state.mode)||'dark'}catch(e){document.body.className='dark'}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning style={{ ['--font-jakarta' as any]: "'Plus Jakarta Sans'" }}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: extensionScript }} />
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
