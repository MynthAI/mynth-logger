import { DeepRedact } from "@hackylabs/deep-redact/index.ts";
import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

/**
 * Configurable redaction for strings that *look like secrets*:
 * - hex (optionally 0x-prefixed)
 * - base64 blobs
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
   * If it matches, the secret is NOT redacted.
   */
  re: RegExp;
  /** How many chars to include before the match when building the slice. */
  before?: number; // default 0
  /** How many chars to include after the match when building the slice. */
  after?: number; // default 0
};

type DetectorConfig = {
  enabled?: boolean;
  /**
   * Any rule match => do not redact that specific match.
   * Useful for things like "hash: <sha256>" or "intent <hex>".
   */
  allow?: ContextRule[];
};

type RedactConfig = {
  replacement?: string;

  hex?: DetectorConfig & {
    /** Minimum number of hex chars (excluding optional 0x). Default 32. */
    minLen?: number;
    /** Allow-list keywords for the common “keyword: <hex>” case. */
    allowKeywords?: string[]; // e.g. ["intent", "hash"]
    /**
     * How far back from the match to look for an allowKeyword.
     * (handles "hash:", "hash = ", etc.)
     */
    keywordWindow?: number; // default 40
  };

  base64?: DetectorConfig & {
    /** Minimum number of 4-char blocks. Default 8 (same as your current regex). */
    minBlocks?: number;
  };

  base58?: DetectorConfig & {
    /** Minimum number of chars. Default 32. */
    minLen?: number;
  };

  mnemonic?: DetectorConfig & {
    /** Enable/disable bare mnemonics (no keyword, no quotes). Default true. */
    bare?: boolean;
    /** Enable/disable keyword-triggered mnemonics. Default true. */
    withKeyword?: boolean;
    /** Enable/disable quoted/bracketed mnemonics. Default true. */
    quoted?: boolean;
  };

  /**
   * DeepRedact option; default false (matches your current behavior).
   * (Keep false to avoid surprises.)
   */
  serialise?: boolean;
};

const DEFAULT_REPLACEMENT = "[REDACTED]";

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

/**
 * Generic contextual replacer:
 * - Redacts every match unless an allow-rule matches nearby context.
 */
