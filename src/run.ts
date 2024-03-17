import { setupLogging } from "./index.js";

const run = (pretty: boolean = true) => {
  setupLogging({ pretty });
  console.debug("hello world");
};

run();
// Use `run(false)` to disable pino-pretty
// pino-pretty will also be disabled if it's not installed
