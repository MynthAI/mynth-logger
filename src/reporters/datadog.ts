import { LogObject, LogLevel } from "consola";
import { format } from "../format.js";

const levelMap: Record<LogLevel, string> = {
  0: "error",
  1: "warn",
  2: "info",
  3: "info",
  4: "debug",
  5: "debug",
};

const Reporter = {
  log: (logObj: LogObject) => {
    const message = JSON.stringify({
      level: levelMap[logObj.level] || "debug",
      message: format(logObj.args),
    });
    process.stdout.write(`${message}\n`);
  },
};

export default Reporter;
