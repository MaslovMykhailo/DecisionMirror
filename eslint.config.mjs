import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
      "lib/db/generated/**",
      "prisma/migrations/**",
    ],
  },
  ...nextCoreWebVitals,
  prettier,
];

export default eslintConfig;
