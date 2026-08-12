/** Detect in-app browsers that often break CSS animations / content-visibility. */
export function isEmbeddedWebViewUserAgent(userAgent: string): boolean {
  return /VKAndroidApp|VKClient|VK\/|Telegram|Instagram|FBAN|FBAV|Line\/|Twitter/i.test(
    userAgent,
  );
}

export function isEmbeddedWebViewClient(): boolean {
  if (typeof navigator === "undefined") return false;
  return isEmbeddedWebViewUserAgent(navigator.userAgent);
}
