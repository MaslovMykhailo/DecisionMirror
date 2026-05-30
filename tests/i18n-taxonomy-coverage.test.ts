import { describe, expect, it } from "vitest";

import { COGNITIVE_BIASES, DECISION_CATEGORIES } from "@/lib/taxonomy";
import en from "@/messages/en.json";
import uk from "@/messages/uk.json";

const catalogs = { en, uk } as const;

describe("controlled-taxonomy label coverage", () => {
  for (const [locale, messages] of Object.entries(catalogs)) {
    describe(`${locale} catalog`, () => {
      it("has a non-empty label for every decision category", () => {
        for (const id of DECISION_CATEGORIES) {
          const label = messages.Taxonomy.category[id];
          expect(label, `missing category label "${id}" in ${locale}`).toBeTruthy();
        }
      });

      it("has a non-empty label for all eight cognitive biases", () => {
        expect(COGNITIVE_BIASES).toHaveLength(8);
        for (const id of COGNITIVE_BIASES) {
          const label = messages.Taxonomy.bias[id];
          expect(label, `missing bias label "${id}" in ${locale}`).toBeTruthy();
        }
      });
    });
  }
});
