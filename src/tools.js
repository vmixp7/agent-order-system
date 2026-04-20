import { searchKnowledgeBase } from "./rag.js";
import { getCache, setCache, delCache } from "./redisService.js";

// ─── Tool Definitions (OpenAI function calling schema) ─────────────────────

export const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description:
        "語意搜尋知識庫，查詢退換貨政策、運費說明、付款方式、商品規格等資訊。" +
        "當用戶詢問政策性或說明性問題時優先呼叫此工具。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "搜尋查詢文字，盡量用完整句子描述問題",
          },
          n_results: {
            type: "integer",
            description: "回傳幾筆結果（預設 3，最多 5）",
            default: 3,
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_status",
      description: "根據訂單 ID 查詢目前的訂單狀態",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "訂單唯一識別碼，例如 ORD-1234",
          },
        },
        required: ["order_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_orders",
      description: "列出指定用戶的所有訂單",
      parameters: {
        type: "object",
        properties: {
          user_id: {
            type: "string",
            description: "用戶 ID",
          },
          status_filter: {
            type: "string",
            enum: ["all", "pending", "shipped", "delivered", "cancelled"],
            description: "篩選特定狀態的訂單，預設為 all",
          },
        },
        required: ["user_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_order",
      description: "取消一筆尚未出貨的訂單",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "要取消的訂單 ID",
          },
          reason: {
            type: "string",
            description: "取消原因（選填）",
          },
        },
        required: ["order_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_total",
      description: "計算多個訂單的金額總計",
      parameters: {
        type: "object",
        properties: {
          order_ids: {
            type: "array",
            items: { type: "string" },
            description: "訂單 ID 陣列",
          },
        },
        required: ["order_ids"],
      },
    },
  },
];

// ─── Mock Database ──────────────────────────────────────────────────────────

const mockOrders = {
  "ORD-1001": { id: "ORD-1001", user_id: "U-001", status: "shipped",   amount: 1200, item: "無線耳機" },
  "ORD-1002": { id: "ORD-1002", user_id: "U-001", status: "pending",   amount:  350, item: "USB 集線器" },
  "ORD-1003": { id: "ORD-1003", user_id: "U-001", status: "delivered", amount: 2800, item: "機械鍵盤" },
  "ORD-1004": { id: "ORD-1004", user_id: "U-002", status: "cancelled", amount:  900, item: "滑鼠墊" },
  "ORD-1005": { id: "ORD-1005", user_id: "U-002", status: "pending",   amount:  450, item: "網路攝影機" },
};

// ─── Tool Implementations ───────────────────────────────────────────────────

async function get_order_status({ order_id }) {
  const cacheKey = `order:${order_id}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const order = mockOrders[order_id];
  if (!order) return { error: `找不到訂單 ${order_id}` };

  const result = { order_id: order.id, status: order.status, item: order.item, amount: order.amount };
  await setCache(cacheKey, result, 60);
  return result;
}

async function list_orders({ user_id, status_filter = "all" }) {
  const cacheKey = `orders:${user_id}:${status_filter}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const orders = Object.values(mockOrders).filter((o) => {
    if (o.user_id !== user_id) return false;
    if (status_filter !== "all" && o.status !== status_filter) return false;
    return true;
  });

  const result =
    orders.length === 0
      ? { message: `用戶 ${user_id} 沒有符合條件的訂單` }
      : { user_id, count: orders.length, orders: orders.map(({ id, status, item, amount }) => ({ id, status, item, amount })) };

  await setCache(cacheKey, result, 30);
  return result;
}

async function cancel_order({ order_id, reason }) {
  const order = mockOrders[order_id];
  if (!order) return { error: `找不到訂單 ${order_id}` };

  if (order.status === "shipped" || order.status === "delivered") {
    return { error: `訂單 ${order_id} 已${order.status === "shipped" ? "出貨" : "送達"}，無法取消` };
  }
  if (order.status === "cancelled") {
    return { error: `訂單 ${order_id} 已經是取消狀態` };
  }

  mockOrders[order_id] = { ...order, status: "cancelled" };

  await delCache(`order:${order_id}`, `orders:${order.user_id}:all`, `orders:${order.user_id}:pending`);

  return {
    success: true,
    order_id,
    message: `訂單 ${order_id} 已成功取消`,
    reason: reason ?? "未提供原因",
  };
}

function calculate_total({ order_ids }) {
  let total = 0;
  const breakdown = [];

  for (const id of order_ids) {
    const order = mockOrders[id];
    if (!order) {
      breakdown.push({ id, error: "找不到訂單" });
    } else {
      total += order.amount;
      breakdown.push({ id, amount: order.amount, item: order.item });
    }
  }

  return { total, breakdown };
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────

const asyncToolMap = {
  search_knowledge_base: searchKnowledgeBase,
  get_order_status,
  list_orders,
  cancel_order,
  calculate_total,
};

/**
 * 執行工具呼叫，回傳 JSON 字串（OpenAI 要求 tool result 為字串）
 * 支援同步與非同步工具
 * @param {string} name      - 工具名稱
 * @param {string} argsJson  - JSON 字串格式的參數
 * @returns {Promise<string>}
 */
export async function executeTool(name, argsJson) {
  try {
    const args = JSON.parse(argsJson);

    if (asyncToolMap[name]) {
      const result = await asyncToolMap[name](args);
      return typeof result === "string" ? result : JSON.stringify(result);
    }

    return JSON.stringify({ error: `未知工具: ${name}` });
  } catch (err) {
    return JSON.stringify({ error: `工具執行失敗: ${err.message}` });
  }
}
