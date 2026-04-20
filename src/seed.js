/**
 * 初始化知識庫資料
 * 執行一次即可：node src/seed.js
 */
import "dotenv/config";
import { addDocuments } from "./rag.js";

const knowledgeDocs = [
  {
    id: "policy-cancel-001",
    text: "訂單取消政策：訂單在出貨前可免費取消。出貨後須等商品送達再申請退貨。取消申請需在下單後 24 小時內提出，超過時間需聯繫客服處理。",
    metadata: { category: "policy", topic: "cancel" },
  },
  {
    id: "policy-return-001",
    text: "退貨政策：商品送達後 7 天內可申請退貨（需保持原包裝）。瑕疵品可在 30 天內申請退換。退款將在確認收到退貨後 5 個工作日內處理。",
    metadata: { category: "policy", topic: "return" },
  },
  {
    id: "policy-shipping-001",
    text: "出貨時間：一般商品下單後 1-2 個工作日出貨。預購商品依頁面標示時間。超過 3 個工作日未出貨可聯繫客服查詢。",
    metadata: { category: "policy", topic: "shipping" },
  },
  {
    id: "policy-shipping-002",
    text: "運費說明：訂單滿 499 元免運費。未達門檻收取 60 元運費。偏遠地區（外島）加收 100 元運費。",
    metadata: { category: "policy", topic: "shipping" },
  },
  {
    id: "policy-payment-001",
    text: "付款方式：支援信用卡（VISA/MasterCard）、ATM 轉帳、超商繳費、LINE Pay、Apple Pay。ATM 轉帳須在 24 小時內完成付款，超時訂單自動取消。",
    metadata: { category: "policy", topic: "payment" },
  },
  {
    id: "faq-status-001",
    text: "訂單狀態說明：pending（待處理）→ processing（備貨中）→ shipped（已出貨）→ delivered（已送達）。cancelled 為已取消狀態。",
    metadata: { category: "faq", topic: "status" },
  },
  {
    id: "faq-invoice-001",
    text: "發票說明：電子發票於出貨時自動開立並寄送至訂購 Email。統編發票需於下單時填寫，已出貨訂單無法補開統編發票。",
    metadata: { category: "faq", topic: "invoice" },
  },
  {
    id: "product-headphone-001",
    text: "無線耳機（型號 WH-1000）：藍牙 5.3、主動降噪、續航 30 小時。保固 1 年，含耳機本體及充電線。售價 1,200 元。",
    metadata: { category: "product", topic: "headphone" },
  },
  {
    id: "product-keyboard-001",
    text: "機械鍵盤（型號 MK-87）：87 鍵、Cherry MX 茶軸、RGB 背光、有線 USB-C。保固 2 年。售價 2,800 元。",
    metadata: { category: "product", topic: "keyboard" },
  },
  {
    id: "product-hub-001",
    text: "USB 集線器（型號 HUB-7P）：7 孔 USB-A 3.0、獨立電源供應、支援 BC1.2 快充。售價 350 元。保固 1 年。",
    metadata: { category: "product", topic: "hub" },
  },
];

try {
  await addDocuments(knowledgeDocs);
  console.log("知識庫初始化完成");
} catch (err) {
  console.error("初始化失敗:", err.message);
  console.error("請確認 ChromaDB 已啟動：docker run -p 8000:8000 chromadb/chroma");
  process.exit(1);
}
