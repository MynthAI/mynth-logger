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
});
