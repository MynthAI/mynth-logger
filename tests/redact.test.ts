import { describe, expect, it } from "vitest";
import { createRedact } from "../src/redact.js";

describe("redact", () => {
  it("redacts Discord URL", () => {
    const redact = createRedact({});
    const result = redact(
      "Should redact Discord (https://discord.com/api/webhooks/1473664170267246593/V9xRwhrxrgEIJZL8inMMiEC8wDTwrMQye-VxLyBmkH6vbeTGNNBCjqkbtnUIA_dIVh3d) URL",
    );
    expect(result).toBe(
      "Should redact Discord (https://discord.com/api/webhooks/[REDACTED]/[REDACTED]) URL",
    );
  });
});
