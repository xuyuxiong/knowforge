import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Document {
  id: string
  title: string
  type: string
  content?: string
  source?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
  fileSize?: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  sources?: string[]
}

interface AppSettings {
  embeddingModel: string
  embeddingDimension: number
  llmModel: string
  llmApiKey?: string
  retrievalMethod: string
  topK: number
  rerank: boolean
  chunkStrategy: string
  chunkSize: number
  overlapSize: number
  maxFileSize: number
  similarityThreshold: number
  yuqueToken?: string
  syncInterval: number
}

interface GlobalState {
  // 文档相关
  documents: Document[]
  selectedDocument: Document | null
  documentLoading: boolean
  documentError: string | null
  
  // 聊天相关
  chatMessages: ChatMessage[]
  chatLoading: boolean
  
  // 系统设置
  settings: AppSettings
  
  // 全局状态
  theme: 'light' | 'dark'
  sidebarCollapsed: boolean
  
  // 文档操作
  setDocuments: (documents: Document[]) => void
  addDocument: (document: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  removeDocument: (id: string) => void
  setSelectedDocument: (document: Document | null) => void
  setDocumentLoading: (loading: boolean) => void
  setDocumentError: (error: string | null) => void
  
  // 聊天操作
  addChatMessage: (message: ChatMessage) => void
  setChatMessages: (messages: ChatMessage[]) => void
  setChatLoading: (loading: boolean) => void
  clearChatMessages: () => void
  
  // 设置操作
  updateSettings: (settings: Partial<AppSettings>) => void
  resetSettings: () => void
  
  // 全局操作
  setTheme: (theme: 'light' | 'dark') => void
  toggleSidebar: () => void
}

const defaultSettings: AppSettings = {
  embeddingModel: 'bge-large-zh-v1.5',
  embeddingDimension: 1024,
  llmModel: 'qwen-max',
  retrievalMethod: 'hybrid',
  topK: 5,
  rerank: true,
  chunkStrategy: 'semantic',
  chunkSize: 500,
  overlapSize: 100,
  maxFileSize: 50,
  similarityThreshold: 0.7,
  syncInterval: 3600,
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set) => ({
      // 初始状态
      documents: [],
      selectedDocument: null,
      documentLoading: false,
      documentError: null,
      chatMessages: [],
      chatLoading: false,
      settings: defaultSettings,
      theme: 'light',
      sidebarCollapsed: false,

      // 文档操作
      setDocuments: (documents) => set({ documents }),
      addDocument: (document) => set((state) => ({ 
        documents: [...state.documents, document] 
      })),
      updateDocument: (id, updates) => set((state) => ({
        documents: state.documents.map(doc => 
          doc.id === id ? { ...doc, ...updates } : doc
        ),
        selectedDocument: state.selectedDocument?.id === id 
          ? { ...state.selectedDocument, ...updates } 
          : state.selectedDocument
      })),
      removeDocument: (id) => set((state) => ({
        documents: state.documents.filter(doc => doc.id !== id),
        selectedDocument: state.selectedDocument?.id === id ? null : state.selectedDocument
      })),
      setSelectedDocument: (document) => set({ selectedDocument: document }),
      setDocumentLoading: (loading) => set({ documentLoading: loading }),
      setDocumentError: (error) => set({ documentError: error }),

      // 聊天操作
      addChatMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages, message]
      })),
      setChatMessages: (messages) => set({ chatMessages: messages }),
      setChatLoading: (loading) => set({ chatLoading: loading }),
      clearChatMessages: () => set({ chatMessages: [] }),

      // 设置操作
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
      resetSettings: () => set({ settings: defaultSettings }),

      // 全局操作
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
    }),
    {
      name: 'rag-global-store',
      partialize: (state) => ({
        settings: state.settings,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)

// 快捷 hooks
export const useDocuments = () => {
  const store = useGlobalStore()
  return {
    documents: store.documents,
    selectedDocument: store.selectedDocument,
    documentLoading: store.documentLoading,
    documentError: store.documentError,
    setDocuments: store.setDocuments,
    addDocument: store.addDocument,
    updateDocument: store.updateDocument,
    removeDocument: store.removeDocument,
    setSelectedDocument: store.setSelectedDocument,
    setDocumentLoading: store.setDocumentLoading,
    setDocumentError: store.setDocumentError,
  }
}

export const useChat = () => {
  const store = useGlobalStore()
  return {
    chatMessages: store.chatMessages,
    chatLoading: store.chatLoading,
    addChatMessage: store.addChatMessage,
    setChatMessages: store.setChatMessages,
    setChatLoading: store.setChatLoading,
    clearChatMessages: store.clearChatMessages,
  }
}

export const useSettings = () => {
  const store = useGlobalStore()
  return {
    settings: store.settings,
    updateSettings: store.updateSettings,
    resetSettings: store.resetSettings,
  }
}

export const useTheme = () => {
  const store = useGlobalStore()
  return {
    theme: store.theme,
    setTheme: store.setTheme,
  }
}

export const useLayout = () => {
  const store = useGlobalStore()
  return {
    sidebarCollapsed: store.sidebarCollapsed,
    toggleSidebar: store.toggleSidebar,
  }
}