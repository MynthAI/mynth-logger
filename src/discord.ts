import { ConfigureDiscord, Discord } from "./reporters/discord.js";
import { type } from "arktype";

enum color {
  green = "2404635",
  red = "11606811",
}
const green = color.green;

const log = (
  level: "debug" | "info" | "log" | "error",
  color: color | string,
  title: string,
  message: string
) => {
  const settings: Discord = {
    color,
    discord: true,
    title,
  };
  console[level](message, settings);
};

const discord = {
  configure: (webhookUrl: string) => {
    type("string.url").assert(webhookUrl);
    const settings: ConfigureDiscord = {
      discord: true,
      setWebhookUrl: webhookUrl,
    };
    console.debug(settings);
  },
  debug: (title: string, message: string, color: color | string = green) =>
    log("debug", color, title, message),
  error: (title: string, message: string, color: color | string = green) =>
    log("error", color, title, message),
  info: (title: string, message: string, color: color | string = green) =>
    log("info", color, title, message),
  log: (title: string, message: string, color: color | string = green) =>
    log("log", color, title, message),
};

export { color, discord };
