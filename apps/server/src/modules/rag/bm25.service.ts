import { Injectable, Logger } from '@nestjs/common'
import { Jieba } from '@node-rs/jieba'

export interface BM25Document {
  id: string
  content: string
  title?: string
  metadata?: Record<string, any>
}

export interface BM25Result {
  id: string
  score: number
  content: string
  title?: string
  metadata?: Record<string, any>
}

/**
 * BM25 关键词检索服务
 * 
 * 使用 Okapi BM25 算法进行关键词检索
 * 支持中文分词（jieba）
 */
@Injectable()
export class BM25Service {
  private readonly logger = new Logger(BM25Service.name)
  
  // BM25 参数
  private readonly k1: number = 1.5  // 词频饱和度参数
  private readonly b: number = 0.75   // 文档长度归一化参数
  
  // 索引数据
  private documents: Map<string, BM25Document> = new Map()
  private idf: Map<string, number> = new Map()  // 逆文档频率
  private docLengths: Map<string, number> = new Map()  // 文档长度
  private avgDocLength: number = 0
  private totalDocs: number = 0

  private jieba: any

  constructor() {
    this.logger.log('BM25 服务已初始化')
    try {
      this.jieba = new Jieba()
    } catch (error) {
      this.logger.error('Jieba 初始化失败，将使用降级分词', error)
      this.jieba = null
    }
  }

  /**
   * 添加文档到索引
   */
  addDocument(doc: BM25Document): void {
    this.documents.set(doc.id, doc)
    
    // 计算文档长度（分词后的词数）
    const tokens = this.tokenize(doc.content)
    this.docLengths.set(doc.id, tokens.length)
    
    // 更新平均文档长度
    this.totalDocs = this.documents.size
    const totalLength = Array.from(this.docLengths.values()).reduce((a, b) => a + b, 0)
    this.avgDocLength = totalLength / this.totalDocs
    
    // 更新 IDF
    this.updateIdf(tokens, doc.id)
    
    this.logger.debug(`添加文档到 BM25 索引：${doc.id}, 分词数：${tokens.length}`)
  }

  /**
   * 批量添加文档
   */
  addDocuments(docs: BM25Document[]): void {
    for (const doc of docs) {
      this.addDocument(doc)
    }
    this.logger.log(`批量添加 ${docs.length} 篇文档到 BM25 索引`)
  }

  /**
   * 从索引中删除文档
   */
  removeDocument(docId: string): void {
    this.documents.delete(docId)
    this.docLengths.delete(docId)
    
    // 重新计算 IDF
    this.rebuildIdf()
    
    this.logger.debug(`从 BM25 索引删除文档：${docId}`)
  }

  /**
   * BM25 检索
   */
  search(query: string, options?: { topK?: number; minScore?: number }): BM25Result[] {
    const topK = options?.topK || 10
    const minScore = options?.minScore || 0.001
    
    this.logger.debug(`BM25 检索：${query}`)
    
    // 分词
    const queryTokens = this.tokenize(query)
    
    if (queryTokens.length === 0) {
      return []
    }
    
    // 计算每个文档的得分
    const scores: Array<{ id: string; score: number }> = []
    
    for (const [docId, doc] of this.documents) {
      const score = this.calculateBM25Score(queryTokens, docId)
      if (score > minScore) {
        scores.push({ id: docId, score })
      }
    }
    
    // 排序
    scores.sort((a, b) => b.score - a.score)
    
    // 返回 TopK
    const results: BM25Result[] = []
    for (let i = 0; i < Math.min(topK, scores.length); i++) {
      const doc = this.documents.get(scores[i].id)
      if (doc) {
        results.push({
          id: doc.id,
          score: scores[i].score,
          content: doc.content,
          title: doc.title,
          metadata: doc.metadata,
        })
      }
    }
    
    this.logger.debug(`BM25 检索完成，返回 ${results.length} 个结果`)
    return results
  }

  /**
   * 计算 BM25 得分
   */
  private calculateBM25Score(queryTokens: string[], docId: string): number {
    const docLength = this.docLengths.get(docId) || 0
    
    let score = 0
    for (const token of queryTokens) {
      const idf = this.idf.get(token) || 0
      const tf = this.getTermFrequency(token, docId)
      
      // BM25 公式
      const numerator = tf * (this.k1 + 1)
      const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength))
      
      score += idf * (numerator / denominator)
    }
    
    return score
  }

  /**
   * 获取词频
   */
  private getTermFrequency(term: string, docId: string): number {
    const doc = this.documents.get(docId)
    if (!doc) return 0
    
    const tokens = this.tokenize(doc.content)
    return tokens.filter(t => t === term).length
  }

  /**
   * 更新 IDF
   */
  private updateIdf(tokens: string[], docId: string): void {
    const uniqueTokens = new Set(tokens)
    
    for (const token of uniqueTokens) {
      // 简单 IDF 计算：log(N / df)
      // 这里使用简化版本，实际应该统计包含该词的文档数
      const currentIdf = this.idf.get(token) || 0
      this.idf.set(token, currentIdf + Math.log(this.totalDocs))
    }
  }

  /**
   * 重建 IDF（删除文档后调用）
   */
  private rebuildIdf(): void {
    this.idf.clear()
    
    for (const [docId, doc] of this.documents) {
      const tokens = new Set(this.tokenize(doc.content))
      for (const token of tokens) {
        const currentCount = this.idf.get(token) || 0
        this.idf.set(token, currentCount + 1)
      }
    }
    
    // 计算 IDF
    for (const [token, df] of this.idf) {
      this.idf.set(token, Math.log(this.totalDocs / df))
    }
  }

  /**
   * 中文分词
   */
  private tokenize(text: string): string[] {
    try {
      // 使用 jieba 分词
      if (this.jieba) {
        return this.jieba.cut(text, false)
          .filter((token: string) => token.trim().length > 0)
          .filter((token: string) => !this.isStopWord(token))
      }
      
      // 降级：简单按空格和标点分割
      return text
        .split(/[\s,，.。！？;；:：'"''"")）]+/)
        .filter(token => token.trim().length > 1)
    } catch (error) {
      // 降级：简单按空格和标点分割
      return text
        .split(/[\s,，.。！？;；:：'"''"")）]+/)
        .filter(token => token.trim().length > 1)
    }
  }

  /**
   * 停用词检查
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      '的', '了', '和', '是', '就', '都', '而', '及', '与', '着',
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
      '这', '那', '之', '也', '但', '如果', '因为', '所以',
    ])
    return stopWords.has(word.toLowerCase())
  }

  /**
   * 获取索引统计
   */
  getStats(): {
    totalDocs: number
    avgDocLength: number
    uniqueTerms: number
  } {
    return {
      totalDocs: this.totalDocs,
      avgDocLength: this.avgDocLength,
      uniqueTerms: this.idf.size,
    }
  }
}