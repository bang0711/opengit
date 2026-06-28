import { describe, expect, it } from "vitest";
import { langFromPath } from "@/lib/highlight";

describe("langFromPath", () => {
  it("maps known extensions to Prism languages", () => {
    expect(langFromPath("src/x.ts")).toBe("typescript");
    expect(langFromPath("src/app/page.tsx")).toBe("tsx");
    expect(langFromPath("a/b.js")).toBe("javascript");
    expect(langFromPath("style.css")).toBe("css");
    expect(langFromPath("data.json")).toBe("json");
  });

  it("is case-insensitive on the extension", () => {
    expect(langFromPath("README.MD")).toBe("markdown");
  });

  it("returns undefined for unknown or extensionless paths", () => {
    expect(langFromPath("foo.unknownext")).toBeUndefined();
    expect(langFromPath("Makefile")).toBeUndefined();
  });
});
