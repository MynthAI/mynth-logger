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

  it("redacts hex and base64url in same string", () => {
    const redact = createRedact({});
    const result = redact(
      "Should redact private key (b49bd63e67e2cd11aba17befead483934939df828cb833a846c58661726d3b00) and API key (djOqmjzVb0GAGdqS0p0NtiEwvb6u1lx509JEkpDJLgnvMhmOMtBc9vqolpktd1OK7Xas)",
    );
    expect(result).toBe(
      "Should redact private key ([REDACTED]) and API key ([REDACTED])",
    );
  });
});
