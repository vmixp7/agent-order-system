const RETRYABLE_STATUSES = new Set([429, 500, 503]);

/**
 * @param {() => Promise<any>} fn
 * @param {{ retries?: number, baseMs?: number, label?: string }} opts
 */
export async function withRetry(fn, { retries = 3, baseMs = 1000, label = "API" } = {}) {
  let lastErr;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isRetryable = RETRYABLE_STATUSES.has(err.status) || err.code === "ECONNRESET";
      if (!isRetryable || attempt === retries) break;

      const delay = baseMs * 2 ** (attempt - 1); // 1s → 2s → 4s
      console.warn(`[${label}] 第 ${attempt} 次失敗，${delay}ms 後重試... (${err.message})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error(`[${label}] 重試 ${retries} 次後仍失敗: ${lastErr?.message ?? "未知錯誤"}`);
}
