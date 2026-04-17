import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: '2d-game-forge Dev Shell',
  description: 'Local portal for running forge games in the browser.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
