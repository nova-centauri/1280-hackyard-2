import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Breeze Vibe',
  description: 'Tell it about your house and where it is. It tells you when to open the windows, run the fan, or run the HVAC.',
  metadataBase: new URL('https://breezevibe.site'),
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1f7aec' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
