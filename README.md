# KnowForge

基于大语言模型的智能知识库系统，灵感来自 wiki 等企业级 AI 知识库的核心能力，覆盖知识采集、知识消费、开放集成、应用封装四大层次。

> **Knowledge + Forge** — 知识不是存进来的，是锻造出来的。

---

## 🏗️ 功能规划（对标 wiki）

基于 wiki 产品能力拆解，按「知识消费 → 知识采集 → 开放集成 → 应用封装」分层，结合项目现状排列优先级：

### P0 — 必须做（核心链路，缺了就不能用）

| 模块 | 对标 wiki | 说明 | 状态 |
|------|-------------|------|------|
| **Knowledge Base** | Knowledge Base | 团队共享知识文档仓库 + RAG 问答，知识中枢核心 | ✅ 已有 |
| **文档上传 & 解析** | LocalWiki（采集层） | 多格式文档上传（PDF/Word/Markdown）、解析、切块、向量化入库 | ✅ 已有 |
| **RAG 智能问答** | Knowledge Base（消费层） | 向量检索 + LLM 生成回答，支持 SSE 流式输出 | ✅ 已有 |
| **语雀同步** | — | 语雀知识库定时/手动同步，拉取文档入库 | ✅ 已有 |
| **用户 & 权限** | wiki 官网（工作台） | 注册登录、JWT 鉴权、角色权限、知识库归属 | ✅ 已有 |

### P1 — 优先做（显著提升体验 & 覆盖 wiki 核心差异化能力）

| 模块 | 对标 wiki | 说明 | 状态 |
|------|-------------|------|------|
| **LocalWiki 智能编译** | LocalWiki | 投喂素材后 AI 自动提取实体、生成摘要、建立交叉引用，知识「编译」而非仅「存储」 | 🔲 待做 |
| **RepoWiki** | RepoWiki | 代码仓库 Deepwiki 问答——接入 Git 仓库，自动解析代码结构、生成仓库知识图谱，支持自然语言查代码 | 🔲 待做 |
| **Agent Memory** | Agent Memory | AI 编程助手跨会话长记忆，持久化用户偏好/项目约定，下次会话自动加载 | 🔲 待做 |
| **混合检索 + Rerank** | RAG 工程 | 升级向量检索为 hybrid（向量 + 关键词 + 实体检索）+ Rerank 重排，提升召回精度 | 🔄 部分实现 |
| **知识库健康检查** | LocalWiki Lint | 孤立页面、断链、矛盾内容检测，保持知识库质量 | 🔲 待做 |

### P2 — 后续做（完善生态 & 集成，依赖 P0/P1 稳定后扩展）

| 模块 | 对标 wiki | 说明 | 状态 |
|------|-------------|------|------|
| **Web Clipper** | Web Clipper | Chrome 插件一键抓取网页到知识库 | 🔲 待做 |
| **Bot 问答小助手** | Bot | 将知识库封装为问答服务，投放到钉群/Web/iframe | 🔲 待做 |
| **MCP Server** | MCPs | 以 MCP Server 方式对外提供知识服务，方便 AI Agent 集成 | 🔲 待做 |
| **OpenAPI** | OpenAPI | 标准化 REST 接口，供业务平台直接调用知识服务 | 🔄 部分实现 |
| **CLI + Skills** | CLI + Skills | 本地 Agent 工具箱，一键安装后 Agent 直接调用知识服务 | 🔲 待做 |

### P3 — 可砍掉（优先级低或与项目定位不匹配）

| 模块 | 对标 wiki | 说明 | 判断 |
|------|-------------|------|------|
| **JarWiki** | JarWiki | Maven 制品查询（GAV/类名/ClassNotFoundException 排查） | ⚠️ 企业内部 Java 生态专属，通用项目不需要 |
| **DevWiki** | DevWiki | 企业通用研发知识问答（术语/规范/技术栈） | ⚠️ 企业内部知识专属，外部无数据源 |
| **系统监控 & 告警** | — | CPU/内存/磁盘监控、告警规则 | ⚠️ 运维基础设施，非知识库核心，用 Prometheus/Grafana 替代 |
| **管理员仪表盘** | wiki 官网（部分） | 用户管理、统计报表页 | ⚠️ 不决定产品价值，后补即可 |

### 优先级总览

```
P0 (活着)  → Knowledge Base + 文档上传 + RAG 问答 + 语雀同步 + 用户权限    [✅ 已有]
P1 (好用)  → LocalWiki 智能编译 + RepoWiki + Agent Memory + 混合检索 Rerank + 知识库体检
P2 (生态)  → Web Clipper + Bot + MCP + OpenAPI + CLI Skills
P3 (砍掉)  → JarWiki + DevWiki + 系统监控告警 + 管理员仪表盘
```

> **为什么这样排？**
> - **P0** 是知识库的呼吸系统，没有就无法运行，目前已实现
> - **P1** 是 wiki 的差异化竞争力——智能编译 vs 单纯存储、代码仓库问答、跨会话记忆、检索精度，不做等于只做了半个产品
> - **P2** 是让知识「流出去」的管道，等核心稳了再扩展
> - **P3** 是企业内部生态或运维侧能力，与通用知识库定位不匹配，可砍或延后

