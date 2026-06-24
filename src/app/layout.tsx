import type { Metadata, Viewport } from "next";
import Script from "next/script";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
import "./globals.css";
import GlobalLoader from "@/components/ui/GlobalLoader";
import Footer from "@/components/ui/Footer";

export const metadata: Metadata = {
  title: "LetsSplit — Smart Group Expense Manager",
  description: "Split expenses effortlessly with friends. Create groups, track debts, simplify settlements, and manage shared finances with ease.",
  keywords: ["expense splitter", "split bills", "group expenses", "debt tracker", "money management"],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/money-bag.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/money-bag.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    "google-adsense-account": "ca-pub-7359217244297308",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7359217244297308" 
          crossOrigin="anonymous" 
          strategy="afterInteractive"
        />
      </head>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <GlobalLoader />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
