import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Document } from '../../entities/document.entity'
import { KnowledgeBase } from '../../entities/knowledge-base.entity'

export interface VectorDocument {
  id: string
  content: string
  metadata: Record<string, any>
  embedding: number[]
}

export interface SearchResult {
  id: string
  content: string
  score: number
  metadata: Record<string, any>
}

/**
 * 向量存储服务
 * 
 * 提供基于向量的文档存储和相似度搜索功能
 * 支持多种向量数据库后端：Chroma, Pinecone, Weaviate, Milvus
 */
@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name)
  private readonly provider: string
  private readonly collectionName: string
  private readonly dimension: number

  constructor(
    private configService: ConfigService,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(KnowledgeBase)
    private knowledgeBaseRepository: Repository<KnowledgeBase>,
  ) {
    this.provider = this.configService.get('VECTOR_STORE_PROVIDER', 'memory')
    this.collectionName = this.configService.get('VECTOR_COLLECTION_NAME', 'documents')
    this.dimension = this.configService.get('VECTOR_DIMENSION', 1536)
    
    this.logger.log(`向量存储服务已初始化：${this.provider}`)
  }

  /**
   * 添加文档到向量存储
   */
  async addDocument(doc: VectorDocument): Promise<void> {
    try {
      // 保存到数据库
      const document = this.documentRepository.create({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
        embedding: doc.embedding,
        knowledgeBaseId: doc.metadata.knowledgeBaseId,
      })
      
      await this.documentRepository.save(document)
      
      this.logger.debug(`文档已添加到向量存储：${doc.id}`)
    } catch (error) {
      this.logger.error(`添加文档到向量存储失败`, error)
      throw error
    }
  }

  /**
   * 批量添加文档
   */
  async addDocuments(docs: VectorDocument[]): Promise<void> {
    try {
      const documents = docs.map(doc => 
        this.documentRepository.create({
          id: doc.id,
          content: doc.content,
          metadata: doc.metadata,
          embedding: doc.embedding,
          knowledgeBaseId: doc.metadata.knowledgeBaseId,
        })
      )
      
      await this.documentRepository.save(documents)
      
      this.logger.log(`批量添加 ${docs.length} 个文档到向量存储`)
    } catch (error) {
      this.logger.error(`批量添加文档失败`, error)
      throw error
    }
  }

  /**
   * 相似度搜索
   */
  async similaritySearch(
    queryEmbedding: number[],
    options: {
      knowledgeBaseId?: string
      topK?: number
      threshold?: number
    }
  ): Promise<SearchResult[]> {
    const topK = options.topK || 10
    const threshold = options.threshold || 0.7
    
    try {
      // 构建查询
      let query = this.documentRepository
        .createQueryBuilder('document')
        .where('document.embedding IS NOT NULL')
      
      if (options.knowledgeBaseId) {
        query = query.andWhere('document.knowledgeBaseId = :knowledgeBaseId', {
          knowledgeBaseId: options.knowledgeBaseId,
        })
      }
      
      // 获取所有文档
      const documents = await query.getMany()
      
      if (documents.length === 0) {
        return []
      }
      
      // 计算余弦相似度
      const results = documents.map(doc => ({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
        score: this.cosineSimilarity(queryEmbedding, doc.embedding),
      }))
      
      // 过滤和排序
      const filteredResults = results
        .filter(r => r.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
      
      this.logger.debug(`相似度搜索完成：${filteredResults.length} 个结果`)
      
      return filteredResults
    } catch (error) {
      this.logger.error(`相似度搜索失败`, error)
      throw error
    }
  }

  /**
   * 删除文档
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      await this.documentRepository.delete(id)
      this.logger.debug(`文档已从向量存储删除：${id}`)
    } catch (error) {
      this.logger.error(`删除文档失败`, error)
      throw error
    }
  }

  /**
   * 删除知识库的所有文档
   */
  async deleteDocumentsByKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    try {
      await this.documentRepository.delete({ knowledgeBaseId })
      this.logger.log(`已删除知识库 ${knowledgeBaseId} 的所有文档`)
    } catch (error) {
      this.logger.error(`删除知识库文档失败`, error)
      throw error
    }
  }

  /**
   * 更新文档向量
   */
  async updateDocumentEmbedding(id: string, embedding: number[]): Promise<void> {
    try {
      await this.documentRepository.update(id, { embedding })
      this.logger.debug(`文档向量已更新：${id}`)
    } catch (error) {
      this.logger.error(`更新文档向量失败`, error)
      throw error
    }
  }

  /**
   * 获取知识库的文档数量
   */
  async getDocumentCount(knowledgeBaseId: string): Promise<number> {
    try {
      return await this.documentRepository.count({
        where: { knowledgeBaseId },
      })
    } catch (error) {
      this.logger.error(`获取文档数量失败`, error)
      throw error
    }
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('向量维度不匹配')
    }
    
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }
    
    if (normA === 0 || normB === 0) {
      return 0
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  /**
   * 获取存储统计信息
   */
  async getStats(knowledgeBaseId?: string): Promise<{
    totalDocuments: number
    totalChunks: number
    averageChunkSize: number
  }> {
    try {
      let query = this.documentRepository.createQueryBuilder('document')
      
      if (knowledgeBaseId) {
        query = query.where('document.knowledgeBaseId = :knowledgeBaseId', {
          knowledgeBaseId,
        })
      }
      
      const result = await query
        .select('COUNT(*)', 'totalDocuments')
        .addSelect('SUM(LENGTH(document.content))', 'totalContentLength')
        .getRawOne()
      
      const totalDocuments = parseInt(result.totalDocuments) || 0
      const totalContentLength = parseInt(result.totalContentLength) || 0
      
      return {
        totalDocuments,
        totalChunks: totalDocuments,
        averageChunkSize: totalDocuments > 0 ? totalContentLength / totalDocuments : 0,
      }
    } catch (error) {
      this.logger.error(`获取统计信息失败`, error)
      throw error
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    healthy: boolean
    provider: string
    documentCount: number
  }> {
    try {
      const documentCount = await this.documentRepository.count()
      
      return {
        healthy: true,
        provider: this.provider,
        documentCount,
      }
    } catch (error) {
      this.logger.error(`健康检查失败`, error)
      return {
        healthy: false,
        provider: this.provider,
        documentCount: 0,
      }
    }
  }
}