---

## 📁 项目结构

```
knowforge/
├── package.json                 # 根 workspace 配置
├── pnpm-workspace.yaml          # pnpm monorepo 配置
├── tsconfig.base.json           # 共享 TypeScript 配置
├── docker-compose.yml           # Docker 编排
├── apps/
│   ├── server/                  # NestJS 后端 (@knowforge/server)
│   │   ├── src/
│   │   │   ├── modules/         # 业务模块 (auth, rag, document, yuque...)
│   │   │   ├── entities/        # 数据库实体
│   │   │   ├── common/          # 装饰器、守卫等公共代码
│   │   │   └── main.ts
│   │   ├── test/                # 测试
│   │   └── package.json
│   └── web/                     # React 前端 (@knowforge/web)
│       ├── src/
│       │   ├── pages/           # 页面组件
│       │   ├── components/      # 通用组件
│       │   ├── services/        # API 调用
│       │   └── store/           # 状态管理
│       └── package.json
├── packages/
│   └── shared/                  # 共享类型与工具 (@knowforge/shared)
│       └── src/
│           ├── types/           # KnowledgeBase, Document, User 等类型
│           └── utils/           # 通用工具函数
└── scripts/
    └── dev.sh                   # 一键启动脚本
```

---

## 🚀 已实现功能

### 核心能力
- 📚 **多格式文档支持**：PDF、Word、Markdown 等文档上传与解析
- 🔍 **向量化语义搜索**：基于 Embedding 的相似度检索，支持 ChromaDB / 内存向量库
- 💬 **RAG 智能问答**：向量检索 + LLM 生成，SSE 流式输出，支持对话历史
- 🔗 **语雀同步**：语雀知识库定时/手动同步，支持增量拉取
- 👥 **用户 & 权限**：注册登录、JWT 鉴权、角色权限控制
- 🎯 **知识库管理**：多知识库创建、文档归属、删除与重建索引

### 基础设施
- 📊 系统监控与告警（CPU/内存/磁盘）
- 🧪 核心服务单元测试覆盖
- 📖 Swagger API 文档

## 🛠️ 技术栈

### 后端 (apps/server)
- **框架**: NestJS
- **数据库**: PostgreSQL + TypeORM
- **向量存储**: ChromaDB（支持扩展 Pinecone / Milvus）
- **文档解析**: PDF / Word / Markdown / Excel / PPT
- **认证**: JWT + Passport
- **LLM**: Theta / LangChain

### 前端 (apps/web)
- **框架**: React + TypeScript
- **UI 库**: Ant Design
- **状态管理**: Zustand
- **HTTP 客户端**: Axios
- **构建**: Vite

### 共享 (packages/shared)
- **类型定义**: KnowledgeBase, Document, ChatMessage, User 等
- **工具函数**: formatFileSize, formatDate, truncate

## 📦 快速开始

### 环境要求
- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 12
- Docker (可选)

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd knowforge
```

2. **安装依赖（pnpm workspace 自动关联）**
```bash
pnpm install
```

3. **环境配置**
```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

4. **数据库初始化**
```bash
cd apps/server
pnpm run migration:run
pnpm run seed
```

5. **启动开发服务（前后端同时启动）**
```bash
# 一键启动
pnpm dev

# 或分开启动
pnpm dev:server   # 后端 http://localhost:4000
pnpm dev:web      # 前端 http://localhost:3000
```

### Docker 部署
```bash
docker-compose up -d
docker-compose logs -f
```

## 📋 API 文档

### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出

### 用户管理
- `GET /api/users/me` - 获取当前用户信息
- `PUT /api/users/me` - 更新当前用户信息
- `GET /api/users` - 获取所有用户（管理员）

### 知识库
- `GET /api/knowledge-bases` - 获取知识库列表
- `POST /api/knowledge-bases` - 创建知识库
- `GET /api/knowledge-bases/:id` - 获取知识库详情
- `PUT /api/knowledge-bases/:id` - 更新知识库
- `DELETE /api/knowledge-bases/:id` - 删除知识库

### 文档
- `GET /api/documents` - 获取文档列表
- `POST /api/documents/upload` - 上传文档
- `GET /api/documents/:id` - 获取文档详情
- `DELETE /api/documents/:id` - 删除文档
- `POST /api/documents/:id/reindex` - 重新索引文档

### RAG 问答
- `POST /rag/query` - RAG 智能问答
- `GET /rag/query/stream` - SSE 流式问答

### 语雀同步
- `POST /yuque/configure` - 配置语雀连接
- `GET /yuque/repo` - 获取语雀知识库详情
- `POST /yuque/sync` - 手动触发同步

## 🧪 测试

```bash
# 运行后端测试
pnpm test

# 测试覆盖率
pnpm --filter @knowforge/server test:cov
```

## 🔧 配置说明

### 后端 (apps/server/.env)
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=knowforge
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
VECTOR_STORE_PROVIDER=chroma
VECTOR_DIMENSION=1536
RAG_TOP_K=5
RAG_METHOD=hybrid
RAG_RERANK=true
```

### 前端 (apps/web/.env)
```bash
VITE_API_BASE_URL=http://localhost:3000
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件