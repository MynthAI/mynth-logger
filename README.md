# Mynth Logger

Mynth Logger is a configurable logging utility designed with a
dual-purpose approach to log management, ensuring that developers have
access to easily readable, colorful logs during the development process,
while also supporting structured, JSON-formatted logs in production
environments. The core aim of Mynth Logger is to provide a seamless
logging experience across different stages of the application lifecycle,
enhancing both development efficiency and operational monitoring.

## Key Features

**Dual-Environment Support**: Mynth Logger distinguishes between
development and production environments, optimizing log output for each.
During development, logs are presented in a human-friendly, colorful
format for ease of reading. In production, logs are structured as JSON
to support parsing and analysis by log forwarders and processors like
Datadog.

**Integration Ease**: Implementing Mynth Logger into services is
straightforward, allowing developers to continue using `console.log`
statements without worrying about environment-specific log formatting.

**Improved Observability**: With JSON-formatted logs in production,
Mynth Logger facilitates better log management practices, making it
easier to forward logs to platforms like Datadog for monitoring,
analysis, and alerting.

## Getting Started

**Add Mynth Logger to your project**:

``` bash
npm install mynth-logger
```

### Usage

**Import and set up logging** in your entrypoint script:

``` typescript
import { setupLogging } from "mynth-logger";

// Call this function early in your application startup
setupLogging();
```

**Use `console.log` as usual**. The Mynth Logger takes care of
formatting the logs appropriately based on the environment:

``` typescript
console.log('This is a log message');
```

In **development** (when NODE\_ENV isn’t set to `production`), you’ll
see colorful logs in the terminal.

In **production** (when NODE\_ENV is set to `production`), logs will be
output in JSON format to stdout.

## Configuration

No additional configuration is required to start using Mynth Logger.

## Redacting Sensitive Data

Mynth Logger automatically redacts values that look like secrets before
they are written to logs. The following patterns are detected and
replaced with `[REDACTED]`:

- **Hex strings** — 16+ hex characters (optionally `0x`-prefixed)
- **Base64 blobs** — standard Base64-encoded payloads
- **Base64url blobs** — URL-safe Base64-encoded payloads
- **Base58 blobs** — Base58-encoded strings (e.g. Solana addresses)
- **BIP39 mnemonics** — 12–24 word seed phrases validated against the
  BIP39 word list

### Using `setupLogging` with a redaction config

Pass a `RedactConfig` object to `setupLogging` to customize redaction:

``` typescript
import { setupLogging } from "mynth-logger";

setupLogging({
  hex: {
    allow: [{ re: /\b(event|transfer)\b/i }],
  },
});
```

Any hex string that appears directly after the word `event` or
`transfer` will **not** be redacted; everything else will be.

### Creating an allowlist

An allowlist is a set of **context rules** attached to a detector. A
context rule tells the logger: *"if the text surrounding this match
looks like X, leave it alone."*

Each rule has the following shape:

``` typescript
{
  re: RegExp;     // regex tested against the surrounding text
  before?: number; // chars to include before the match (default: 10)
  after?: number;  // chars to include after the match  (default: 0)
}
```

When `re` matches the surrounding context, the value is **not**
redacted.

**Example — allow a known transaction hash:**

``` typescript
import { setupLogging } from "mynth-logger";

setupLogging({
  hex: {
    allow: [
      // Keep hex values that are preceded by the word "intent"
      { re: /\b(intent)\b/i, before: 10 },
    ],
  },
});

// This hex is NOT redacted because "intent" appears before it:
console.log("intent b3c1c51b70cd602cc9a5f76d3795b6eca27a89f884ba8977b604451333393530");

// This hex IS redacted because no allow-rule matches:
console.log("private key: 9f4613930bc9d4ad3b2d838d79af0763538b2cee70083b281e2868f4632920b0");
```

You can define allow rules for any of the five detectors
(`hex`, `base64`, `base64url`, `base58`, `mnemonic`):

``` typescript
setupLogging({
  hex:      { allow: [{ re: /\b(event)\b/i }] },
  base58:   { allow: [{ re: /\b(address)\b/i }] },
  mnemonic: { allow: [{ re: /\b(test-phrase)\b/i }] },
});
```

### Using `REDACT_CONFIG`

You can also supply a redaction config via the `REDACT_CONFIG`
environment variable. This is useful when you need to configure
redaction without changing application code (e.g. via a deployment
secret).

The value must be a **Base64-encoded JSON** string. Regex patterns are
expressed as `{ re: string, flags?: string }` objects instead of
`RegExp` literals.

**Step 1 — Build the JSON config:**

``` json
{
  "hex": {
    "allow": [
      { "re": "\\b(event)\\b", "flags": "i" }
    ]
  }
}
```

**Step 2 — Base64-encode it:**

``` bash
echo -n '{"hex":{"allow":[{"re":"\\b(event)\\b","flags":"i"}]}}' | base64
```

**Step 3 — Set the environment variable:**

``` bash
export REDACT_CONFIG="eyJoZXgiOnsiYWxsb3ciOlt7InJlIjoiXFxiKGV2ZW50KVxcYiIsImZsYWdzIjoiaSJ9XX19"
```

When both `setupLogging` config and `REDACT_CONFIG` are provided, their
allow rules are **merged**: a match is kept if *either* source allows it.

## Discord

To send a message to Discord:

``` typescript
console.info("Sending this message to discord", {
  discord: true,
  color: "2404635",
  title: "This is a test",
  webhookUrl,
});
```

A valid Discord webhook URL needs to be passed in as a parameter. This
will be used to send the message to Discord, but it won’t be outputted
to the logs.
