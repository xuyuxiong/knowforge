import axios from 'axios'
import { message } from 'antd'

// API 基础配置
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000'

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      message.error('登录已过期，请重新登录')
    } else if (error.response?.status === 403) {
      message.error('没有权限访问')
    } else {
      message.error(error.response?.data?.message || '请求失败')
    }
    return Promise.reject(error)
  }
)

// 用户相关 API
export const userApi = {
  // 登录
  login: (credentials: { username: string; password: string }) =>
    api.post('/api/auth/login', credentials),

  // 注册
  register: (userData: {
    username: string
    email: string
    displayName: string
    password: string
  }) => api.post('/api/auth/register', userData),

  // 获取当前用户信息
  getCurrentUser: () => api.get('/api/users/me'),

  // 更新当前用户信息
  updateCurrentUser: (data: any) => api.put('/api/users/me', data),

  // 更新当前用户密码
  updateCurrentUserPassword: (data: {
    currentPassword: string
    newPassword: string
  }) => api.put('/api/users/me/password', data),

  // 获取所有用户
  getAllUsers: () => api.get('/api/users'),

  // 分页获取用户
  getUsersPaginated: (page: number = 1, limit: number = 10) =>
    api.get('/api/users/paginated', { params: { page, limit } }),

  // 搜索用户
  searchUsers: (query: string) => api.get('/api/users/search', { params: { q: query } }),

  // 获取用户统计
  getStats: () => api.get('/api/users/stats'),

  // 创建用户
  createUser: (data: any) => api.post('/api/users', data),

  // 更新用户
  updateUser: (id: string, data: any) => api.put(`/api/users/${id}`, data),

  // 删除用户
  deleteUser: (id: string) => api.delete(`/api/users/${id}`),

  // 禁用用户
  suspendUser: (id: string) => api.put(`/api/users/${id}/suspend`),

  // 启用用户
  activateUser: (id: string) => api.put(`/api/users/${id}/activate`),
}

// 知识库相关 API
export const knowledgeBaseApi = {
  // 获取知识库列表
  getKnowledgeBases: () => api.get('/api/knowledge-bases'),

  // 创建知识库
  createKnowledgeBase: (data: any) => api.post('/api/knowledge-bases', data),

  // 更新知识库
  updateKnowledgeBase: (id: string, data: any) =>
    api.put(`/api/knowledge-bases/${id}`, data),

  // 删除知识库
  deleteKnowledgeBase: (id: string) => api.delete(`/api/knowledge-bases/${id}`),

  // 获取知识库详情
  getKnowledgeBase: (id: string) => api.get(`/api/knowledge-bases/${id}`),

  // 获取知识库统计
  getKnowledgeBaseStats: (id: string) => api.get(`/api/knowledge-bases/${id}/stats`),
}

// 文档相关 API
export const documentApi = {
  // 获取文档列表
  getDocuments: (knowledgeBaseId?: string) =>
    api.get('/api/documents', { params: { knowledgeBaseId } }),

  // 上传文档
  uploadDocument: (formData: FormData) =>
    api.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // 获取文档详情
  getDocument: (id: string) => api.get(`/api/documents/${id}`),

  // 删除文档
  deleteDocument: (id: string) => api.delete(`/api/documents/${id}`),

  // 重新索引文档
  reindexDocument: (id: string) => api.post(`/api/documents/${id}/reindex`),

  // 搜索文档
  searchDocuments: (query: string, knowledgeBaseId?: string) =>
    api.get('/api/documents/search', { params: { q: query, knowledgeBaseId } }),
}

// 聊天相关 API
export const chatApi = {
  // 发送消息
  sendMessage: (data: {
    message: string
    knowledgeBaseId?: string
    conversationId?: string
  }) => api.post('/api/chat', data),

  // 获取对话历史
  getConversations: () => api.get('/api/chat/conversations'),

  // 获取对话详情
  getConversation: (id: string) => api.get(`/api/chat/conversations/${id}`),

  // 删除对话
  deleteConversation: (id: string) => api.delete(`/api/chat/conversations/${id}`),
}

// 系统相关 API
export const systemApi = {
  // 获取系统状态
  getSystemStatus: () => api.get('/api/system/status'),

  // 获取系统统计
  getSystemStats: () => api.get('/api/system/stats'),

  // 健康检查
  healthCheck: () => api.get('/api/health'),
}

// 导出默认实例
export default api