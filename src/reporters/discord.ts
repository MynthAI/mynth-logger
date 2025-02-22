import { LogObject } from "consola";
import { format } from "../format.js";
import { type } from "arktype";
import got from "got";

const DiscordWebhookUrl = type("string.url");
type DiscordWebhookUrl = typeof DiscordWebhookUrl.infer;

const Discord = type({
  discord: type("boolean").narrow((v) => v),
  color: "string",
  title: "string",
  "webhookUrl?": DiscordWebhookUrl,
});

type Discord = typeof Discord.infer;

const NullDiscord = { discord: false } as const;

type NullDiscord = typeof NullDiscord;

const Reporter = ($discordWebhookUrl?: DiscordWebhookUrl) => {
  if ($discordWebhookUrl) DiscordWebhookUrl.assert($discordWebhookUrl);

  return {
    log: (logObj: LogObject) => {
      const [discord, args] = getDiscord(logObj.args);
      if (!discord.discord) return;

      const discordWebhookUrl = discord.webhookUrl || $discordWebhookUrl;

      if (!discordWebhookUrl) {
        console.error(
          "Unable to send message to Discord because webhook URL is missing"
        );
        return;
      }

      sendToDiscord(format(args), discord, discordWebhookUrl);

      // Filter Discord data before the other reporters
      // process the message
      logObj.args = args;
    },
  };
};

const getDiscord = (args: unknown[]): [Discord | NullDiscord, unknown[]] => {
  for (let i = 0; i < args.length; i++) {
    const discord = Discord(args[i]);
    if (discord instanceof type.errors) continue;

    return [discord, args.filter((_, j) => j !== i)];
  }

  return [NullDiscord, args];
};

const sendToDiscord = async (
  description: string,
  options: Discord,
  webhookUrl: DiscordWebhookUrl
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
export { DiscordWebhookUrl };
