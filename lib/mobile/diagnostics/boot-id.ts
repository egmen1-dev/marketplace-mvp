export function generateBootId(): string {
  const rand = Math.floor(Math.random() * 0xffffff);
  return `BOOT-${rand.toString(16).padStart(6, "0").toUpperCase()}`;
}

export function isBootId(value: string): boolean {
  return /^BOOT-[0-9A-F]{6}$/.test(value);
}
