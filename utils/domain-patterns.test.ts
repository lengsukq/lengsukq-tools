import { describe, expect, it } from "vitest";

import {
  applyDomainFilter,
  hasAAA,
  hasConsecutiveNumbers,
  hasUniqueDigitCount,
} from "./domain-patterns";

describe("domain patterns", () => {
  it("checks unique digit count", () => {
    expect(hasUniqueDigitCount("112233", 3)).toBe(true);
    expect(hasUniqueDigitCount("112233", 2)).toBe(false);
  });

  it("detects AAA and consecutive numbers", () => {
    expect(hasAAA("ab111cd")).toBe(true);
    expect(hasConsecutiveNumbers("9012")).toBe(true);
    expect(hasConsecutiveNumbers("9753")).toBe(false);
  });

  it("applies filter rules", () => {
    expect(applyDomainFilter("111abc", "AAA")).toBe(true);
    expect(applyDomainFilter("123abc", "AAA")).toBe(false);
  });
});
