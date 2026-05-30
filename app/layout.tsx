import { Figtree, Inter } from "next/font/google";
import type { Metadata } from "next";

import { PostHogProvider } from "@/components/observability/posthog-provider";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "Decision Mirror",
  description: "A private decision journal that reflects your choices back to you.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${figtree.variable}`}>
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        <ThemeProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
