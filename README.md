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

**For local development**, install `pino-pretty` to enable colorful log
output:

``` bash
npm install --save-dev pino-pretty
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

In **development**, you’ll see colorful logs in the terminal.

In **production**, logs will be output in JSON format to stdout.

## Configuration

No additional configuration is required to start using Mynth Logger.
However, you can customize the behavior of the logging by passing
options to `setupLogging()` as needed.
