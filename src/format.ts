import { DeepRedact } from "@hackylabs/deep-redact/index.ts";
import { stringify } from "@ungap/structured-clone/json";
import { type } from "arktype";

const ErrorType = type({
  message: "string",
  "stack?": "string",
});

const stripAnsi = (s: string) =>
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape codes
  s.replace(/\x1b\[[0-9;]*m/g, "");

const replaceAll = (pattern: RegExp, replacement: string) => (value: string) =>
  value.replace(pattern, replacement);

const redactKeyValuePairs = (value: string) =>
  value
    // Bearer tokens
    .replace(/\b(Bearer)\s+([A-Za-z0-9\-._~+/]+=*)/gi, "$1 [REDACTED]")
    // Basic auth header payload
    .replace(/\b(Basic)\s+([A-Za-z0-9+/=]+)\b/gi, "$1 [REDACTED]")
    // URL user:pass@
    .replace(
      /\/\/([^/:\s]+):([^@/\s]+)@/g,
      (_m, user) => `//${user}:[REDACTED]@`,
    )
    // query params that commonly hold secrets
    .replace(
      /([?&](?:api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|token|auth|authorization|signature|sig|key|secret|password)=)([^&]+)/gi,
      "$1[REDACTED]",
    )
    // generic key=value / key: value
    .replace(
      /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|token|secret|password|passwd|pwd|private[_-]?key|seed(_|-)?phrase|mnemonic)\b\s*([:=])\s*([^\s'"]+)/gi,
      (_m, k, sep) => `${k}${sep} [REDACTED]`,
    );

// Heuristic: likely a seed phrase (12/15/18/21/24 words), especially if labeled
const redactSeedPhrasesInText = (text: string) => {
  // Label-based (strong signal)
  const labeled =
    /(mnemonic|seed\s*phrase|recovery\s*phrase|secret\s*phrase)\s*[:=]\s*([a-zA-Z]+(?:\s+[a-zA-Z]+){11,23})/gi;
  text = text.replace(
    labeled,
    (_m, label) => `${label}: [REDACTED_SEED_PHRASE]`,
  );

  // Unlabeled heuristic (weaker, but requested “broad”): redact *only* if it looks like
  // a standalone phrase (line-ish) with common word counts.
  const counts = new Set([12, 15, 18, 21, 24]);
  return text.replace(
    /(^|[\n\r\t ])([a-z]+(?: [a-z]+){11,23})(?=($|[\n\r\t ]))/g,
    (m, lead: string, phrase: string) => {
      const words = phrase.trim().split(/\s+/);
      if (!counts.has(words.length)) return m;
      // extra guard to reduce false positives: average word length in typical mnemonics is small-ish
      const avgLen = words.reduce((a, w) => a + w.length, 0) / words.length;
      if (avgLen < 3 || avgLen > 8) return m;
      return `${lead}[REDACTED_SEED_PHRASE]`;
    },
  );
};

const redactor = new DeepRedact({
  serialise: false,
  retainStructure: true,

  caseSensitiveKeyMatch: false,
  fuzzyKeyMatch: true,

  replacement: "[REDACTED]",

  blacklistedKeys: [
    // common secrets
    "password",
    "passwd",
    "pwd",
    "pass",
    "secret",
    "clientSecret",
    "privateKey",
    "apiKey",
    "apikey",
    "accessKey",
    "access_key",
    "accessToken",
    "access_token",
    "refreshToken",
    "refresh_token",
    "idToken",
    "id_token",
    "token",
    "authorization",
    "auth",
    "cookie",
    "set-cookie",
    "session",
    "sessionid",
    "session_id",

    // seed phrases / mnemonics
    "mnemonic",
    "seedPhrase",
    "seed_phrase",
    "recoveryPhrase",
    "recovery_phrase",

    // headers / env-ish
    "x-api-key",
    "x-api-token",
    "x-auth-token",

    // regex patterns for “key-like” fields
    {
      key: /(^|[_-])(api[_-]?key|token|secret|pass(word)?|passwd|pwd|private[_-]?key|auth(orization)?|cookie|session|mnemonic|seed(_|-)?phrase|recovery(_|-)?phrase)([_-]|$)/i,
    },
  ],

  stringTests: [
    // PEM private keys (RSA/EC/DSA/OPENSSH and generic)
    {
      pattern:
        /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
      replacer: replaceAll(
        /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
        "[REDACTED_PRIVATE_KEY]",
      ),
    },

    // JWTs
    {
      pattern:
        /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
      replacer: () => "[REDACTED_JWT]",
    },

    // Ethereum private key (32 bytes hex; often with 0x)
    {
      pattern:
        /(^|[^a-fA-F0-9])(0x[a-fA-F0-9]{64}|[a-fA-F0-9]{64})(?![a-fA-F0-9])/g,
      replacer: (value) =>
        value.replace(
          /0x[a-fA-F0-9]{64}|[a-fA-F0-9]{64}/g,
          "[REDACTED_ETH_PRIVATE_KEY]",
        ),
    },

    // “64-bit hex strings” (16 hex chars) + other long hex blobs commonly used as secrets.
    // (This is intentionally broad; remove if too noisy.)
    {
      pattern: /\b(?:0x)?[a-fA-F0-9]{16}\b/g,
      replacer: () => "[REDACTED_HEX]",
    },
    {
      // long hex (>=32) often secrets, hashes, or keys
      pattern: /\b(?:0x)?[a-fA-F0-9]{32,}\b/g,
      replacer: () => "[REDACTED_HEX_LONG]",
    },

    // Solana secret key as base58 string (commonly ~88 chars when encoding 64 bytes)
    {
      pattern: /\b[1-9A-HJ-NP-Za-km-z]{80,90}\b/g,
      replacer: () => "[REDACTED_SOLANA_SECRET_KEY]",
    },

    // Solana keypair JSON array (64 bytes): [12,34,...] (very common in keypair files)
    {
      pattern: /\[(\s*\d{1,3}\s*,){63}\s*\d{1,3}\s*\]/g,
      replacer: () => "[REDACTED_SOLANA_SECRET_KEY_ARRAY]",
    },

    // Seed phrase / mnemonic (labeled + heuristic)
    {
      pattern:
        /(mnemonic|seed\s*phrase|recovery\s*phrase|secret\s*phrase)\s*[:=]\s*[a-zA-Z]+(?:\s+[a-zA-Z]+){11,23}|(^|[\n\r\t ])[a-z]+(?: [a-z]+){11,23}(?=($|[\n\r\t ]))/gim,
      replacer: (value) => redactSeedPhrasesInText(value),
    },

    // Generic redaction in strings (headers, urls, k/v pairs)
    {
      pattern:
        /\b(Bearer|Basic)\s+[A-Za-z0-9\-._~+/]+=*|\b(api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|token|secret|password|passwd|pwd|private[_-]?key|seed(_|-)?phrase|mnemonic)\b\s*[:=]\s*[^\s'"]+|\/\/[^/:\s]+:[^@/\s]+@|[?&](?:api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|token|auth|authorization|signature|sig|key|secret|password)=[^&]+/gi,
      replacer: (value) => redactKeyValuePairs(redactSeedPhrasesInText(value)),
    },
  ],
});

const redactUnknown = (value: unknown): unknown => {
  try {
    return redactor.redact(value);
  } catch {
    try {
      const asText = typeof value === "string" ? value : stringify(value);
      return redactor.redact(asText);
    } catch {
      return "[UNSERIALIZABLE]";
    }
  }
};

const formatItem = (item: unknown): string => {
  if (typeof item === "undefined") return "undefined";

  if (typeof item === "string") {
    const cleaned = redactSeedPhrasesInText(stripAnsi(item));
    const redacted = redactUnknown(cleaned);
    return typeof redacted === "string" ? redacted : String(redacted);
  }

  const error = ErrorType(item);
  if (!(error instanceof type.errors)) {
    const msg = redactSeedPhrasesInText(
      stripAnsi(error.stack || error.message),
    );
    const redacted = redactUnknown(msg);
    return typeof redacted === "string" ? redacted : String(redacted);
  }

  const redacted = redactUnknown(item);
  const stringified = (() => {
    try {
      return stringify(redacted);
    } catch {
      return String(redacted);
    }
  })();

  return redactSeedPhrasesInText(stringified).replace(/^'|'$/g, "");
};

const format = (items: unknown[]): string =>
  Array.from(items)
    .map((item) => formatItem(item))
    .join(" ");

export { format };
