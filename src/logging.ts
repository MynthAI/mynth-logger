import { createConsola, ConsolaOptions } from "consola";
import DatadogReporter from "./reporters/datadog.js";
import DiscordReporter, { DiscordWebhookUrl } from "./reporters/discord.js";

const setupLogging = (discordWebhookUrl?: DiscordWebhookUrl) => {
  const consola = createConsola({ fancy: true, level: 5 } as Options);

  if (process.env.NODE_ENV === "production")
    consola.setReporters([DatadogReporter]);

  // Set Discord reporter as first so it can remove
  // Discord-related config before other reporters process the
  // log
  consola.setReporters([
    DiscordReporter(discordWebhookUrl),
    ...consola.options.reporters,
  ]);

  consola.wrapConsole();
  return consola;
};

type Options = ConsolaOptions & { fancy?: boolean };

export { setupLogging };
