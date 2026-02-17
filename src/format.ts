import { stringify } from "@ungap/structured-clone/json";
import { type } from "arktype";
import { redact } from "./redact.js";

const ErrorType = type({
  message: "string",
  "stack?": "string",
});

const formatItem = (item: unknown): string => {
  if (typeof item === "undefined") return "undefined";

  // Remove colors from strings
  if (typeof item === "string")
    // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape codes
    return redact(item.replace(/\x1b\[[0-9;]*m/g, ""));

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

  return redact(stringified.replace(/^'|'$/g, ""));
};

const format = (items: unknown[]): string =>
  Array.from(items)
    .map((item) => formatItem(item))
    .join(" ");

export { format };