const replaceAllMatchesWithContext = (
  value: string,
  pattern: RegExp,
  replacement: string,
  allow?: ContextRule[],
) => {
  return value.replace(pattern, (...args: unknown[]) => {
    // args shape is: [match, ...groups?, offset, whole]
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
  return value.replace(pattern, (...args: unknown[]) => {
    // Expected: [match, phrase, offset, whole] (plus any extra captures if regex changes later)
    const match = args[0];
    const phrase = args[1];

    if (typeof match !== "string") return replacement;
    if (typeof phrase !== "string") return match;

    const meta = getReplaceMeta(args);
    if (!meta) return match;

    if (shouldAllowByRules(meta.whole, match, meta.offset, allow)) return match;

    const normalized = phrase.trim().toLowerCase().replace(/\s+/g, " ");
    if (!validateMnemonic(normalized, wordlist)) return match;

    // Replace only the phrase portion (preserves surrounding quotes/keywords if any)
    return match.replace(phrase, replacement);
  });
};

const escapeForRegexLiteral = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Build a context rule that allows a match when a keyword appears shortly before it,
 * like: "hash: <hex>" or "intent = <hex>".
 */
const keywordAllowRules = (
  keywords: string[],
  window: number,
): ContextRule[] => {
  if (!keywords.length) return [];
  const kw = keywords.map(escapeForRegexLiteral).join("|");
  // keyword, then optional separators/spaces up to the window end.
  // We only examine the chunk BEFORE the match by slicing.
  return [
    {
      re: new RegExp(String.raw`\b(?:${kw})\b[\s:=-]{0,40}$`, "i"),
      before: window,
      after: 0,
    },
  ];
};

const createRedactor = (config: RedactConfig = {}) => {
  const replacement = config.replacement ?? DEFAULT_REPLACEMENT;

  // ---- Patterns (built from config) ----

  // 1) HEX
  const hexEnabled = config.hex?.enabled ?? true;
  const hexMinLen = config.hex?.minLen ?? 32;
  const hexAllowKeywords = config.hex?.allowKeywords ?? ["intent", "hash"];
  const hexKeywordWindow = config.hex?.keywordWindow ?? 40;

  const HEX = new RegExp(
    String.raw`\b(?:0x)?[a-fA-F0-9]{${hexMinLen},}\b`,
    "g",
  );
  const hexAllow: ContextRule[] = [
    ...keywordAllowRules(hexAllowKeywords, hexKeywordWindow),
    ...(config.hex?.allow ?? []),
  ];

  // 2) BASE64
  const base64Enabled = config.base64?.enabled ?? true;
  const base64MinBlocks = config.base64?.minBlocks ?? 8;
  // same shape as your original, but min blocks configurable
  const BASE64 = new RegExp(
    String.raw`\b(?:[A-Za-z0-9+/]{4}){${base64MinBlocks},}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\b`,
    "g",
  );
  const base64Allow = config.base64?.allow ?? [];

  // 3) BASE58
  const base58Enabled = config.base58?.enabled ?? true;
  const base58MinLen = config.base58?.minLen ?? 32;
  const BASE58 = new RegExp(
    String.raw`\b[1-9A-HJ-NP-Za-km-z]{${base58MinLen},}\b`,
    "g",
  );
  const base58Allow = config.base58?.allow ?? [];

  // 4) MNEMONIC seed phrases
  const mnemonicEnabled = config.mnemonic?.enabled ?? true;
  const mnemonicBare = config.mnemonic?.bare ?? true;
  const mnemonicWithKeyword = config.mnemonic?.withKeyword ?? true;
  const mnemonicQuoted = config.mnemonic?.quoted ?? true;

  const WORD = "[a-zA-Z]{2,8}";
  const PHRASE_12_TO_24 = `(?:${WORD}\\s+){11,23}${WORD}`;

  const MNEMONIC_WITH_KEYWORD = new RegExp(
    String.raw`\b(?:mnemonic|seed|recovery\s+phrase|secret\s+phrase)\b[\s:=-]{0,40}(${PHRASE_12_TO_24})\b`,
    "gi",
  );

  const MNEMONIC_QUOTED = new RegExp(
    String.raw`(?:["'(\[])\s*(${PHRASE_12_TO_24})\s*(?:["')\]])`,
    "gi",
  );

  const MNEMONIC_BARE = new RegExp(String.raw`\b(${PHRASE_12_TO_24})\b`, "gi");

  const mnemonicAllow = config.mnemonic?.allow ?? [];

  const stringTests: Array<{
    pattern: RegExp;
    replacer: (v: string, p: RegExp) => string;
  }> = [];

  if (hexEnabled)
    stringTests.push({
      pattern: HEX,
      replacer: (v, p) =>
        replaceAllMatchesWithContext(v, p, replacement, hexAllow),
    });

  if (base64Enabled)
    stringTests.push({
      pattern: BASE64,
      replacer: (v, p) =>
        replaceAllMatchesWithContext(v, p, replacement, base64Allow),
    });

  if (base58Enabled)
    stringTests.push({
      pattern: BASE58,
      replacer: (v, p) =>
        replaceAllMatchesWithContext(v, p, replacement, base58Allow),
    });

  if (mnemonicEnabled) {
    if (mnemonicWithKeyword)
      stringTests.push({
        pattern: MNEMONIC_WITH_KEYWORD,
        replacer: (v, p) =>
          replaceBip39MnemonicMatchesWithContext(
            v,
            p,
            replacement,
            mnemonicAllow,
          ),
      });

    if (mnemonicQuoted)
      stringTests.push({
        pattern: MNEMONIC_QUOTED,
        replacer: (v, p) =>
          replaceBip39MnemonicMatchesWithContext(
            v,
            p,
            replacement,
            mnemonicAllow,
          ),
      });

    if (mnemonicBare)
      stringTests.push({
        pattern: MNEMONIC_BARE,
        replacer: (v, p) =>
          replaceBip39MnemonicMatchesWithContext(
            v,
            p,
            replacement,
            mnemonicAllow,
          ),
      });
  }

  return new DeepRedact({
    stringTests,
    replacement,
    serialise: config.serialise ?? false,
  });
};

const createRedact = (config: RedactConfig = {}) => {
  const redactor = createRedactor(config);
  return (text: string) => redactor.redact(text) as string;
};

export { createRedact };
