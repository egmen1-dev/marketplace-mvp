const SECRET_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /refresh[_-]?token["\s:=]+["']?[A-Za-z0-9\-._~+/]+=*/gi,
  /access[_-]?token["\s:=]+["']?[A-Za-z0-9\-._~+/]+=*/gi,
  /authorization["\s:=]+["']?[^\s"']+/gi,
  /password["\s:=]+["']?[^\s"']+/gi,
  /cookie["\s:=]+["']?[^\s"']+/gi,
];

export function redactSecrets(input: string): string {
  let output = input;
  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, "[REDACTED]");
  }
  return output;
}

export function sanitizeStack(stack?: string): string | undefined {
  if (!stack) return undefined;
  const lines = redactSecrets(stack).split("\n").slice(0, 12);
  return lines.join("\n");
}

export function sanitizeErrorMessage(message: string): string {
  return redactSecrets(message);
}
