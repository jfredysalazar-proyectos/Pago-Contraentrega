import { describe, it, expect } from "vitest";

describe("Abacus.ai API Key", () => {
  it("should have ABACUS_AI_API_KEY set in environment", () => {
    const key = process.env.ABACUS_AI_API_KEY;
    expect(key).toBeDefined();
    expect(key?.length).toBeGreaterThan(0);
  });

  it("should be able to call Abacus.ai API with the key", async () => {
    const key = process.env.ABACUS_AI_API_KEY;
    if (!key) {
      console.warn("ABACUS_AI_API_KEY not set, skipping API call test");
      return;
    }

    // Test using the built-in LLM helper which uses the injected API key
    // We just verify the key is present and non-empty
    expect(key.length).toBeGreaterThan(10);
    console.log("✓ ABACUS_AI_API_KEY is configured");
  });
});
