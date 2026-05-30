import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const TESTS_DIR = join(ROOT, "tests");
const E2E_DIR = join(ROOT, "e2e");

const ALLOWED_TEST_ROOTS = new Set(["unit", "component", "integration", "support"]);
const ALLOWED_SUPPORT_ROOTS = new Set(["builders", "fixtures", "mocks", "setup"]);

const UNIT_OR_COMPONENT_TEST = /\.test\.tsx?$/;
const INTEGRATION_TEST = /\.integration\.test\.tsx?$/;
const PLAYWRIGHT_SPEC = /\.spec\.ts$/;
const EXECUTABLE_TEST_FILE = /(?:\.integration)?\.test\.tsx?$|\.spec\.ts$/;

function repoPath(path: string): string {
  return relative(ROOT, path).split(sep).join("/");
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      return statSync(path).isDirectory() ? listFiles(path) : [path];
    })
    .sort();
}

describe("test organization", () => {
  const testFiles = listFiles(TESTS_DIR);

  it("keeps executable test files out of the tests root", () => {
    const looseRootTests = readdirSync(TESTS_DIR)
      .filter((entry) => EXECUTABLE_TEST_FILE.test(entry))
      .map((entry) => `tests/${entry}`);

    expect(looseRootTests).toEqual([]);
  });

  it("uses only the approved top-level tests directories", () => {
    const unexpectedRoots = readdirSync(TESTS_DIR)
      .filter((entry) => statSync(join(TESTS_DIR, entry)).isDirectory())
      .filter((entry) => !ALLOWED_TEST_ROOTS.has(entry));

    expect(unexpectedRoots).toEqual([]);
  });

  it("keeps Vitest test suffixes in their matching layer", () => {
    const misplacedTests = testFiles
      .filter((file) => UNIT_OR_COMPONENT_TEST.test(file) || INTEGRATION_TEST.test(file))
      .filter((file) => {
        const path = repoPath(file);
        const inUnit = path.startsWith("tests/unit/");
        const inComponent = path.startsWith("tests/component/");
        const inIntegration = path.startsWith("tests/integration/");

        if (INTEGRATION_TEST.test(file)) return !inIntegration;
        return !(inUnit || inComponent);
      })
      .map(repoPath);

    expect(misplacedTests).toEqual([]);
  });

  it("keeps Playwright specs out of the Vitest tree", () => {
    const playwrightSpecsInTests = testFiles
      .filter((file) => PLAYWRIGHT_SPEC.test(file))
      .map(repoPath);

    expect(playwrightSpecsInTests).toEqual([]);
  });

  it("keeps shared support modules in named support folders", () => {
    const supportFiles = listFiles(join(TESTS_DIR, "support"));
    const misplacedSupportFiles = supportFiles
      .filter((file) => {
        const [, , supportRoot] = repoPath(file).split("/");
        return !supportRoot || !ALLOWED_SUPPORT_ROOTS.has(supportRoot);
      })
      .map(repoPath);

    expect(misplacedSupportFiles).toEqual([]);
  });

  it("keeps Playwright specs organized by feature outside tests", () => {
    const looseE2eSpecs = listFiles(E2E_DIR)
      .filter((file) => PLAYWRIGHT_SPEC.test(file))
      .filter((file) => repoPath(file).split("/").length < 3)
      .map(repoPath);

    expect(looseE2eSpecs).toEqual([]);
  });
});
