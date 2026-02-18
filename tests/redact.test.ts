import { describe, expect, it } from "vitest";
import { createRedact } from "../src/redact.js";

describe("redact", () => {
  it("redacts base64url", () => {
    const redact = createRedact({});
    const result = redact(
      "Should base64url-ish V9xRwhrxrgEIJZL8inMMiEC8wDTwrMQye-VxLyBmkH6vbeTGNNBCjqkbtnUIA_dIVh3d data",
    );
    expect(result).toBe("Should base64url-ish [REDACTED] data");
  });
});
