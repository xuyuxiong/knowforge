import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { VectorStoreService } from '../src/modules/vector/vector-store.service'
import { Document } from '../src/entities/document.entity'
import { KnowledgeBase } from '../src/entities/knowledge-base.entity'
import { ConfigService } from '@nestjs/config'

describe('VectorStoreService', () => {
  let service: VectorStoreService
  let documentRepository: Repository<Document>
  let knowledgeBaseRepository: Repository<KnowledgeBase>

  const mockDocumentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    })),
  }

  const mockKnowledgeBaseRepository = {
    findOne: jest.fn(),
  }

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        VECTOR_STORE_PROVIDER: 'memory',
        VECTOR_COLLECTION_NAME: 'documents',
        VECTOR_DIMENSION: 1536,
      }
      return config[key] || defaultValue
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorStoreService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepository,
        },
        {
          provide: getRepositoryToken(KnowledgeBase),
          useValue: mockKnowledgeBaseRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<VectorStoreService>(VectorStoreService)
    documentRepository = module.get<Repository<Document>>(getRepositoryToken(Document))
    
    jest.clearAllMocks()
  })

  describe('addDocument', () => {
    it('应该成功添加文档到向量存储', async () => {
      const doc = {
        id: 'doc-1',
        content: '测试文档内容',
        metadata: { knowledgeBaseId: 'kb-1' },
        embedding: [0.1, 0.2, 0.3],
      }

      mockDocumentRepository.create.mockReturnValue(doc)
      mockDocumentRepository.save.mockResolvedValue(doc)

      await service.addDocument(doc)

      expect(mockDocumentRepository.create).toHaveBeenCalledWith({
        id: 'doc-1',
        content: '测试文档内容',
        metadata: { knowledgeBaseId: 'kb-1' },
        embedding: [0.1, 0.2, 0.3],
        knowledgeBaseId: 'kb-1',
      })
      expect(mockDocumentRepository.save).toHaveBeenCalled()
    })
  })

  describe('addDocuments', () => {
    it('应该批量添加文档', async () => {
      const docs = [
        {
          id: 'doc-1',
          content: '内容1',
          metadata: { knowledgeBaseId: 'kb-1' },
          embedding: [0.1, 0.2],
        },
        {
          id: 'doc-2',
          content: '内容2',
          metadata: { knowledgeBaseId: 'kb-1' },
          embedding: [0.3, 0.4],
        },
      ]

      mockDocumentRepository.save.mockResolvedValue(docs)

      await service.addDocuments(docs)

      expect(mockDocumentRepository.save).toHaveBeenCalledWith([
        {
          id: 'doc-1',
          content: '内容1',
          metadata: { knowledgeBaseId: 'kb-1' },
          embedding: [0.1, 0.2],
          knowledgeBaseId: 'kb-1',
        },
        {
          id: 'doc-2',
          content: '内容2',
          metadata: { knowledgeBaseId: 'kb-1' },
          embedding: [0.3, 0.4],
          knowledgeBaseId: 'kb-1',
        },
      ])
    })
  })

  describe('similaritySearch', () => {
    it('应该返回相似度搜索结果', async () => {
      const queryEmbedding = [0.1, 0.2, 0.3]
      const mockDocuments = [
        {
          id: 'doc-1',
          content: '测试内容1',
          embedding: [0.1, 0.2, 0.3],
          metadata: { title: '文档1' },
        },
        {
          id: 'doc-2',
          content: '测试内容2',
          embedding: [0.4, 0.5, 0.6],
          metadata: { title: '文档2' },
        },
      ]

      mockDocumentRepository.createQueryBuilder().getMany.mockResolvedValue(mockDocuments)

      const results = await service.similaritySearch(queryEmbedding, {
        topK: 10,
        threshold: 0.7,
      })

      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toHaveProperty('score')
      expect(results[0]).toHaveProperty('content')
    })

    it('应该按知识库过滤搜索结果', async () => {
      const queryEmbedding = [0.1, 0.2, 0.3]
      const knowledgeBaseId = 'kb-1'

      mockDocumentRepository.createQueryBuilder().getMany.mockResolvedValue([])

      await service.similaritySearch(queryEmbedding, {
        knowledgeBaseId,
        topK: 5,
      })

      expect(mockDocumentRepository.createQueryBuilder).toHaveBeenCalled()
    })
  })

  describe('deleteDocument', () => {
    it('应该删除指定文档', async () => {
      const docId = 'doc-1'

      mockDocumentRepository.delete.mockResolvedValue({ affected: 1 })

      await service.deleteDocument(docId)

      expect(mockDocumentRepository.delete).toHaveBeenCalledWith(docId)
    })
  })

  describe('getStats', () => {
    it('应该返回文档统计信息', async () => {
      const mockResult = {
        totalDocuments: '10',
        totalContentLength: '5000',
      }

      mockDocumentRepository.createQueryBuilder().getRawOne.mockResolvedValue(mockResult)

      const stats = await service.getStats('kb-1')

      expect(stats).toEqual({
        totalDocuments: 10,
        totalChunks: 10,
        averageChunkSize: 500,
      })
    })
  })

  describe('healthCheck', () => {
    it('应该返回健康检查信息', async () => {
      mockDocumentRepository.count.mockResolvedValue(10)

      const health = await service.healthCheck()

      expect(health).toEqual({
        healthy: true,
        provider: 'memory',
        documentCount: 10,
      })
    })
  })

  describe('cosineSimilarity', () => {
    it('应该计算余弦相似度', () => {
      const vecA = [1, 0, 0]
      const vecB = [1, 0, 0]
      
      const similarity = (service as any).cosineSimilarity(vecA, vecB)
      
      expect(similarity).toBeCloseTo(1, 5)
    })

    it('应该计算正交向量的相似度为0', () => {
      const vecA = [1, 0, 0]
      const vecB = [0, 1, 0]
      
      const similarity = (service as any).cosineSimilarity(vecA, vecB)
      
      expect(similarity).toBeCloseTo(0, 5)
    })

    it('应该抛出维度不匹配的异常', () => {
      const vecA = [1, 0, 0]
      const vecB = [1, 0]
      
      expect(() => {
        (service as any).cosineSimilarity(vecA, vecB)
      }).toThrow('向量维度不匹配')
    })
  })
})