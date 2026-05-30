import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Figtree, Inter } from "next/font/google";
import type { Metadata } from "next";

import { PostHogProvider } from "@/components/observability/posthog-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { routing } from "@/lib/i18n/routing";

import "../globals.css";

// Body family (Preply-inspired "PreplyInter" look-alike). Self-hosted by
// next/font — no render-blocking request, no uncontrolled FOUT.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

// Display/heading family (Preply-inspired "Platform"/Figtree look-alike).
const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "Decision Mirror",
  description: "A private decision journal that reflects your choices back to you.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${figtree.variable}`}
    >
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        <ThemeProvider>
          <PostHogProvider>
            <NextIntlClientProvider>{children}</NextIntlClientProvider>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
