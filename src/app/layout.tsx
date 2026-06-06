import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LetsSplit — Smart Group Expense Manager",
  description: "Split expenses effortlessly with friends. Create groups, track debts, simplify settlements, and manage shared finances with ease.",
  keywords: ["expense splitter", "split bills", "group expenses", "debt tracker", "money management"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
