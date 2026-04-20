### 啟動步驟

# 1. 啟動 ChromaDB（需要 Docker）

docker run -p 8000:8000 chromadb/chroma

# 2. 寫入知識庫（只需跑一次）

npm run seed

# 3. 啟動 agent

npm start
