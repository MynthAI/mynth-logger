import { DeepRedact } from "@hackylabs/deep-redact/index.ts";

/**
 * Create a redactor that censors things that *look like secrets* inside strings:
 * - long hex (optionally 0x-prefixed)
 * - long base64 blobs
 * - long base58 blobs
 * - mnemonic seed phrases (heuristic; tries to avoid redacting normal sentences)
 *
 * Returns a function `redactSecrets(text)` you can run on log lines, errors, etc.
 */
export const createSecretStringRedactor = (opts?: {
  replacement?: string;
}): ((text: string) => string) => {
  const replacement = opts?.replacement ?? "[REDACTED]";

  // Generic replacer: redact ALL matches within the string.
  const replaceAllMatches = (value: string, pattern: RegExp) =>
    value.replace(pattern, replacement);

  // --- Patterns ---
  // 1) Hex secrets (API keys, hashes, tokens)
  //    - 32+ hex chars (optionally 0x)
  //    - word boundaries help avoid eating normal words
  const HEX = /\b(?:0x)?[a-fA-F0-9]{32,}\b/g;

  // 2) Base64 blobs (JWT parts, keys, encoded payloads)
  //    - requires a decent minimum length to reduce false positives
  //    - supports optional padding
  const BASE64 =
    /\b(?:[A-Za-z0-9+/]{4}){8,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\b/g;

  // 3) Base58 blobs (common in crypto keys/ids)
  //    - base58 alphabet excludes 0, O, I, l
  //    - require 32+ chars to reduce false positives
  const BASE58 = /\b[1-9A-HJ-NP-Za-km-z]{32,}\b/g;

  // 4) Mnemonic seed phrases (heuristic)
  //    Regex-only detection is imperfect without the BIP39 wordlist.
  //    Strategy:
  //      A) Strong signal: a nearby keyword ("seed", "mnemonic", "recovery phrase")
  //      B) Or the phrase is quoted/bracketed (often how people paste it)
  //
  //    - 12 to 24 lowercase-ish words (3–8 chars) separated by spaces
  //    - kept fairly strict to reduce “normal paragraph” matches
  const WORD = "[a-z]{3,8}";
  const PHRASE_12_TO_24 = `(?:${WORD}\\s){11,23}${WORD}`;

  const MNEMONIC_WITH_KEYWORD = new RegExp(
    // keyword then up to ~40 chars (like ":" or whitespace) then the phrase
    String.raw`\b(?:mnemonic|seed|recovery\s+phrase|secret\s+phrase)\b[\s:=-]{0,40}(${PHRASE_12_TO_24})\b`,
    "gi",
  );

  const MNEMONIC_QUOTED = new RegExp(
    // quoted/bracketed phrase alone
    String.raw`(?:["'(\[])\s*(${PHRASE_12_TO_24})\s*(?:["')\]])`,
    "g",
  );

  const redactor = new DeepRedact({
    // stringTests runs regex checks against string values (including flat strings)
    // and lets us partially redact via replacer. :contentReference[oaicite:1]{index=1}
    stringTests: [
      { pattern: HEX, replacer: replaceAllMatches },
      { pattern: BASE64, replacer: replaceAllMatches },
      { pattern: BASE58, replacer: replaceAllMatches },
      { pattern: MNEMONIC_WITH_KEYWORD, replacer: replaceAllMatches },
      { pattern: MNEMONIC_QUOTED, replacer: replaceAllMatches },
    ],
    replacement,
    // serialise mainly matters for objects; keeping it false avoids surprises.
    serialise: false,
  });

  return (text: string) => redactor.redact(text) as string;
};

// Convenience: one-liner function if you don’t need multiple instances
export const redactSecrets = createSecretStringRedactor();
