import test from "ava";
import { AwaitableLogger, setupLogging } from "../src/index";

let logger: AwaitableLogger | undefined;

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

test.before(() => {
  logger = setupLogging({ pretty: "TEST_PRETTY" in process.env });
});

test.afterEach(async () => {
  await sleep(100);
  logger && (await logger.untilFinished);
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
