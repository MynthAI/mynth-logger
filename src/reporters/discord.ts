import { LogObject } from "consola";
import { format } from "../format.js";
import { type } from "arktype";
import got from "got";

const Discord = type({
  discord: "true",
  color: "string",
  title: "string",
  "webhookUrl?": "string.url",
});

const ConfigureDiscord = type({
  discord: "true",
  setWebhookUrl: "string.url",
});

type Discord = typeof Discord.infer;

const NullDiscord = { discord: false } as const;

type NullDiscord = typeof NullDiscord;

const Reporter = {
  webhookUrl: "",
  log: (logObj: LogObject) => {
    const [discord, args] = getDiscord(logObj.args);
    if (!discord.discord) return;

    const webhookUrl = discord.webhookUrl || Reporter.webhookUrl;

    if (!webhookUrl) {
      console.error("Discord webhook URL is missing");
      return;
    }

    sendToDiscord(format(args), discord, webhookUrl);

    // Filter Discord data before the other reporters
    // process the message
    logObj.args = args;
  },
};

const getDiscord = (args: unknown[]): [Discord | NullDiscord, unknown[]] => {
  for (let i = 0; i < args.length; i++) {
    const config = ConfigureDiscord(args[i]);

    if (!(config instanceof type.errors)) {
      Reporter.webhookUrl = config.setWebhookUrl;
      continue;
    }

    const discord = Discord(args[i]);
    if (discord instanceof type.errors) continue;

    return [discord, args.filter((_, j) => j !== i)];
  }

  return [NullDiscord, args];
};

const sendToDiscord = async (
  description: string,
  options: Discord,
  webhookUrl: string
) => {
  const data = {
    json: {
      embeds: [
        {
          title: options.title,
          description,
          color: options.color,
        },
      ],
    },
    retry: { limit: 5 },
  };

  try {
    await got.post(webhookUrl, data);
  } catch (error) {
    console.error("Unable to send message to Discord", error);
  }
};

export default Reporter;
