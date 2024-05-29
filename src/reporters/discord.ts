import { LogObject } from "consola";
import { format } from "../format.js";
import { type } from "arktype";
import axios from "axios";
import axiosRetry, { exponentialDelay } from "axios-retry";

console.trace(type);

const Discord = type({
  discord: type("boolean").narrow((v) => v),
  color: "string",
  title: "string",
  webhookUrl: "string",
});

type Discord = typeof Discord.infer;

const NullDiscord = { discord: false } as const;

type NullDiscord = typeof NullDiscord;

const Reporter = {
  log: (logObj: LogObject) => {
    const [discord, args] = getDiscord(logObj.args);
    if (!discord.discord) return;

    sendToDiscord(format(args), discord);

    // Filter Discord data before the other reporters
    // process the message
    logObj.args = args;
  },
};

const getDiscord = (args: unknown[]): [Discord | NullDiscord, unknown[]] => {
  for (let i = 0; i < args.length; i++) {
    const discord = Discord(args[i]);
    if (discord instanceof type.errors) continue;

    return [discord, args.filter((_, j) => j !== i)];
  }

  return [NullDiscord, args];
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

export default Reporter;
