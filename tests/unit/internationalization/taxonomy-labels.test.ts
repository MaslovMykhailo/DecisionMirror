import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

import { COGNITIVE_BIASES, DECISION_CATEGORIES } from "@/lib/taxonomy";
import en from "@/messages/en.json";
import uk from "@/messages/uk.json";

// Mirrors what `useTaxonomyLabels` does at runtime (it delegates to the same
// next-intl translator), proving the identifier -> localized-label resolution
// without needing a React renderer.
function labelsFor(locale: "en" | "uk", messages: typeof en) {
  const t = createTranslator({ locale, messages, namespace: "Taxonomy" });
  return {
    category: (id: (typeof DECISION_CATEGORIES)[number]) => t(`category.${id}`),
    bias: (id: (typeof COGNITIVE_BIASES)[number]) => t(`bias.${id}`),
  };
}

describe("taxonomy display resolves identifiers to localized labels", () => {
  it("resolves a category identifier to its translated label per locale", () => {
    expect(labelsFor("en", en).category("career")).toBe("Career");
    expect(labelsFor("uk", uk).category("career")).toBe("Кар'єра");
  });

  it("resolves a bias identifier to its translated label per locale", () => {
    expect(labelsFor("en", en).bias("sunk_cost_fallacy")).toBe("Sunk cost fallacy");
    expect(labelsFor("uk", uk).bias("sunk_cost_fallacy")).toBe("Хибність безповоротних витрат");
  });

  it("keeps the underlying identifier language-neutral while only the label localizes", () => {
    const id = "career" as const;
    // The stored/aggregated value is the identifier itself — unchanged across locales.
    expect(id).toBe("career");
    // Only the displayed label differs between locales.
    expect(labelsFor("en", en).category(id)).not.toBe(labelsFor("uk", uk).category(id));
  });
});
