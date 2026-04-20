import { readFileSync } from "node:fs";
import { join } from "node:path";
import tailwindConfig from "../../tailwind.config.js";
import { describe, expect, it } from "vitest";

describe("field-guide theme configuration", () => {
  it("stores PRD palette and typography in theme.json", () => {
    const themeJson = JSON.parse(
      readFileSync(join(process.cwd(), "theme.json"), "utf-8"),
    );

    expect(themeJson.extend.colors["field-guide"]).toEqual({
      forest: "oklch(0.45 0.09 155)",
      stone: "oklch(0.70 0.01 85)",
      earth: "oklch(0.35 0.04 60)",
      campfire: "oklch(0.68 0.18 50)",
    });
    expect(themeJson.extend.fontFamily.heading[0]).toBe("Space Grotesk");
    expect(themeJson.extend.fontFamily.body[0]).toBe("Source Sans 3");
  });

  it("merges theme.json into Tailwind config without losing default tokens", () => {
    expect(tailwindConfig.theme.extend.colors.neutral).toBeDefined();
    expect(tailwindConfig.theme.extend.colors["field-guide"].forest).toBe(
      "oklch(0.45 0.09 155)",
    );
  });
});
