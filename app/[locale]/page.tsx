import { BarChart3, History } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { LogoutButton } from "@/components/auth/logout-button";
import { CreateDecisionForm } from "@/components/decisions/create-decision-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";
import { Link } from "@/lib/i18n/navigation";

export default function Home() {
  const t = useTranslations("Common");
  const navT = useTranslations("Nav");
  const locale = useLocale();

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1">
            <p className="font-heading text-xl font-semibold">{t("appName")}</p>
            <p className="text-muted-foreground max-w-xl text-sm">{t("tagline")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/analytics">
                <BarChart3 />
                {navT("dashboard")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/decisions">
                <History />
                {navT("history")}
              </Link>
            </Button>
            <LanguageSwitcher />
            <ThemeToggle />
            <LogoutButton action={logoutAction} redirectTo={`/${locale}/login`} />
          </div>
        </header>

        <section className="w-full max-w-2xl">
          <CreateDecisionForm />
        </section>
      </div>
    </main>
  );
}
