import { DeepRedact } from "@hackylabs/deep-redact/index.ts";
import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

/**
 * Configurable redaction for strings that *look like secrets*:
 * - hex (optionally 0x-prefixed)
 * - base64 blobs
 * - base64url blobs
 * - base58 blobs
 * - BIP39 mnemonics (validated)
 *
 * Key idea:
 * Each detector can be given "allow" context rules that prevent redaction when
 * extra surrounding context indicates the value is safe/expected.
 */

type ContextRule = {
  /**
   * Test this regex against a slice of the input around the match.
   * If it matches, the match is NOT redacted.
   */
  re: RegExp;
  /** How many chars to include before the match when building the slice. */
  before?: number; // default 10
  /** How many chars to include after the match when building the slice. */
  after?: number; // default 0
};

type DetectorConfig = {
  /**
   * Any rule match => do not redact that specific match.
   */
  allow?: ContextRule[];
};

type RedactConfig = {
  hex?: DetectorConfig;
  base64?: DetectorConfig;
  base64url?: DetectorConfig;
  base58?: DetectorConfig;
  mnemonic?: DetectorConfig;
};

const replacement = "[REDACTED]";

const cloneRegex = (re: RegExp): RegExp => {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  return new RegExp(re.source, flags);
};

const sliceAround = (
  value: string,
  offset: number,
  matchLen: number,
  rule: ContextRule,
) => {
  const before = rule.before ?? 10;
  const after = rule.after ?? 0;

  const start = Math.max(0, offset - before);
  const end = Math.min(value.length, offset + matchLen + after);
  return value.slice(start, end);
};

const shouldAllowByRules = (
  value: string,
  match: string,
  offset: number,
  rules?: ContextRule[],
): boolean => {
  if (!rules?.length) return false;
  for (const rule of rules) {
    const chunk = sliceAround(value, offset, match.length, rule);

    // If a consumer provides a /g or /y regex, .test() mutates lastIndex.
    // Reset to ensure consistent behavior.
    rule.re.lastIndex = 0;

    if (rule.re.test(chunk)) return true;
  }
  return false;
};

type ReplaceMeta = {
  offset: number;
  whole: string;
};

const getReplaceMeta = (args: unknown[]): ReplaceMeta | null => {
  const offset = args.at(-2);
  const whole = args.at(-1);
  if (typeof offset !== "number") return null;
  if (typeof whole !== "string") return null;
  return { offset, whole };
};

const replaceAllMatchesWithContext = (
  value: string,
  pattern: RegExp,
  replacement: string,
  allow?: ContextRule[],
) => {
  const re = cloneRegex(pattern);
  return value.replace(re, (...args: unknown[]) => {
    const match = args[0];
    if (typeof match !== "string") return replacement;

    const meta = getReplaceMeta(args);
    if (!meta) return replacement;

    if (shouldAllowByRules(meta.whole, match, meta.offset, allow)) return match;
    return replacement;
  });
};

/**
 * BIP39 contextual replacer:
 * - Only redacts if the captured phrase validates as a BIP39 mnemonic
 * - Still supports allow-rules (to suppress redaction in “safe” contexts)
 */
const replaceBip39MnemonicMatchesWithContext = (
  value: string,
  pattern: RegExp,
  replacement: string,
  allow?: ContextRule[],
) => {
  const re = cloneRegex(pattern);
  return value.replace(re, (...args: unknown[]) => {
    const match = args[0];
    const phrase = args[1];

    if (typeof match !== "string") return replacement;
    if (typeof phrase !== "string") return match;

    const meta = getReplaceMeta(args);
    if (!meta) return match;

    if (shouldAllowByRules(meta.whole, match, meta.offset, allow)) return match;

    const normalized = phrase.trim().toLowerCase().replace(/\s+/g, " ");
    if (!validateMnemonic(normalized, wordlist)) return match;

    return match.replace(phrase, replacement);
  });
};

const createRedactor = (config: RedactConfig = {}) => {
  const HEX_MIN_LEN = 16;
  const BASE64_MIN_BLOCKS = 4;
  const BASE58_MIN_LEN = 16;

  const HEX = new RegExp(
    String.raw`(?<![a-fA-F0-9])(?:0x)?[a-fA-F0-9]{${HEX_MIN_LEN},}(?![a-fA-F0-9])`,
    "g",
  );
  const hexAllow: ContextRule[] = config.hex?.allow ?? [];

  const BASE64 = new RegExp(
    String.raw`(?<![A-Za-z0-9+/=])(?:[A-Za-z0-9+/]{4}){${BASE64_MIN_BLOCKS},}(?:[A-Za-z0-9+/]{2,3})?(?:={0,2})(?![A-Za-z0-9+/=])`,
    "g",
  );
  const base64Allow = config.base64?.allow ?? [];

  const BASE64URL = new RegExp(
    String.raw`(?<![A-Za-z0-9\-_])[A-Za-z0-9\-_]{16,}(?:={0,2})?(?![A-Za-z0-9\-_])`,
    "g",
  );
  const base64urlAllow = config.base64url?.allow ?? [];

  const BASE58 = new RegExp(
    String.raw`(?<![1-9A-HJ-NP-Za-km-z])[1-9A-HJ-NP-Za-km-z]{${BASE58_MIN_LEN},}(?![1-9A-HJ-NP-Za-km-z])`,
    "g",
  );
  const base58Allow = config.base58?.allow ?? [];

  const WORD = "[a-zA-Z]{2,8}";
  const PHRASE_12_TO_24 = `(?:${WORD}\\s+){11,23}${WORD}`;
  const MNEMONIC = new RegExp(
    String.raw`(?<![A-Za-z])(${PHRASE_12_TO_24})(?![A-Za-z])`,
    "gi",
  );
  const mnemonicAllow = config.mnemonic?.allow ?? [];

  const stringTests: Array<{
    pattern: RegExp;
    replacer: (v: string, p: RegExp) => string;
  }> = [
    {
      pattern: HEX,
      replacer: (v, p) =>
        replaceAllMatchesWithContext(v, p, replacement, hexAllow),
    },
    {
      pattern: BASE64URL,
      replacer: (v, p) =>
        replaceAllMatchesWithContext(v, p, replacement, base64urlAllow),
    },
    {
      pattern: BASE64,
      replacer: (v, p) =>
        replaceAllMatchesWithContext(v, p, replacement, base64Allow),
    },
    {
      pattern: BASE58,
      replacer: (v, p) =>
        replaceAllMatchesWithContext(v, p, replacement, base58Allow),
    },
    {
      pattern: MNEMONIC,
      replacer: (v, p) =>
        replaceBip39MnemonicMatchesWithContext(
          v,
          p,
          replacement,
          mnemonicAllow,
        ),
    },
  ];

  return new DeepRedact({
    stringTests,
    replacement,
    serialise: false,
  });
};

const createRedact = (config: RedactConfig) => {
  const redactor = createRedactor(config);
  return (text: string) => redactor.redact(text) as string;
};

export { createRedact };
export type { RedactConfig };
