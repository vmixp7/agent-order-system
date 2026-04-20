// ─── Memory Manager ─────────────────────────────────────────────────────────
// 管理對話歷史，支援：
//   - 滑動視窗截斷（避免 context 爆掉）
//   - system prompt 固定置頂
//   - 摘要壓縮（超過上限時保留最早 + 最近）

const DEFAULT_MAX_MESSAGES = 40; // 超過此數量觸發壓縮
const KEEP_RECENT = 20;          // 壓縮後保留最近幾則

export class MemoryManager {
  /**
   * @param {string} systemPrompt
   * @param {number} maxMessages
   */
  constructor(systemPrompt, maxMessages = DEFAULT_MAX_MESSAGES) {
    this.systemPrompt = systemPrompt;
    this.maxMessages = maxMessages;
    /** @type {Array<import("openai/resources/chat/completions").ChatCompletionMessageParam>} */
    this.messages = [];
  }

  /** 加入一則或多則訊息 */
  push(...msgs) {
    this.messages.push(...msgs);
    this._maybeCompress();
  }

  /**
   * 回傳要送給 OpenAI 的完整訊息陣列（system + history）
   * @returns {Array}
   */
  getHistory() {
    return [{ role: "system", content: this.systemPrompt }, ...this.messages];
  }

  /** 清空對話歷史（保留 system prompt） */
  reset() {
    this.messages = [];
  }

  /** 超過上限時，保留頭幾則 + 最近幾則，中間插入壓縮摘要 */
  _maybeCompress() {
    if (this.messages.length <= this.maxMessages) return;

    const keepHead = 4; // 保留最初幾則以維持任務脈絡
    const head = this.messages.slice(0, keepHead);
    const tail = this.messages.slice(-KEEP_RECENT);

    const dropped = this.messages.length - keepHead - KEEP_RECENT;
    const summary = {
      role: "system",
      content: `[記憶壓縮] 中間 ${dropped} 則訊息已省略以節省 context。`,
    };

    this.messages = [...head, summary, ...tail];
    console.warn(`[Memory] 已壓縮，保留 ${this.messages.length} 則訊息`);
  }

  get length() {
    return this.messages.length;
  }
}
