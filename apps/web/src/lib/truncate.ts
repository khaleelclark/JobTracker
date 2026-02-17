export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

export function truncateJson(input: unknown, maxLength = 5000): string {
  const raw = JSON.stringify(input);
  return truncateText(raw, maxLength);
}
