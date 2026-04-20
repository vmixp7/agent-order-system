import OpenAI from "openai";
import { toolDefinitions, executeTool } from "./tools.js";
import { MemoryManager } from "./memory.js";

const MAX_ITERATIONS = 10; // 防止無限迴圈
const RETRY_LIMIT = 3;     // API 錯誤重試上限

// ─── Agent ──────────────────────────────────────────────────────────────────

export class Agent {
  /**
   * @param {object} opts
   * @param {string} opts.apiKey
   * @param {string} [opts.model]
   * @param {string} [opts.systemPrompt]
   */
  constructor({ apiKey, model = "gpt-4o-mini", systemPrompt }) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.memory = new MemoryManager(
      systemPrompt ??
        "你是一個訂單管理助理。根據使用者的需求，使用提供的工具查詢或操作訂單。" +
        "回覆使用繁體中文，並在完成任務後簡潔地總結結果。"
    );
  }

  /**
   * 主要 agent loop：
   *   1. 將 user 訊息加入 memory
   *   2. 呼叫 LLM，判斷是否需要工具
   *   3. 若需要工具 → 執行 → 結果塞回 memory → 繼續迴圈
   *   4. 若直接回覆 → 結束，回傳最終文字
   *
   * @param {string} userMessage
   * @returns {Promise<string>} 最終回覆
   */
  async run(userMessage) {
    this.memory.push({ role: "user", content: userMessage });

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      console.log(`\n[Agent] 第 ${iter + 1} 輪思考...`);

      const response = await this._callWithRetry();
      const message = response.choices[0].message;

      // 把 assistant 的回應（含可能的 tool_calls）加入 memory
      this.memory.push(message);

      // ── 情況 A：沒有工具呼叫 → 任務完成 ──────────────────────────────
      if (!message.tool_calls || message.tool_calls.length === 0) {
        console.log("[Agent] 任務完成，回傳最終回覆");
        return message.content ?? "(無回覆內容)";
      }

      // ── 情況 B：有工具呼叫 → 逐一執行 ───────────────────────────────
      console.log(`[Agent] 需要執行 ${message.tool_calls.length} 個工具`);

      const toolResults = await Promise.all(
        message.tool_calls.map(async (tc) => {
          const { name, arguments: argsJson } = tc.function;
          console.log(`  → 工具: ${name}  參數: ${argsJson}`);

          const result = await executeTool(name, argsJson);
          console.log(`  ← 結果: ${result}`);

          return {
            role: "tool",
            tool_call_id: tc.id,
            content: result,
          };
        })
      );

      // 將所有工具結果一次性加入 memory
      this.memory.push(...toolResults);
    }

    // 超過迭代上限
    return "[錯誤] Agent 超過最大迭代次數，任務未完成。";
  }

  /** 帶重試機制的 API 呼叫 */
  async _callWithRetry() {
    let lastError;

    for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
      try {
        return await this.client.chat.completions.create({
          model: this.model,
          messages: this.memory.getHistory(),
          tools: toolDefinitions,
          tool_choice: "auto", // 讓模型自行決定要不要用工具
        });
      } catch (err) {
        lastError = err;
        const isRetryable =
          err.status === 429 ||  // rate limit
          err.status === 500 ||  // server error
          err.status === 503;    // service unavailable

        if (!isRetryable || attempt === RETRY_LIMIT) break;

        const delay = attempt * 2000; // 指數退避（簡化版）
        console.warn(`[Agent] API 錯誤 (${err.status})，${delay / 1000}s 後重試... (${attempt}/${RETRY_LIMIT})`);
        await sleep(delay);
      }
    }

    throw new Error(`API 呼叫失敗: ${lastError?.message ?? "未知錯誤"}`);
  }

  /** 重置對話記憶，開始新任務 */
  reset() {
    this.memory.reset();
    console.log("[Agent] 記憶已重置");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
