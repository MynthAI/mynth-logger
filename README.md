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
