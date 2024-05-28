import test from "ava";
import { setupLogging } from "../src/index";

test.before(() => {
  setupLogging();
});

test.serial("logs display to terminal", (t) => {
  console.debug("Hello ava");
  t.pass();
});

test.serial("can log various objects", (t) => {
  console.debug("Message", { message: true });
  console.debug(undefined);
  console.debug("bigint", 100n);
  console.debug(false, true, "true", "false");
  t.pass();
});
