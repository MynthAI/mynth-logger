import { createConsola, LogObject, LogLevel } from "consola";
import { format } from "src/format.js";
import { type } from "arktype";
import axios from "axios";
import axiosRetry, { exponentialDelay } from "axios-retry";

const Discord = type({
  discord: type("boolean").narrow((v) => v),
  color: "string",
  title: "string",
  webhookUrl: "string",
});

type Discord = typeof Discord.infer;

const NullDiscord = { discord: false } as const;
type NullDiscord = typeof NullDiscord;

const getDiscord = (args: unknown[]): [Discord | NullDiscord, unknown[]] => {
  for (let i = 0; i < args.length; i++) {
    const discord = Discord(args[i]);
    if (discord instanceof type.errors) continue;

    return [discord, args.filter((_, j) => j !== i)];
  }

  return [NullDiscord, args];
};

const levelMap: Record<LogLevel, string> = {
  0: "error",
  1: "warn",
  2: "info",
  3: "info",
  4: "debug",
  5: "debug",
};

const sendToDiscord = async (description: string, options: Discord) => {
  const axiosInstance = axios.create();
  axiosRetry(axiosInstance, {
    retries: 3,
    retryDelay: exponentialDelay,
  });

  try {
    await axiosInstance.post(options.webhookUrl, {
      embeds: [
        {
          title: options.title,
          description,
          color: options.color,
        },
      ],
    });
  } catch (error) {
    console.error("Unable to send message to Discord", error);
  }
};

const setupLogging = (dev: boolean = false) => {
  const consola = createConsola({ fancy: true });
  const jsonReporter = {
    log: (logObj: LogObject) => {
      const message = JSON.stringify({
        level: levelMap[logObj.level] || "debug",
        message: format(logObj.args),
      });
      process.stdout.write(`${message}\n`);
    },
  };

  const discordReporter = {
    log: (logObj: LogObject) => {
      const [discord, args] = getDiscord(logObj.args);
      if (!discord.discord) return;

      sendToDiscord(format(args), discord);

      // Filter Discord data before the other reporters
      // process the message
      logObj.args = args;
    },
  };

  if (!dev) consola.setReporters([jsonReporter]);
  consola.setReporters([discordReporter, ...consola.options.reporters]);

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

  console.info("Sending this message to discord", {
    discord: true,
    color: "2404635",
    title: "This is a test",
    webhookUrl: process.env["DISCORD_TEST_WEB_HOOK"],
  });
};

run();
