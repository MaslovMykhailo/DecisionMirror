import { useTranslations } from "next-intl";

import { AppNav } from "@/components/app-nav";
import { CreateDecisionForm } from "@/components/decisions/create-decision-form";

export default function Home() {
  const t = useTranslations("Common");

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <AppNav />

        <section className="grid w-full max-w-2xl gap-6">
          <p className="text-muted-foreground max-w-xl text-sm">{t("tagline")}</p>
          <CreateDecisionForm />
        </section>
      </div>
    </main>
  );
}
