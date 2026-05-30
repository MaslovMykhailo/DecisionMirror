import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Decision Mirror",
  description: "A private decision journal that reflects your choices back to you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen antialiased">{children}</body>
    </html>
  );
}
