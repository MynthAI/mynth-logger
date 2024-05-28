import { createConsola } from "consola";
import DatadogReporter from "./reporters/datadog.js";
import DiscordReporter from "./reporters/discord.js";

const setupLogging = (dev: boolean = false) => {
  const consola = createConsola({ fancy: true });

  if (!dev) consola.setReporters([DatadogReporter]);
  consola.setReporters([DiscordReporter, ...consola.options.reporters]);

  consola.wrapConsole();
  return consola;
};

export { setupLogging };
