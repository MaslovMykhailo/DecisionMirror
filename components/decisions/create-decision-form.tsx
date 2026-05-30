"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { createDecisionInputSchema, type CreateDecisionData } from "@/lib/decisions/validation";

type CreateDecisionFieldErrors = Partial<Record<keyof CreateDecisionData, string[]>>;
type SubmitState = "idle" | "pending" | "success" | "error";

type CreateDecisionResponse =
  | {
      status: "success";
      decisionId: string;
      analysisId: string;
    }
  | {
      status: "validation_error";
      fieldErrors: CreateDecisionFieldErrors;
    }
  | {
      status: "unauthenticated";
    };

const errorMessageKeys = {
  situation_required: "errors.situation_required",
  decision_required: "errors.decision_required",
} as const;

function fieldErrorMessages(
  errors: string[] | undefined,
  translate: ReturnType<typeof useTranslations>,
) {
  return (
    errors?.map((code) =>
      translate(errorMessageKeys[code as keyof typeof errorMessageKeys] ?? "error"),
    ) ?? []
  );
}

export function CreateDecisionForm() {
  const t = useTranslations("DecisionCapture");
  const [fieldErrors, setFieldErrors] = useState<CreateDecisionFieldErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const parsed = createDecisionInputSchema.safeParse(Object.fromEntries(new FormData(form)));

    if (!parsed.success) {
      setSubmitState("idle");
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    setSubmitState("pending");

    try {
      const response = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as CreateDecisionResponse;

      if (!response.ok || result.status !== "success") {
        setSubmitState("error");
        setFieldErrors(result.status === "validation_error" ? result.fieldErrors : {});
        return;
      }

      form.reset();
      setSubmitState("success");
    } catch {
      setSubmitState("error");
    }
  }

  const pending = submitState === "pending";
  const situationErrors = fieldErrorMessages(fieldErrors.situation, t);
  const decisionErrors = fieldErrorMessages(fieldErrors.decision, t);
  const reasoningErrors = fieldErrorMessages(fieldErrors.reasoning, t);

  return (
    <form onSubmit={handleSubmit} noValidate className="grid w-full gap-5 text-left">
      <div className="grid gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
      </div>

      {submitState === "success" ? (
        <p
          aria-live="polite"
          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {t("success")}
        </p>
      ) : null}

      {submitState === "error" ? (
        <p
          aria-live="polite"
          className="text-destructive border-destructive/30 rounded-md border px-3 py-2 text-sm"
        >
          {t("error")}
        </p>
      ) : null}

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="decision-situation">
          {t("situation")}
        </label>
        <textarea
          id="decision-situation"
          name="situation"
          rows={4}
          aria-invalid={situationErrors.length > 0}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive min-h-28 resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
        />
        {situationErrors.map((error) => (
          <p key={error} className="text-destructive text-sm">
            {error}
          </p>
        ))}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="decision-decision">
          {t("decision")}
        </label>
        <textarea
          id="decision-decision"
          name="decision"
          rows={3}
          aria-invalid={decisionErrors.length > 0}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive min-h-24 resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
        />
        {decisionErrors.map((error) => (
          <p key={error} className="text-destructive text-sm">
            {error}
          </p>
        ))}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="decision-reasoning">
          {t("reasoning")} <span className="text-muted-foreground">({t("reasoningOptional")})</span>
        </label>
        <textarea
          id="decision-reasoning"
          name="reasoning"
          rows={3}
          aria-invalid={reasoningErrors.length > 0}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive min-h-24 resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
        />
        {reasoningErrors.map((error) => (
          <p key={error} className="text-destructive text-sm">
            {error}
          </p>
        ))}
      </div>

      <Button type="submit" disabled={pending}>
        <Save />
        {pending ? t("pending") : t("submit")}
      </Button>
    </form>
  );
}
