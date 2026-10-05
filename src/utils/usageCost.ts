import type { ModelCost, TotalTokenUsed } from '@type/chat';

type Usage = NonNullable<TotalTokenUsed[string]>;

/** Token-based estimates are not invoices; image units vary between providers. */
export function estimateUsageCost(
  usage: Usage | undefined,
  rates: ModelCost[string] | undefined
): number | null {
  if (!usage) return 0;
  if (!rates || usage.imageTokens > 0) return null;
  const parts = [
    [usage.promptTokens, rates.prompt],
    [usage.completionTokens, rates.completion],
  ] as const;
  let total = 0;
  for (const [tokens, rate] of parts) {
    if (
      !Number.isFinite(tokens) ||
      tokens < 0 ||
      !rate ||
      !Number.isFinite(rate.price) ||
      rate.price < 0 ||
      !Number.isFinite(rate.unit) ||
      rate.unit <= 0
    )
      return null;
    total += (tokens * rate.price) / rate.unit;
  }
  return Number.isFinite(total) ? total : null;
}

export function summarizeCosts(costs: (number | null)[]): {
  knownTotal: number;
  complete: boolean;
} {
  return {
    knownTotal: costs.reduce<number>((total, cost) => total + (cost ?? 0), 0),
    complete: costs.every((cost) => cost !== null),
  };
}

export function formatEstimatedCost(
  cost: number | null,
  unknownLabel: string
): string {
  if (cost === null) return unknownLabel;
  if (cost === 0) return '$0.00';
  return cost < 0.01 ? '<$0.01' : `$${cost.toFixed(4)}`;
}
