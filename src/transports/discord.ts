import build from "pino-abstract-transport";
import axios from "axios";
import { DestinationStream } from "pino";

const invariant: (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  condition: any,
  message: string
) => asserts condition = (condition, message) => {
  if (condition) return;
  throw new Error(message);
};

const cast = (opts: unknown) => {
  invariant(
    opts && typeof opts === "object",
    "Discord transport options must be specified"
  );
  invariant(
    "color" in opts && typeof opts.color === "string",
    "Color must be provided"
  );
  invariant(
    "title" in opts && typeof opts.title === "string",
    "Title must be provided"
  );
  invariant(
    "webhookUrl" in opts && typeof opts.webhookUrl === "string",
    "Webhook URL must be provided"
  );

  return {
    color: opts.color,
    title: opts.title,
    webhookUrl: opts.webhookUrl,
    filter: "filter" in opts ? String(opts.filter) : "",
  };
};

const transport = async (opts: unknown): Promise<DestinationStream> => {
  const options = cast(opts);

  return build(async (source: AsyncIterable<object>) => {
    for await (const log of source) {
      const description = "msg" in log ? String(log.msg) : String(log);

      if (
        !options.filter ||
        (options.filter in log && log[options.filter as keyof typeof log])
      ) {
        await axios.post(options.webhookUrl, {
          embeds: [
            {
              title: options.title,
              description,
              color: options.color,
            },
          ],
        });
      }
    }
  });
};

export default transport;
