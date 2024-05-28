import { createConsola, LogObject } from "consola";
import { format } from "src/logging";

const setupLogging = (dev: boolean = false) => {
  const consola = createConsola({ fancy: true });
  const jsonReporter = {
    log: (logObj: LogObject) => {
      const message = JSON.stringify({
        level: logObj.level,
        message: format(logObj.args),
      });
      process.stdout.write(`${message}\n`);
    },
  };

  if (!dev) consola.setReporters([jsonReporter]);

  consola.wrapConsole();
  return consola;
};

const run = async () => {
  setupLogging();

  console.log("Hello, this is a log");
  console.info("Hello, this is an info log");
  console.debug("Hello, this is a debug log");
  console.warn("Hello, this is a warn log");
  console.error("Hello, this is an error log");

  try {
    throw new Error("An Error was thrown");
  } catch (error) {
    console.error(error);
  }

  try {
    throw "A string was thrown";
  } catch (error) {
    console.error(error);
  }

  try {
    throw 10n;
  } catch (error) {
    console.error("A bigint was thrown:", error);
  }

  try {
    throw { msg: "This is a non-standard error" };
  } catch (error) {
    console.error(error);
  }

  class MyObject {
    constructor(
      public a: string,
      public b: number
    ) {}
  }

  console.log("This is MyObject", new MyObject("a", 3));
  console.log(new MyObject("without a prefix", 100));

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throw (MyObject as any)("Error invoking", 1);
  } catch (error) {
    console.error(error);
  }

  try {
    throw new MyObject("This is a custom error", 1);
  } catch (error) {
    console.error(error);
  }

  console.log("This is concatenating an object", {});

  console.log("This is an object with bigint", { name: "bigint", value: 100n });
};

run();
