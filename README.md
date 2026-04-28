# 訂單管理代理系統

- 設計並實作一套 Agentic AI 系統（Node.js），採用 Agent Loop 架構，支援多步驟推理與工具調用（Function Calling）
- 建立訂單查詢場景，整合多個後端 API（訂單 / 物流 / 取消），實現自動化任務處理
- 設計 Memory 管理機制（short-term + long-term），提升多輪對話理解能力
- Redis 負責 session memory 與快取，確保多輪對話與效能
- Chroma 作為向量資料庫，提供 RAG 能力，讓系統可以查詢內部文件與業務規則
- 實作錯誤控制（tool error handling、loop 限制、retry機制），確保系統穩定性
- 支援多工具 chaining，讓 LLM 能根據上下文自主決策流程

## 啟動步驟

#### 1.啟動redis

docker run -d -p 6379:6379 --name redis redis

#### 2. 啟動 ChromaDB（需要 Docker）

docker run -p 8000:8000 chromadb

#### 3. 寫入知識庫（只需跑一次）

npm run seed

#### 4. 啟動 agent

npm start

#### 4. 自動執行任務

- 我想知道訂單 ORD-1001 目前的狀態
- 列出用戶 U-001 所有的訂單
- 幫我取消 ORD-1002，原因是不需要了
- 計算 ORD-1001、ORD-1003 的總金額，並告訴我哪一筆最貴

RAG 知識庫查詢

- 我的包裹已出貨，可以取消訂單嗎？
- 請問運費怎麼計算？什麼條件免運？
- 無線耳機的規格和保固是什麼？
