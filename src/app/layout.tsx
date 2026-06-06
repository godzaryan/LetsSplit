import type { Metadata } from "next";
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
      { url: '/money-bag.svg', type: 'image/svg+xml' },
      { url: '/money-bag.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/money-bag.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
