// KnowForge 共享类型定义

/** 知识库 */
export interface KnowledgeBase {
  id: string
  name: string
  description: string
  documentCount: number
  createdAt: string
  updatedAt: string
}

/** 文档 */
export interface Document {
  id: string
  title: string
  filename: string
  mimeType: string
  size: number
  knowledgeBaseId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
}

/** 聊天会话 */
export interface ChatSession {
  id: string
  title: string
  knowledgeBaseId?: string
  createdAt: string
}

/** 聊天消息 */
export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

/** RAG 问答来源 */
export interface RAGSource {
  id: string
  title: string
  content: string
  similarity: number
}

/** RAG 问答响应 */
export interface RAGResponse {
  answer: string
  sources: RAGSource[]
  query: string
  latency: number
}

/** 用户角色 */
export type UserRole = 'admin' | 'user'

/** 用户 */
export interface User {
  id: string
  username: string
  email?: string
  nickname?: string
  role: UserRole
  createdAt: string
}