import { stringify } from "@ungap/structured-clone/json";
import { type } from "arktype";
import { createRedact, type RedactConfig } from "./redact.js";

const config = {
  redact: createRedact({}),
};

const updateConfig = (newConfig: RedactConfig) => {
  config.redact = createRedact(newConfig);
};

const ErrorType = type({
  message: "string",
  "stack?": "string",
});

const itemToString = (item: unknown): string => {
  if (typeof item === "undefined") return "undefined";

  // Remove colors from strings
  if (typeof item === "string")
    // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape codes
    return item.replace(/\x1b\[[0-9;]*m/g, "");

  // Check if this is an Error
  const error = ErrorType(item);
  if (!(error instanceof type.errors)) return error.stack || error.message;

  const stringified = (() => {
    try {
      return stringify(item);
    } catch {
      return String(item);
    }
  })();

  return stringified.replace(/^'|'$/g, "");
};

const format = (items: unknown[]): string =>
  config.redact(Array.from(items).map(itemToString).join(" "));

export { format, updateConfig };
