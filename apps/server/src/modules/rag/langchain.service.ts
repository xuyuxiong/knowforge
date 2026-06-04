import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { Chroma } from '@langchain/community/vectorstores/chroma'
import { Document as LCDocument } from '@langchain/core/documents'

export interface TextChunk {
  id: string
  content: string
  metadata: {
    source: string
    documentId: string
    chunkIndex: number
    title?: string
    type?: string
  }
}

export interface EmbeddingResult {
  embedding: number[]
  dimension: number
  model: string
}

@Injectable()
export class LangchainService implements OnModuleInit {
  private readonly logger = new Logger(LangchainService.name)
  
  private embeddingModel: any = null
  private llmModel: any = null
  private vectorStore: Chroma | null = null
  private textSplitter: RecursiveCharacterTextSplitter
  
  private readonly embeddingModelName: string
  private readonly llmModelName: string
  private readonly chromaUrl: string
  private readonly chromaCollection: string

  constructor(private configService: ConfigService) {
    this.embeddingModelName = this.configService.get('EMBEDDING_MODEL', 'bge-large-zh-v1.5')
    this.llmModelName = this.configService.get('LLM_MODEL', 'qwen-max')
    this.chromaUrl = this.configService.get('CHROMA_URL', 'http://localhost:8000')
    this.chromaCollection = this.configService.get('CHROMA_COLLECTION', 'rag-knowledge')
    
    // 文本分块配置
    const chunkSize = parseInt(this.configService.get('CHUNK_SIZE', '500'))
    const chunkOverlap = parseInt(this.configService.get('CHUNK_OVERLAP', '100'))
    
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      lengthFunction: (text) => text.length,
      separators: ['\n## ', '\n### ', '\n#### ', '\n\n', '\n', '. ', ' ', ''],
    })
    
    this.logger.log(`LangChain 服务初始化完成`)
    this.logger.log(`嵌入模型：${this.embeddingModelName}`)
    this.logger.log(`LLM 模型：${this.llmModelName}`)
    this.logger.log(`文本分块：${chunkSize} tokens, 重叠 ${chunkOverlap} tokens`)
  }

  async onModuleInit() {
    await this.initializeEmbedding()
    await this.initializeVectorStore()
  }

  /**
   * 初始化嵌入模型
   */
  private async initializeEmbedding() {
    try {
      // 使用本地嵌入模型或 API
      // 这里以通义千问 embedding 为例
      this.embeddingModel = {
        embedDocuments: async (texts: string[]) => {
          // TODO: 替换为实际的 embedding API 调用
          // 示例：调用阿里云 DashScope embedding API
          return this.callEmbeddingAPI(texts)
        },
        embedQuery: async (text: string) => {
          const result = await this.callEmbeddingAPI([text])
          return result[0]
        },
      }
      this.logger.log('嵌入模型初始化成功')
    } catch (error) {
      this.logger.error('嵌入模型初始化失败', error)
      throw error
    }
  }

  /**
   * 调用嵌入模型 API（以阿里云为例）
   */
  private async callEmbeddingAPI(texts: string[]): Promise<number[][]> {
    const apiKey = this.configService.get('DASHSCOPE_API_KEY', '')
    
    if (!apiKey) {
      // 返回模拟向量用于开发测试
      this.logger.warn('未配置 DASHSCOPE_API_KEY，使用模拟向量')
      return texts.map(() => Array(1536).fill(0).map(() => Math.random() - 0.5))
    }

    // TODO: 实现实际的 API 调用
    // const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: 'text-embedding-v2',
    //     input: { texts },
    //   }),
    // })
    
    // 模拟响应
    return texts.map(() => Array(1536).fill(0).map(() => Math.random() - 0.5))
  }

  /**
   * 初始化向量存储
   */
  private async initializeVectorStore() {
    try {
      // 使用 Chroma 作为向量数据库（开发阶段）
      // 生产环境可切换到 Milvus
      this.vectorStore = new Chroma(
        this.embeddingModel,
        {
          collectionName: this.chromaCollection,
          url: this.chromaUrl,
        }
      )
      this.logger.log('向量存储初始化成功')
    } catch (error) {
      this.logger.error('向量存储初始化失败', error)
      // 向量存储不可用时不影响服务启动
    }
  }

  /**
   * 文本分块
   */
  async chunkText(content: string, metadata: Record<string, any>): Promise<TextChunk[]> {
    this.logger.log(`开始文本分块，内容长度：${content.length}`)
    
    const docs = await this.textSplitter.createDocuments([content], [metadata])
    
    const chunks: TextChunk[] = docs.map((doc: LCDocument, index: number) => ({
      id: `${metadata.documentId || 'doc'}-chunk-${index}`,
      content: doc.pageContent,
      metadata: {
        source: metadata.source || 'unknown',
        documentId: metadata.documentId || 'unknown',
        chunkIndex: index,
        title: metadata.title,
        type: metadata.type,
      },
    }))
    
    this.logger.log(`分块完成，共 ${chunks.length} 个块`)
    return chunks
  }

  /**
   * 向量化并存储
   */
  async embedAndStore(chunks: TextChunk[]): Promise<{ success: boolean; count: number }> {
    if (!this.vectorStore) {
      this.logger.warn('向量存储未初始化，跳过存储')
      return { success: false, count: 0 }
    }

    try {
      const documents = chunks.map((chunk) => 
        new LCDocument({
          pageContent: chunk.content,
          metadata: chunk.metadata,
        })
      )

      // 批量添加到向量存储
      const ids = await this.vectorStore.addDocuments(documents)
      
      this.logger.log(`向量化存储完成，共 ${ids.length} 个向量`)
      return { success: true, count: ids.length }
    } catch (error) {
      this.logger.error('向量化存储失败', error)
      return { success: false, count: 0 }
    }
  }

  /**
   * 相似性搜索
   */
  async similaritySearch(
    query: string, 
    options?: { topK?: number; filter?: Record<string, any> }
  ): Promise<TextChunk[]> {
    if (!this.vectorStore) {
      this.logger.warn('向量存储未初始化')
      return []
    }

    try {
      const topK = options?.topK || 5
      const filter = options?.filter
      
      const results = await this.vectorStore.similaritySearchWithScore(query, topK, filter)
      
      const chunks: TextChunk[] = results.map(([doc, score], index) => ({
        id: `result-${index}`,
        content: doc.pageContent,
        metadata: {
          source: doc.metadata?.source || 'unknown',
          documentId: doc.metadata?.documentId || 'unknown',
          chunkIndex: index,
          title: doc.metadata?.title,
          type: doc.metadata?.type,
        },
      }))
      
      this.logger.log(`检索完成，返回 ${chunks.length} 个结果`)
      return chunks
    } catch (error) {
      this.logger.error('相似性搜索失败', error)
      return []
    }
  }

  /**
   * 生成向量表示
   */
  async getEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.embeddingModel) {
      throw new Error('嵌入模型未初始化')
    }

    const embedding = await this.embeddingModel.embedQuery(text)
    
    return {
      embedding,
      dimension: embedding.length,
      model: this.embeddingModelName,
    }
  }

  /**
   * 删除向量
   */
  async deleteVectors(documentId: string): Promise<{ success: boolean }> {
    if (!this.vectorStore) {
      return { success: false }
    }

    try {
      // Chroma 支持按 filter 删除
      await this.vectorStore.delete({ 
        filter: { documentId } 
      })
      this.logger.log(`删除文档向量：${documentId}`)
      return { success: true }
    } catch (error) {
      this.logger.error('删除向量失败', error)
      return { success: false }
    }
  }
}