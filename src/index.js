import "dotenv/config";
import { Agent } from "./agent.js";

const agent = new Agent({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.MODEL ?? "gpt-4o-mini",
});

// ─── Demo：依序跑幾個任務 ─────────────────────────────────────────────────

const tasks = [
  // 訂單操作
  "我想知道訂單 ORD-1001 目前的狀態",
  "列出用戶 U-001 所有的訂單",
  "幫我取消 ORD-1002，原因是不需要了",
  "計算 ORD-1001、ORD-1003 的總金額，並告訴我哪一筆最貴",
  // RAG 知識庫查詢
  "我的包裹已出貨，可以取消訂單嗎？",
  "請問運費怎麼計算？什麼條件免運？",
  "無線耳機的規格和保固是什麼？",
];

for (const task of tasks) {
  console.log("\n" + "=".repeat(60));
  console.log("任務:", task);
  console.log("=".repeat(60));

  try {
    const answer = await agent.run(task);
    console.log("\n[最終回覆]\n" + answer);
  } catch (err) {
    console.error("[錯誤]", err.message);
  }

  // 每個獨立任務之間重置記憶（如果希望跨任務記憶則移除這行）
  agent.reset();
}
