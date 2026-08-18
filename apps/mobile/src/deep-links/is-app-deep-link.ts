/** Deep links the native shell may queue or route — never raw https staging URLs. */

export function isLotDeepLink(url: string): boolean {
  return /^lot:/i.test(url.trim());
}

export function isExternalWebUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

export function shouldCaptureAsPendingDeepLink(url: string | null | undefined): boolean {
  return Boolean(url && isLotDeepLink(url));
}
