/** Lazy SecureStore — avoid TurboModule init before first frame (P0 physical crash). */
type SecureStoreModule = typeof import("expo-secure-store");

let secureStorePromise: Promise<SecureStoreModule> | null = null;

async function loadSecureStore(): Promise<SecureStoreModule> {
  if (!secureStorePromise) {
    secureStorePromise = import("expo-secure-store");
  }
  return secureStorePromise;
}

export async function secureStoreGet(key: string): Promise<string | null> {
  const SecureStore = await loadSecureStore();
  return SecureStore.getItemAsync(key);
}

export async function secureStoreSet(key: string, value: string): Promise<void> {
  const SecureStore = await loadSecureStore();
  await SecureStore.setItemAsync(key, value);
}

export async function secureStoreDelete(key: string): Promise<void> {
  const SecureStore = await loadSecureStore();
  await SecureStore.deleteItemAsync(key);
}
