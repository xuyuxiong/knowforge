import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

export interface RerankResult {
  id: string
  originalScore: number
  rerankScore: number
  content: string
  metadata?: Record<string, any>
}

/**
 * 重排序服务
 * 
 * 使用 BGE-Reranker 或交叉编码器模型对检索结果进行重排序
 * 提升 TopK 精度 10-20%
 */
@Injectable()
export class RerankerService {
  private readonly logger = new Logger(RerankerService.name)
  private readonly enabled: boolean
  private readonly apiEndpoint?: string
  private readonly model: string

  constructor(private configService: ConfigService) {
    this.enabled = configService.get('RERANK_ENABLED', 'false') === 'true'
    this.apiEndpoint = configService.get('RERANK_API_ENDPOINT', '')
    this.model = configService.get('RERANK_MODEL', 'bge-reranker-v2-m3')
    
    this.logger.log(
      `Reranker 服务已初始化：enabled=${this.enabled}, model=${this.model}`
    )
  }

  /**
   * 重排序检索结果
   */
  async rerank(
    query: string,
    results: Array<{
      id: string
      content: string
      score?: number
      metadata?: Record<string, any>
    }>,
    options?: { topK?: number }
  ): Promise<RerankResult[]> {
    if (!this.enabled || results.length === 0) {
      // 未启用或无结果，直接返回
      return results.map(r => ({
        id: r.id,
        originalScore: r.score || 0,
        rerankScore: r.score || 0,
        content: r.content,
        metadata: r.metadata,
      }))
    }

    try {
      this.logger.log(`开始重排序：${results.length} 个结果`)

      // 调用重排序 API
      const pairs = results.map((r, i) => [query, r.content])
      
      const response = await axios.post(
        this.apiEndpoint || 'http://localhost:8000/rerank',
        {
          model: this.model,
          pairs,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      )

      const scores: number[] = response.data.scores || []

      // 构建结果
      const rerankedResults: RerankResult[] = results.map((r, i) => ({
        id: r.id,
        originalScore: r.score || 0,
        rerankScore: scores[i] || 0,
        content: r.content,
        metadata: r.metadata,
      }))

      // 按重排序得分降序排列
      rerankedResults.sort((a, b) => b.rerankScore - a.rerankScore)

      // 截取 TopK
      const topK = options?.topK || 5
      const finalResults = rerankedResults.slice(0, topK)

      this.logger.log(
        `重排序完成：${results.length} -> ${finalResults.length} 个结果`
      )

      return finalResults
    } catch (error) {
      this.logger.error('重排序失败', error)
      // 降级：使用原始得分
      return results.map(r => ({
        id: r.id,
        originalScore: r.score || 0,
        rerankScore: r.score || 0,
        content: r.content,
        metadata: r.metadata,
      }))
    }
  }

  /**
   * 简单重排序（本地关键词匹配）
   * 当 API 不可用时的降级方案
   */
  rerankLocally(query: string, results: Array<{
    id: string
    content: string
    score?: number
    metadata?: Record<string, any>
  }>): RerankResult[] {
    this.logger.log('使用本地简单重排序（降级方案）')

    const queryTerms = query.toLowerCase().split(/[\s,，.！？;；]+/).filter(w => w.length > 1)

    const rerankedResults = results.map(r => {
      const contentLower = r.content.toLowerCase()
      let matchScore = 0

      for (const term of queryTerms) {
        if (contentLower.includes(term)) {
          matchScore += 1
        }
      }

      const finalScore = (r.score || 0) * 0.5 + (matchScore / queryTerms.length) * 0.5

      return {
        id: r.id,
        originalScore: r.score || 0,
        rerankScore: finalScore,
        content: r.content,
        metadata: r.metadata,
      }
    })

    rerankedResults.sort((a, b) => b.rerankScore - a.rerankScore)
    return rerankedResults
  }
}