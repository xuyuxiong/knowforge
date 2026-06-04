import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LangchainService, TextChunk } from './langchain.service'
import { BM25Service } from './bm25.service'
import { RerankerService } from './reranker.service'

export interface HybridSearchOptions {
  topK: number
  method: 'vector' | 'keyword' | 'hybrid'
  rerank: boolean
  vectorWeight?: number
  keywordWeight?: number
}

export interface SearchResult {
  id: string
  content: string
  metadata: Record<string, any>
  vectorScore?: number
  keywordScore?: number
  finalScore: number
  source: 'vector' | 'keyword' | 'both'
}

/**
 * 混合检索服务
 * 
 * 支持三种检索模式：
 * - vector: 仅向量检索（语义相似度）
 * - keyword: 仅关键词检索（BM25）
 * - hybrid: 混合检索（向量 + 关键词，加权融合）
 * 
 * 支持重排序提升精度
 */
@Injectable()
export class HybridSearchService {
  private readonly logger = new Logger(HybridSearchService.name)
  private readonly defaultVectorWeight: number = 0.7
  private readonly defaultKeywordWeight: number = 0.3

  constructor(
    private langchainService: LangchainService,
    private bm25Service: BM25Service,
    private rerankerService: RerankerService,
    private configService: ConfigService,
  ) {
    this.logger.log('混合检索服务已初始化')
  }

  /**
   * 混合检索
   */
  async search(
    query: string,
    documents: Array<{ id: string; content: string; title?: string }>,
    options?: HybridSearchOptions
  ): Promise<SearchResult[]> {
    const config: HybridSearchOptions = {
      topK: options?.topK || 5,
      method: options?.method || 'hybrid',
      rerank: options?.rerank ?? true,
      vectorWeight: options?.vectorWeight ?? this.defaultVectorWeight,
      keywordWeight: options?.keywordWeight ?? this.defaultKeywordWeight,
    }

    this.logger.log(`执行 ${config.method} 检索，topK: ${config.topK}`)

    // Step 1: 向量检索
    let vectorResults: SearchResult[] = []
    if (config.method === 'vector' || config.method === 'hybrid') {
      vectorResults = await this.vectorSearch(query, documents)
    }

    // Step 2: 关键词检索
    let keywordResults: SearchResult[] = []
    if (config.method === 'keyword' || config.method === 'hybrid') {
      keywordResults = this.keywordSearch(query, documents)
    }

    // Step 3: 合并结果
    let results: SearchResult[] = []
    if (config.method === 'hybrid') {
      results = this.mergeResults(vectorResults, keywordResults, config)
    } else if (config.method === 'vector') {
      results = vectorResults
    } else {
      results = keywordResults
    }

    // Step 4: 重排序
    if (config.rerank && results.length > 1) {
      results = await this.rerankResults(query, results, config.topK)
    } else {
      results.sort((a, b) => b.finalScore - a.finalScore)
      results = results.slice(0, config.topK)
    }

    this.logger.log(`混合检索完成，返回 ${results.length} 个结果`)
    return results
  }

  /**
   * 向量检索
   */
  private async vectorSearch(
    query: string,
    documents: Array<{ id: string; content: string }>
  ): Promise<SearchResult[]> {
    const chunks = await this.langchainService.similaritySearch(query, {
      topK: documents.length,
    })

    return chunks.map((chunk, i) => ({
      id: chunk.id,
      content: chunk.content,
      metadata: chunk.metadata,
      vectorScore: 1 - i / documents.length,
      finalScore: 1 - i / documents.length,
      source: 'vector' as const,
    }))
  }

  /**
   * 关键词检索
   */
  private keywordSearch(
    query: string,
    documents: Array<{ id: string; content: string; title?: string }>
  ): SearchResult[] {
    this.bm25Service.addDocuments(documents.map(d => ({
      id: d.id,
      content: d.content,
      title: d.title,
      metadata: {},
    })))

    const bm25Results = this.bm25Service.search(query, { topK: documents.length })

    return bm25Results.map(r => ({
      id: r.id,
      content: r.content,
      metadata: r.metadata || {},
      keywordScore: r.score,
      finalScore: r.score,
      source: 'keyword' as const,
    }))
  }

  /**
   * 合并结果（加权融合）
   */
  private mergeResults(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[],
    options: HybridSearchOptions
  ): SearchResult[] {
    const merged = new Map<string, SearchResult>()

    for (const r of vectorResults) {
      merged.set(r.id, r)
    }

    for (const r of keywordResults) {
      const existing = merged.get(r.id)
      if (existing) {
        existing.keywordScore = r.keywordScore
        existing.finalScore =
          (existing.vectorScore || 0) * options.vectorWeight! +
          (r.keywordScore || 0) * options.keywordWeight!
        existing.source = 'both' as const
      } else {
        r.finalScore = (r.keywordScore || 0) * options.keywordWeight!
        merged.set(r.id, r)
      }
    }

    return Array.from(merged.values())
  }

  /**
   * 重排序结果
   */
  private async rerankResults(
    query: string,
    results: SearchResult[],
    topK: number
  ): Promise<SearchResult[]> {
    const rerankInput = results.map(r => ({
      id: r.id,
      content: r.content,
      score: r.finalScore,
      metadata: r.metadata,
    }))

    const reranked = await this.rerankerService.rerank(query, rerankInput, { topK })

    return reranked.map((r, i) => ({
      ...results.find(sr => sr.id === r.id)!,
      finalScore: r.rerankScore,
      metadata: {
        ...r.metadata,
        _rerank: true,
        _rank: i + 1,
      },
    }))
  }

  /**
   * 转换为 TextChunk
   */
  toTextChunks(results: SearchResult[]): TextChunk[] {
    return results.map(r => ({
      id: r.id,
      content: r.content,
      metadata: {
        source: r.metadata.source || 'unknown',
        documentId: r.metadata.documentId || r.id,
        chunkIndex: r.metadata.chunkIndex || 0,
        title: r.metadata.title,
        type: r.metadata.type,
        similarity: r.finalScore,
      },
    }))
  }
}