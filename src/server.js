import "dotenv/config";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Agent } from "./agent.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 5000;

const agent = new Agent({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.MODEL ?? "gpt-4o-mini",
});

app.use(express.json());
app.use(express.static(join(__dirname, "../public")));

app.post("/api/ask", async (req, res) => {
  const { question, reset } = req.body;

  if (!question || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "請輸入問題" });
  }

  if (reset) {
    agent.reset();
  }

  try {
    const answer = await agent.run(question.trim());
    res.json({ answer });
  } catch (err) {
    console.error("[Server] 錯誤:", err.message);
    res.status(500).json({ error: "Agent 執行失敗：" + err.message });
  }
});

app.post("/api/reset", (_req, res) => {
  agent.reset();
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`伺服器已啟動：http://localhost:${PORT}`);
});
