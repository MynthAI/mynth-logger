import { setupLogging } from "../src/index";

const errorFunc = () => {
  throw new Error("An error was thrown");
};

const run = async () => {
  setupLogging();

  console.log("Hello, this is a log");
  console.info("Hello, this is an info log");
  console.debug("Hello, this is a debug log");
  console.warn("Hello, this is a warn log");
  console.error("Hello, this is an error log");

  try {
    errorFunc();
  } catch (error) {
    console.error(error);
  }
};

run();
