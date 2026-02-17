import { beforeAll, describe, expect, it } from "vitest";
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
});
