import { setupLogging } from "../src/index.js";

const run = async () => {
  setupLogging();

  console.log("Hello, this is a log");
  console.info("Hello, this is an info log");
  console.debug("Hello, this is a debug log");
  console.warn("Hello, this is a warn log");
  console.error("Hello, this is an error log");
  console.log(
    "This is my seed phrase: ordinary quality amount solid fox guess peasant merit midnight noodle final brown pretty stable six fox beef engage waste uniform evoke flat survey crane",
  );
  console.log(
    "This is my private key: 4fa7614bdd07ab15b11d2365466536ba160c06050ade0888a3aa985a5522ab22",
  );
  console.log(
    "This is log for intent c8adcfef7255ad2c117f68111500997ab66de3c923e9ea9e71aaed5829d0acb8 and private key c99960eaeecb17d77d7c88f440383ccbaf93237471236a739185c0ebd62c5741",
  );

  try {
    throw new Error("An Error was thrown");
  } catch (error) {
    console.error(error);
  }

  try {
    throw "A string was thrown";
  } catch (error) {
    console.error(error);
  }

  try {
    throw 10n;
  } catch (error) {
    console.error("A bigint was thrown:", error);
  }

  try {
    throw { msg: "This is a non-standard error" };
  } catch (error) {
    console.error(error);
  }

  class MyObject {
    constructor(
      public a: string,
      public b: number,
    ) {}
  }

  console.log("This is MyObject", new MyObject("a", 3));
  console.log(new MyObject("without a prefix", 100));

  try {
    // biome-ignore lint/suspicious/noExplicitAny: ok
    throw (MyObject as any)("Error invoking", 1);
  } catch (error) {
    console.error(error);
  }

  try {
    throw new MyObject("This is a custom error", 1);
  } catch (error) {
    console.error(error);
  }

  console.log("This is concatenating an object", {});

  console.log("This is an object with bigint", { name: "bigint", value: 100n });

  console.info("Sending this message to discord", {
    discord: true,
    color: "2404635",
    title: "This is a test",
    webhookUrl: process.env["DISCORD_TEST_WEB_HOOK"],
  });
};

run();
