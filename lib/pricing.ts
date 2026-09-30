// lib/pricing.ts
// Pricing logic. Multiplier comes from settings tiers.

export type MarkupTier = {
  min: number;
  max: number;
  multiplier: number;
  label?: string;
};

export type PricingConfig = {
  cnyToUsd: number;
  usdToBdt: number;
  tiers: MarkupTier[];
  roundingStep: number;
};

// Kept for backward compat with lib/firestoreSettings.ts imports
export const DEFAULT_PRICING: PricingConfig = {
  cnyToUsd: 0.14,
  usdToBdt: 121,
  roundingStep: 10,
  tiers: [
    { min: 0,     max: 500,      multiplier: 1.50, label: "0 – ৳500" },
    { min: 500,   max: 2000,     multiplier: 1.35, label: "৳500 – ৳2,000" },
    { min: 2000,  max: 5000,     multiplier: 1.25, label: "৳2,000 – ৳5,000" },
    { min: 5000,  max: 10000,    multiplier: 1.18, label: "৳5,000 – ৳10,000" },
    { min: 10000, max: Infinity, multiplier: 1.12, label: "৳10,000+" },
  ],
};

export function cnyToCostBdt(
  priceCny: number,
  config: PricingConfig = DEFAULT_PRICING
): number {
  if (!priceCny || priceCny <= 0) return 0;
  const usd = priceCny * config.cnyToUsd;
  return usd * config.usdToBdt;
}

export function findTier(
  costBdt: number,
  config: PricingConfig = DEFAULT_PRICING
): MarkupTier {
  for (const tier of config.tiers) {
    if (costBdt >= tier.min && costBdt < tier.max) return tier;
  }
  return config.tiers[config.tiers.length - 1];
}

export function roundPrice(price: number, step: number): number {
  if (step <= 1) return Math.round(price);
  return Math.round(price / step) * step;
}

export type PriceBreakdown = {
  priceCny: number;
  priceUsd: number;
  costBdt: number;
  markupMultiplier: number;
  markupLabel: string;
  sellingRaw: number;
  sellingBdt: number;
  profit: number;
  marginPercent: number;
};

export function computePrice(
  priceCny: number,
  config: PricingConfig = DEFAULT_PRICING
): PriceBreakdown {
  const priceUsd = priceCny * config.cnyToUsd;
  const costBdt = priceUsd * config.usdToBdt;
  const tier = findTier(costBdt, config);
  const sellingRaw = costBdt * tier.multiplier;
  const sellingBdt = roundPrice(sellingRaw, config.roundingStep);
  const profit = sellingBdt - costBdt;
  const marginPercent = sellingBdt > 0 ? (profit / sellingBdt) * 100 : 0;

  return {
    priceCny,
    priceUsd,
    costBdt,
    markupMultiplier: tier.multiplier,
    markupLabel: tier.label ?? `${tier.min}-${tier.max}`,
    sellingRaw,
    sellingBdt,
    profit,
    marginPercent,
  };
}

export function formatBDTPrice(amount: number): string {
  return `৳${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatCNY(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`;
}