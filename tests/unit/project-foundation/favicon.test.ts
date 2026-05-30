import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const faviconRoute = join(ROOT, "app", "favicon.ico", "route.ts");
const faviconFile = join(ROOT, "app", "favicon.ico");

function readIco(): Buffer {
  expect(existsSync(faviconFile), "app/favicon.ico should be a real ICO file").toBe(true);
  expect(statSync(faviconFile).isFile(), "app/favicon.ico should not be a route directory").toBe(
    true,
  );
  return readFileSync(faviconFile);
}

describe("application favicon", () => {
  it("uses the Next.js root favicon file convention instead of a route handler", () => {
    expect(existsSync(faviconRoute)).toBe(false);
  });

  it("stores a decodable ICO payload for /favicon.ico", () => {
    const bytes = readIco();

    expect(bytes.readUInt16LE(0)).toBe(0);
    expect(bytes.readUInt16LE(2)).toBe(1);

    const imageCount = bytes.readUInt16LE(4);
    expect(imageCount).toBeGreaterThan(0);

    const firstImageSize = bytes.readUInt32LE(14);
    const firstImageOffset = bytes.readUInt32LE(18);
    expect(firstImageOffset).toBeGreaterThanOrEqual(22);
    expect(firstImageOffset + firstImageSize).toBeLessThanOrEqual(bytes.length);
    expect(bytes.subarray(0, 5).toString("utf8")).not.toBe("<svg ");
  });
});
