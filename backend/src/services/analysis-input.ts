import type { WillhabenItem } from '../schemas/scrape.schema';

export const MAX_FIELD_CHARS = 1500;

export class AnalysisBudgetExceededError extends Error {
  readonly maxItemsHint: number;

  constructor(actualChars: number, maxInputChars: number, itemCount: number) {
    const maxItemsHint = Math.max(1, Math.floor((itemCount * maxInputChars) / actualChars));
    super(
      `Prepared analysis payload (${actualChars} chars) exceeds ANALYZE_MAX_INPUT_CHARS (${maxInputChars}). Try at most ${maxItemsHint} items.`,
    );
    this.name = 'AnalysisBudgetExceededError';
    this.maxItemsHint = maxItemsHint;
  }
}

export interface PreparedAnalysisItem {
  id: string;
  title: string;
  price?: string;
  attributes?: string;
  description?: string;
}

export interface PreparedAnalysisInput {
  items: PreparedAnalysisItem[];
  truncatedFields: number;
  serializedItems: string;
}

function truncateOptionalField(
  value: string | undefined,
  maxChars: number,
): { value?: string; truncated: boolean } {
  if (!value) {
    return { truncated: false };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { truncated: false };
  }
  if (trimmed.length <= maxChars) {
    return { value: trimmed, truncated: false };
  }
  return {
    value: `${trimmed.slice(0, maxChars - 1)}…`,
    truncated: true,
  };
}

export function prepareAnalysisInput(
  items: WillhabenItem[],
  maxInputChars: number,
  maxFieldChars = MAX_FIELD_CHARS,
): PreparedAnalysisInput {
  let truncatedFields = 0;

  const preparedItems: PreparedAnalysisItem[] = items.map((item) => {
    const prepared: PreparedAnalysisItem = {
      id: item.id,
      title: item.title.trim(),
    };

    const trimmedPrice = item.price?.trim();
    if (trimmedPrice) {
      prepared.price = trimmedPrice;
    }

    const attrs = truncateOptionalField(item.attributes, maxFieldChars);
    if (attrs.value !== undefined) {
      prepared.attributes = attrs.value;
    }
    if (attrs.truncated) {
      truncatedFields += 1;
    }

    const desc = truncateOptionalField(item.description, maxFieldChars);
    if (desc.value !== undefined) {
      prepared.description = desc.value;
    }
    if (desc.truncated) {
      truncatedFields += 1;
    }

    return prepared;
  });

  const serializedItems = JSON.stringify(preparedItems);
  if (serializedItems.length > maxInputChars) {
    throw new AnalysisBudgetExceededError(serializedItems.length, maxInputChars, items.length);
  }

  return {
    items: preparedItems,
    truncatedFields,
    serializedItems,
  };
}
