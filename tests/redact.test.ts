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

  it("allows whitelist each time", () => {
    const redact = createRedact({ hex: { allow: [{ re: /\b(event)\b/i }] } });
    for (let i = 0; i < 10; i++) {
      const result = redact(
        "Pushed event fcc6533b59301096a973b8be3e6518f0cd13f73a9821de558cca77ac9b014d6e.1771865100000",
      );
      expect(result).toBe(
        "Pushed event fcc6533b59301096a973b8be3e6518f0cd13f73a9821de558cca77ac9b014d6e.1771865100000",
      );
    }
  });

  it("redacts multiple hex in same string", () => {
    const redact = createRedact({});
    const result = redact(
      "Pushed event fcc6533b59301096a973b8be3e6518f0cd13f73a9821de558cca77ac9b014d6e.1561338e25f9b57a9babc7ad57a0e0ee0b13a7094a895319883c7daf4a869642 with key d13821711360de832b80be20507912cebe123ebe52240ae91e6a699b72beb26a",
    );
    expect(result).toBe(
      "Pushed event [REDACTED].[REDACTED] with key [REDACTED]",
    );
  });

  it("redacts only once with allowlist", () => {
    const redact = createRedact({
      hex: { allow: [{ re: /\b(intent)\b/i }] },
    });
    const result = redact(
      `This is an intent b3c1c51b70cd602cc9a5f76d3795b6eca27a89f884ba8977b604451333393530 but this is a private key: 9f4613930bc9d4ad3b2d838d79af0763538b2cee70083b281e2868f4632920b0`,
    );
    expect(result).toBe(
      `This is an intent b3c1c51b70cd602cc9a5f76d3795b6eca27a89f884ba8977b604451333393530 but this is a private key: [REDACTED]`,
    );
  });
});
