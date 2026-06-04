import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LangchainService, TextChunk } from './langchain.service'
import { ThetaLLMService } from './theta-llm.service'

export interface RAGConfig {
  topK: number
  method: 'vector' | 'keyword' | 'hybrid'
  rerank: boolean
  maxContextLength: number
}

export interface RAGContext {
  chunks: TextChunk[]
  query: string
  latency: number
}

export interface RAGResponse {
  answer: string
  sources: RAGSource[]
  query: string
  latency: number
  thoughts?: string
}

export interface RAGSource {
  id: string
  title: string
  content: string
  similarity: number
  metadata: Record<string, any>
}

@Injectable()
export class RagCoreService {
  private readonly logger = new Logger(RagCoreService.name)
  private readonly config: RAGConfig

  constructor(
    private langchainService: LangchainService,
    private configService: ConfigService,
    private thetaLLMService: ThetaLLMService,
  ) {
    this.config = {
      topK: parseInt(configService.get('RAG_TOP_K', '5')),
      method: configService.get('RAG_METHOD', 'hybrid') as any,
      rerank: configService.get('RAG_RERANK', 'true') === 'true',
      maxContextLength: parseInt(configService.get('RAG_MAX_CONTEXT_LENGTH', '4000')),
    }
    
    this.logger.log(`RAG 核心服务初始化完成`)
    this.logger.log(`配置：topK=${this.config.topK}, method=${this.config.method}, rerank=${this.config.rerank}`)
  }

  /**
   * 完整 RAG 流程
   */
  async query(question: string, options?: Partial<RAGConfig>): Promise<RAGResponse> {
    const startTime = Date.now()
    const config = { ...this.config, ...options }
    
    this.logger.log(`收到 RAG 查询：${question.substring(0, 100)}...`)
    
    try {
      // Step 1: 检索相关文档
      const context = await this.retrieveContext(question, config)
      
      // Step 2: 如果没有找到相关文档，返回友好提示
      if (context.chunks.length === 0) {
        const fallbackAnswer = this.getFallbackAnswer(question)
        return {
          answer: fallbackAnswer,
          sources: [],
          query: question,
          latency: Date.now() - startTime,
        }
      }
      
      // Step 3: 构建 Prompt
      const prompt = this.buildPrompt(question, context)
      
      // Step 4: 调用 LLM 生成答案
      const answer = await this.generateAnswer(prompt, config)
      
      // Step 5: 构建响应
      const sources = context.chunks.map((chunk) => ({
        id: chunk.id,
        title: chunk.metadata.title || '未知文档',
        content: chunk.content.substring(0, 200) + '...',
        similarity: (chunk.metadata as any).similarity || 0,
        metadata: chunk.metadata,
      }))
      
      const latency = Date.now() - startTime
      
      this.logger.log(`RAG 查询完成，耗时：${latency}ms`)
      
      return {
        answer,
        sources,
        query: question,
        latency,
      }
    } catch (error) {
      this.logger.error('RAG 查询失败', error)
      return {
        answer: '抱歉，处理您的问题时遇到了错误。请稍后重试。',
        sources: [],
        query: question,
        latency: Date.now() - startTime,
      }
    }
  }

  /**
   * 获取默认回答（当没有检索到相关内容时）
   */
  private getFallbackAnswer(question: string): string {
    if (question.includes('你是谁')) {
      return '我是基于RAG（检索增强生成）技术的知识库助手。我可以帮助您查询和分析已上传的文档内容，为您提供准确的信息和解答。目前系统中还没有上传任何文档，建议您先上传一些文档以获得更准确的回答。'
    }
    
    return '您好！我已经收到您的问题。由于当前系统中还没有上传具体的知识文档，我暂时无法提供针对性的回答。建议您先通过"知识管理"页面上传一些相关文档，然后我会基于这些文档为您提供准确的回答。'
  }

