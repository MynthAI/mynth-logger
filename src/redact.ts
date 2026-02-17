import { DeepRedact } from "@hackylabs/deep-redact/index.ts";
import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

const replacement = "[REDACTED]";

/**
 * Create a redactor that censors things that *look like secrets* inside
 * strings:
 * - long hex (optionally 0x-prefixed)
 * - long base64 blobs
 * - long base58 blobs
 * - mnemonic seed phrases (validated via BIP39 english wordlist)
 */

// Generic replacer: redact ALL matches within the string.
const replaceAllMatches = (value: string, pattern: RegExp) =>
  value.replace(pattern, replacement);

// Mnemonic replacer: only redact if the captured phrase is a valid BIP39 mnemonic.
const replaceBip39MnemonicMatches = (value: string, pattern: RegExp) =>
  value.replace(pattern, (match: string, phrase: string) => {
    // Normalize spacing; validateMnemonic expects words separated by single spaces
    const normalized = phrase.trim().toLowerCase().replace(/\s+/g, " ");
    if (!validateMnemonic(normalized, wordlist)) return match;
    return match.replace(phrase, replacement);
  });

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

// 4) Mnemonic seed phrases
//    Strategy stays the same as before, but we now validate candidates with @scure/bip39.
//    - 12 to 24 lowercase-ish words (2–8 chars) separated by spaces
const WORD = "[a-z]{2,8}";
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
  // and lets us partially redact via replacer.
  stringTests: [
    { pattern: HEX, replacer: replaceAllMatches },
    { pattern: BASE64, replacer: replaceAllMatches },
    { pattern: BASE58, replacer: replaceAllMatches },
    { pattern: MNEMONIC_WITH_KEYWORD, replacer: replaceBip39MnemonicMatches },
    { pattern: MNEMONIC_QUOTED, replacer: replaceBip39MnemonicMatches },
  ],
  replacement,
  // serialise mainly matters for objects; keeping it false avoids surprises.
  serialise: false,
});

const redact = (text: string) => redactor.redact(text) as string;

export { redact };
