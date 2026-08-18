import { getCurrentBootStage, resetBootStage, setCurrentBootStage } from "./boot-stage";

export class BootTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = "BootTimeoutError";
  }
}

export async function withTimeout<T>(label: string, promise: Promise<T>, timeoutMs: number): Promise<T> {
  setCurrentBootStage(label);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new BootTimeoutError(label, timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export { getCurrentBootStage, resetBootStage, setCurrentBootStage };
