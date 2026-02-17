const DEFAULT_TEXT_MAX = 2000;
const DEFAULT_ARRAY_MAX = 50;

function trimString(input: string, max = DEFAULT_TEXT_MAX): string {
  if (input.length <= max) {
    return input;
  }

  return `${input.slice(0, Math.max(0, max - 3))}...`;
}

export function truncatePayload(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return trimString(value);
  }

  if (Array.isArray(value)) {
    return value.slice(0, DEFAULT_ARRAY_MAX).map((item) => truncatePayload(item));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, v]) => [key, truncatePayload(v)]);
    return Object.fromEntries(entries);
  }

  return value;
}

export function truncateJsonString(value: string, maxLength = 5000): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}
