/** Model cost in INR from token usage. Computed in code (never by a model) and stored with the extraction. */
export interface TokenRates {
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
  usdInr: number;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

/** Cache writes bill at 1.25× input, cache reads at 0.1× input. Rounded to 4 decimals (paise/100). */
export function llmCostInr(u: TokenUsage, r: TokenRates): number {
  const inputTokens = u.input_tokens + 1.25 * (u.cache_creation_input_tokens ?? 0) + 0.1 * (u.cache_read_input_tokens ?? 0);
  const usd = (inputTokens * r.inputUsdPerMTok + u.output_tokens * r.outputUsdPerMTok) / 1_000_000;
  return Math.round(usd * r.usdInr * 10_000) / 10_000;
}
