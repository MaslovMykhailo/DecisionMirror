import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  const t = useTranslations("Common");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex w-full items-center justify-end gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">{t("appName")}</h1>
      <p className="text-muted-foreground">{t("tagline")}</p>
    </main>
  );
}
