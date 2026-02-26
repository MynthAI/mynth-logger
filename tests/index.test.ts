import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { format } from "../src/format.js";
import { setupLogging } from "../src/index.js";

beforeAll(() => {
  setupLogging();
});

describe("logging", () => {
  it("logs display to terminal", () => {
    console.debug("Hello vitest");
    expect(true).toBe(true);
  });

  it("can log various objects", () => {
    console.debug("Message", { message: true });
    console.debug(undefined);
    console.debug("bigint", 100n);
    console.debug(false, true, "true", "false");
    expect(true).toBe(true);
  });

  it("redacts private key", () => {
    console.info(
      "a723cc20646a45cccd045b4bd13c0f73e505e6fc7f0c5006ab62e0410a2ef9ba",
    );
    expect(true).toBe(true);
  });

  it("redacts secret inside Error message and stack", () => {
    const secret =
      "78a2fca7a36abb167ecff613ce75cde8b4c04ef4579651f182a8cef9c86b00b5";
    const result = format([new Error(`this will be redacted ${secret}`)]);
    expect(result).not.toContain(secret);
    expect(result).toContain("[REDACTED]");
  });

  it("allows hex when context word is in a separate argument", () => {
    setupLogging({ hex: { allow: [{ re: /\b(transfer)\b/i }] } });
    const result = format([
      "transfer",
      "538845bf2f418e0c7f3798d6bcb632273d46633545a5e261feceb7d378ed0761",
    ]);
    expect(result).toBe(
      "transfer 538845bf2f418e0c7f3798d6bcb632273d46633545a5e261feceb7d378ed0761",
    );
  });

  afterEach(() => {
    setupLogging();
  });
});
