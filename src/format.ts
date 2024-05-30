import { stringify } from "@ungap/structured-clone/json";
import { type } from "arktype";

const ErrorType = type({
  message: "string",
  "stack?": "string",
});

const formatItem = (item: unknown): string => {
  if (typeof item === "undefined") {
    return "undefined";
  }

  // Remove colors from strings
  if (typeof item === "string") {
    // eslint-disable-next-line no-control-regex
    return item.replace(/\x1b\[[0-9;]*m/g, "");
  }

  // Check if this is an Error
  const error = ErrorType(item);
  if (!(error instanceof type.errors)) return `${error.message};${error.stack}`;

  // Check if this is a string
  if (typeof item === "string") return item;

  const stringified = (() => {
    try {
      return stringify(item);
    } catch {
      return String(item);
    }
  })();

  return stringified.replace(/^'|'$/g, "");
};

const format = (items: unknown[]): string => {
  return Array.from(items)
    .map((item) => formatItem(item))
    .join(" ");
};

export { format };
