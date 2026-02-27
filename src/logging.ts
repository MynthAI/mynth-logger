import { createConsola } from "consola";
import { updateConfig } from "./format.js";
import {
  mergeRedactConfigs,
  parseEnvRedactConfig,
  type RedactConfig,
} from "./redact.js";
import DatadogReporter from "./reporters/datadog.js";
import DiscordReporter from "./reporters/discord.js";

const setupLogging = (config: RedactConfig = {}) => {
  updateConfig(mergeRedactConfigs(config, parseEnvRedactConfig()));
  const consola = createConsola({ fancy: true, level: 5 });

  // Set Discord reporter as first so it can remove
  // Discord-related config before other reporters process the
  // log
  if (process.env.NODE_ENV === "production")
    consola.setReporters([DiscordReporter, DatadogReporter]);
  else consola.setReporters([DiscordReporter, ...consola.options.reporters]);

  consola.wrapConsole();
  return consola;
};

export { setupLogging };
