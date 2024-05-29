import { createConsola } from "consola";
import DatadogReporter from "./reporters/datadog.js";
import DiscordReporter from "./reporters/discord.js";

const setupLogging = () => {
  const consola = createConsola({ fancy: true, level: 5 });

  if (process.env.NODE_ENV === "production")
    consola.setReporters([DatadogReporter]);
  consola.setReporters([DiscordReporter, ...consola.options.reporters]);

  consola.wrapConsole();
  return consola;
};

export { setupLogging };
