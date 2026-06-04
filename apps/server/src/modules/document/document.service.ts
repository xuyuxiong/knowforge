import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DocumentParserService, ParsedDocument } from '../rag/document-parser.service'
import { RagCoreService } from '../rag/rag-core.service'

export interface DocumentInfo {
  id: string
  title: string
  type: 'PDF' | 'Word' | 'Markdown' | 'Yuque'
  size: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  chunkCount?: number
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name)
  private readonly storagePath: string

  constructor(
    private configService: ConfigService,
    private parserService: DocumentParserService,
    private ragCoreService: RagCoreService,
  ) {
    this.storagePath = this.configService.get('UPLOAD_PATH', './uploads')
  }

  /**
   * 上传并处理文档
   */
  async uploadAndProcess(file: Express.Multer.File): Promise<DocumentInfo> {
    this.logger.log(`上传并处理文档：${file.originalname}`)
    
    const documentId = Date.now().toString()
    const filePath = `${this.storagePath}/${documentId}-${file.originalname}`
    
    // TODO: 保存文件到存储路径
    // fs.writeFileSync(filePath, file.buffer)
    
    const documentInfo: DocumentInfo = {
      id: documentId,
      title: file.originalname,
      type: this.detectType(file.originalname),
      size: file.size,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    // 异步处理文档
    this.processDocument(documentId, filePath, documentInfo).catch((error) => {
      this.logger.error(`文档处理失败：${documentId}`, error)
      documentInfo.status = 'failed'
    })
    
    return documentInfo
  }

  /**
   * 处理文档（解析 + 索引）
   */
  private async processDocument(
    documentId: string,
    filePath: string,
    documentInfo: DocumentInfo,
  ): Promise<void> {
    try {
      documentInfo.status = 'processing'
      
      // Step 1: 解析文档
      const parsed = await this.parserService.parse(filePath, documentInfo.type.toLowerCase())
      
      // Step 2: 索引到向量库
      const indexResult = await this.ragCoreService.indexDocument({
        id: documentId,
        title: documentInfo.title,
        content: parsed.content,
        type: documentInfo.type,
        metadata: parsed.metadata,
      })
      
      documentInfo.chunkCount = indexResult.chunkCount
      documentInfo.status = indexResult.success ? 'completed' : 'failed'
      
      this.logger.log(`文档处理完成：${documentInfo.title}, ${indexResult.chunkCount} 个块`)
    } catch (error) {
      this.logger.error(`文档处理失败：${documentId}`, error)
      documentInfo.status = 'failed'
      throw error
    } finally {
      documentInfo.updatedAt = new Date()
    }
  }

  /**
   * 解析文档
   */
  async parse(documentId: string, filePath: string, type: string): Promise<ParsedDocument> {
    this.logger.log(`解析文档：${documentId}`)
    return this.parserService.parse(filePath, type)
  }

  /**
   * 删除文档
   */
  async delete(documentId: string): Promise<void> {
    this.logger.log(`删除文档：${documentId}`)
    
    // TODO: 删除文件
    // fs.unlinkSync(filePath)
    
    // 删除向量索引
    await this.ragCoreService.deleteDocument(documentId)
  }

  /**
   * 上传文档（简化版本）
   */
  async upload(file: Express.Multer.File): Promise<DocumentInfo> {
    return this.uploadAndProcess(file)
  }

  /**
   * 根据源ID查找文档
   */
  async findBySourceId(sourceId: string): Promise<DocumentInfo | null> {
    // TODO: 实现从数据库查询
    return null
  }

  /**
   * 保存语雀文档
   */
  async saveYuqueDoc(data: {
    id: string
    title: string
    content: string
    sourceId: string
    slug: string
    createdAt: Date
    updatedAt: Date
  }): Promise<void> {
    this.logger.log(`保存语雀文档：${data.title}`)
    // TODO: 实现保存到数据库
  }

  /**
   * 获取文档列表
   */
  async list(params?: {
    page?: number
    size?: number
    type?: string
    status?: string
  }): Promise<{ total: number; items: DocumentInfo[] }> {
    this.logger.log(`获取文档列表`)
    
    // TODO: 从数据库查询
    // const query = this.repo.createQueryBuilder('document')
    // if (params.type) query.andWhere('type = :type', { type: params.type })
    // if (params.status) query.andWhere('status = :status', { status: params.status })
    
    return { total: 0, items: [] }
  }

  /**
   * 检测文件类型
   */
  private detectType(filename: string): DocumentInfo['type'] {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
        return 'PDF'
      case 'doc':
      case 'docx':
        return 'Word'
      case 'md':
      case 'markdown':
        return 'Markdown'
      default:
        throw new BadRequestException(`不支持的文件类型：${ext}`)
    }
  }
}