import build from "pino-abstract-transport";
import { DestinationStream } from "pino";

const loadPretty = async () => {
  try {
    return await import("pino-pretty");
  } catch {
    return null;
  }
};

const isPrettyDisabled = (opts: unknown) => {
  return opts && typeof opts === "object" && "pretty" in opts && !opts.pretty;
};

const transport = async (opts: unknown): Promise<DestinationStream> => {
  if (!isPrettyDisabled(opts)) {
    const pretty = await loadPretty();
    if (pretty)
      return pretty.default({ colorize: true, ignore: "pid,time,hostname" });
  }

  return build(async (source: AsyncIterable<object>) => {
    for await (const log of source) {
      const level = "level" in log ? String(log.level) : "error";
      const msg = "msg" in log ? String(log.msg) : String(log);

      process.stdout.write(`${JSON.stringify({ level, msg })}\n`);
    }
  });
};

export default transport;