  /**
   * 检索上下文
   */
  private async retrieveContext(
    query: string, 
    config: RAGConfig
  ): Promise<RAGContext> {
    const startTime = Date.now()
    
    // 向量检索
    let chunks: TextChunk[] = []
    
    if (config.method === 'vector' || config.method === 'hybrid') {
      const vectorResults = await this.langchainService.similaritySearch(query, {
        topK: config.topK * 2, // 多召回一些用于重排序
      })
      chunks = [...chunks, ...vectorResults]
    }
    
    // 去重
    const uniqueChunks = Array.from(
      new Map(chunks.map((c) => [c.id, c])).values()
    )
    
    // 重排序
    let rankedChunks = uniqueChunks
    if (config.rerank && uniqueChunks.length > 1) {
      rankedChunks = await this.rerank(query, uniqueChunks)
    }
    
    // 截取 TopK
    rankedChunks = rankedChunks.slice(0, config.topK)
    
    return {
      chunks: rankedChunks,
      query,
      latency: Date.now() - startTime,
    }
  }

  /**
   * 重排序（使用 Rerank 模型）
   */
  private async rerank(query: string, chunks: TextChunk[]): Promise<TextChunk[]> {
    this.logger.log('执行重排序...')
    
    // 模拟重排序：根据 query 关键词匹配度排序
    const queryWords = query.toLowerCase().split(/[\s,，.]+/).filter(w => w.length > 1)
    
    return chunks.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a.content, queryWords)
      const scoreB = this.calculateRelevanceScore(b.content, queryWords)
      return scoreB - scoreA
    })
  }

  /**
   * 计算相关度分数
   */
  private calculateRelevanceScore(content: string, queryWords: string[]): number {
    const contentLower = content.toLowerCase()
    let score = 0
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        score += 1
      }
    }
    return queryWords.length > 0 ? score / queryWords.length : 0
  }

  /**
   * 构建 Prompt
   */
  private buildPrompt(query: string, context: RAGContext): string {
    const contextText = context.chunks
      .map((chunk, index) => `[${index + 1}] ${chunk.content}`)
      .join('\n\n')
    
    const systemPrompt = `你是一个专业的知识库助手。请基于以下检索到的上下文信息回答问题。

要求：
1. 优先使用上下文中的信息回答
2. 如果上下文中没有相关信息，请如实告知
3. 引用来源时在句末标注 [序号]
4. 保持回答简洁、准确、专业
5. 不要编造信息

上下文信息：
${contextText}

问题：${query}

请用中文回答：`

    return systemPrompt
  }

  /**
   * 调用 LLM 生成答案
   */
  private async generateAnswer(prompt: string, config: RAGConfig): Promise<string> {
    try {
      // 调用 LLM 服务
      const response = await this.thetaLLMService.generate(prompt, {
        temperature: 0.7,
        maxTokens: 2048,
      })
      
      this.logger.log(`LLM 响应：${response.content.substring(0, 100)}...`)
      return response.content
    } catch (error) {
      this.logger.error('LLM 调用失败', error)
      return `抱歉，生成答案时遇到错误：${error.message}。请稍后重试。`
    }
  }

  /**
   * 索引文档
   */
  async indexDocument(document: {
    id: string
    title: string
    content: string
    type: string
    metadata?: Record<string, any>
  }): Promise<{ success: boolean; chunkCount: number }> {
    this.logger.log(`开始索引文档：${document.title}`)
    
    try {
      // 分块
      const chunks = await this.langchainService.chunkText(document.content, {
        documentId: document.id,
        title: document.title,
        type: document.type,
        ...document.metadata,
      })
      
      // 向量化存储
      const result = await this.langchainService.embedAndStore(chunks)
      
      this.logger.log(`文档索引完成：${document.title}, ${result.count} 个向量`)
      
      return {
        success: result.success,
        chunkCount: result.count,
      }
    } catch (error) {
      this.logger.error(`文档索引失败：${document.title}`, error)
      return { success: false, chunkCount: 0 }
    }
  }

  /**
   * 删除文档索引
   */
  async deleteDocument(documentId: string): Promise<{ success: boolean }> {
    this.logger.log(`删除文档索引：${documentId}`)
    return this.langchainService.deleteVectors(documentId)
  }
}