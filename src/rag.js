import { ChromaClient, OpenAIEmbeddingFunction } from "chromadb";
import { withRetry } from "./retry.js";

const COLLECTION_NAME = "order_knowledge_base";
const CHROMA_URL = process.env.CHROMA_URL ?? "http://localhost:8000";

// ─── ChromaDB 連線與 Embedding 設定 ─────────────────────────────────────────

let _collection = null;

function getEmbedder() {
  return new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_model: "text-embedding-3-small",
  });
}

/**
 * 取得（或建立）ChromaDB collection，連線失敗時拋出明確錯誤
 * @returns {Promise<import("chromadb").Collection>}
 */
export async function getCollection() {
  if (_collection) return _collection;

  const client = new ChromaClient({ path: CHROMA_URL });
  _collection = await withRetry(
    () => client.getOrCreateCollection({
      name: COLLECTION_NAME,
      embeddingFunction: getEmbedder(),
      metadata: { description: "訂單系統知識庫" },
    }),
    { label: "RAG/connect" }
  );

  console.log(`[RAG] 已連線 ChromaDB collection: ${COLLECTION_NAME}`);
  return _collection;
}

// ─── 寫入文件 ────────────────────────────────────────────────────────────────

/**
 * 批次新增文件到知識庫
 * @param {Array<{ id: string, text: string, metadata?: object }>} docs
 */
export async function addDocuments(docs) {
  const collection = await getCollection();

  await withRetry(
    () => collection.add({
      ids: docs.map((d) => d.id),
      documents: docs.map((d) => d.text),
      metadatas: docs.map((d) => d.metadata ?? {}),
    }),
    { label: "RAG/add" }
  );

  console.log(`[RAG] 已寫入 ${docs.length} 筆文件`);
}

// ─── 查詢（RAG 核心）────────────────────────────────────────────────────────

/**
 * 語意搜尋，回傳最相近的文件片段
 * @param {string} query       - 查詢文字
 * @param {number} nResults    - 回傳幾筆
 * @returns {Promise<Array<{ id: string, text: string, distance: number, metadata: object }>>}
 */
export async function queryKnowledgeBase(query, nResults = 3) {
  const collection = await getCollection();

  const result = await withRetry(
    () => collection.query({ queryTexts: [query], nResults }),
    { label: "RAG/query" }
  );

  // ChromaDB 回傳結構：每個陣列的第 0 個元素對應第一個 queryText
  const ids = result.ids[0] ?? [];
  const documents = result.documents[0] ?? [];
  const distances = result.distances[0] ?? [];
  const metadatas = result.metadatas[0] ?? [];

  return ids.map((id, i) => ({
    id,
    text: documents[i],
    distance: distances[i],
    metadata: metadatas[i] ?? {},
  }));
}

// ─── 工具包裝（供 agent tools.js 呼叫）──────────────────────────────────────

/**
 * @param {{ query: string, n_results?: number }} args
 * @returns {Promise<string>} JSON 字串
 */
export async function searchKnowledgeBase({ query, n_results = 3 }) {
  try {
    const hits = await queryKnowledgeBase(query, n_results);

    if (hits.length === 0) {
      return JSON.stringify({ message: "知識庫中找不到相關內容" });
    }

    return JSON.stringify({
      query,
      results: hits.map((h) => ({
        id: h.id,
        content: h.text,
        relevance_score: +(1 - h.distance).toFixed(4), // cosine distance → similarity
        metadata: h.metadata,
      })),
    });
  } catch (err) {
    return JSON.stringify({ error: `RAG 查詢失敗: ${err.message}` });
  }
}
