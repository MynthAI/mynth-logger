import pino, { Logger, LoggerOptions } from "pino";

type AwaitableLogger = Logger & {
  untilFinished: Promise<void>;
};

enum KnownTransports {
  Discord = "./transports/discord.js",
  Stdout = "./transports/datadog-stdout.js",
}

type Target = {
  target: KnownTransports;
  level: string;
  options: object;
};

type Params = {
  options?: LoggerOptions;
  pretty?: boolean;
  targets?: Target[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatItem = (item: any): string => {
  if (typeof item === "undefined") {
    return "undefined";
  }

  // Remove colors from strings
  if (typeof item === "string") {
    // eslint-disable-next-line no-control-regex
    return item.replace(/\x1b\[[0-9;]*m/g, "");
  }

  let stringified = "";

  try {
    stringified = JSON.stringify(item) || String(item);
  } catch {
    stringified = String(item);
  }

  return stringified.replace(/^'|'$/g, "");
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const format = (items: any[]): string => {
  return Array.from(items)
    .map((item) => formatItem(item))
    .join(" ");
};

const overrideConsole = (logger: Logger) => {
  console.log = function (...args) {
    logger.info(format(Array.from(args)));
  };

  console.info = function (...args) {
    logger.info(format(Array.from(args)));
  };

  console.warn = function (...args) {
    logger.warn(format(Array.from(args)));
  };

  console.error = function (...args) {
    logger.error(format(Array.from(args)));
  };

  console.debug = function (...args) {
    logger.debug(format(Array.from(args)));
  };
};

const setupLogging = (args: Params = {}): AwaitableLogger => {
  const transportTargets = [
    {
      target: KnownTransports.Stdout,
      level: "debug",
      options: { pretty: args.pretty != false },
    },
    ...(args.targets || []),
  ];

  const transport = pino.transport({
    targets: transportTargets,
  });

  const logger = pino(
    args.options || { level: "debug" },
    transport
  ) as AwaitableLogger;
  logger.untilFinished = new Promise<void>((resolve) => {
    transport.on("ready", resolve);
  });

  typeof window === "undefined" && overrideConsole(logger);
  return logger;
};

export { AwaitableLogger, KnownTransports, setupLogging };
