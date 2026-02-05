const RAW_WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/debate';

export const WS_URL = RAW_WS_URL;

export const API_BASE_URL = (() => {
  const explicitApiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (explicitApiUrl) {
    return explicitApiUrl.replace(/\/$/, '');
  }

  try {
    const wsUrl = new URL(RAW_WS_URL);
    const protocol = wsUrl.protocol === 'wss:' ? 'https:' : 'http:';
    return `${protocol}//${wsUrl.host}`;
  } catch {
    return 'http://localhost:8000';
  }
})();

const HEALTH_URL = `${API_BASE_URL.replace(/\/$/, '')}/api/health`;

export async function pingBackend(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_URL, {
      method: 'GET',
      signal,
      headers: {
        'cache-control': 'no-cache',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function warmBackend(): Promise<void> {
  await pingBackend();
}

interface WaitForBackendOptions {
  timeoutMs?: number;
  intervalMs?: number;
  signal?: AbortSignal;
  onAttempt?: (attempt: number) => void;
}

export async function waitForBackend({
  timeoutMs = 120_000,
  intervalMs = 2_000,
  signal,
  onAttempt,
}: WaitForBackendOptions = {}): Promise<boolean> {
  const startedAt = Date.now();
  let attempt = 0;

  while (Date.now() - startedAt < timeoutMs) {
    if (signal?.aborted) return false;

    attempt += 1;
    onAttempt?.(attempt);

    const ok = await pingBackend(signal);
    if (ok) return true;

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}
