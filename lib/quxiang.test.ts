import { describe, expect, it } from "vitest";

import { parseQuxiangFromLine, parseQuxiangFromText } from "./quxiang";

describe("parseQuxiangFromLine", () => {
  it("parses multiple codes in a single line", () => {
    const line = "领取码为ABC123，稍后领取码为XYZ789";
    const parsed = parseQuxiangFromLine(line);

    expect(parsed).toEqual([
      { rawText: line, code: "ABC123" },
      { rawText: line, code: "XYZ789" },
    ]);
  });
});

describe("parseQuxiangFromText", () => {
  it("deduplicates code and keeps unparsed lines", () => {
    const input = [
      "【西安象非象】领取码为AAA111",
      "没有领取码",
      "领取码为AAA111",
      "领取码为BBB222",
    ].join("\n");

    const result = parseQuxiangFromText(input);

    expect(result.parsed.map((item) => item.code)).toEqual([
      "AAA111",
      "BBB222",
    ]);
    expect(result.unparsedLines).toEqual(["没有领取码"]);
  });
});
