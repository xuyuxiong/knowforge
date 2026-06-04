import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import axios from 'axios'
import { DocumentService } from '../document/document.service'

export interface YuqueConfig {
  baseUrl: string
  teamLogin: string
  bookSlug: string
  token?: string
}

export interface YuqueDoc {
  id: number
  title: string
  slug: string
  body: string
  createdAt: string
  updatedAt: string
}

@Injectable()
export class YuqueService {
  private readonly logger = new Logger(YuqueService.name)
  private readonly baseUrl = process.env.YUQUE_BASE_URL || 'https://yuque.example.com/api/v2'
  private config: YuqueConfig | null = null

  constructor(private readonly documentService: DocumentService) {}

  private get axiosInstance() {
    const instance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'RAG-Knowledge-Base/1.0',
      },
    })

    // 添加请求拦截器
    instance.interceptors.request.use(
      (config) => {
        if (this.config?.token) {
          config.headers['X-Auth-Token'] = this.config.token
        }
        return config
      },
      (error) => Promise.reject(error),
    )

    // 添加响应拦截器
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logger.error('语雀认证失败，请检查token配置')
        } else if (error.response?.status === 404) {
          this.logger.error('语雀知识库或文档不存在')
        } else if (error.code === 'ECONNABORTED') {
          this.logger.error('语雀API请求超时')
        }
        return Promise.reject(error)
      },
    )

    return instance
  }

  /**
   * 配置语雀连接
   */
  configure(config: YuqueConfig): void {
    this.config = config
    this.logger.log(`语雀配置已更新：team=${config.teamLogin}, book=${config.bookSlug}`)
  }

  /**
   * 获取知识库详情
   */
  async getRepo(): Promise<any> {
    if (!this.config) {
      throw new Error('语雀未配置')
    }
    const { data } = await axios.get(
      `${this.baseUrl}/repos/${this.config.teamLogin}/${this.config.bookSlug}`,
    )
    return data.data
  }

  /**
   * 获取文档列表
   */
  async getDocList(params?: { limit?: number; offset?: number }): Promise<YuqueDoc[]> {
    if (!this.config) {
      throw new Error('语雀未配置')
    }
    const { data } = await axios.get(
      `${this.baseUrl}/repos/${this.config.teamLogin}/${this.config.bookSlug}/docs`,
      { params },
    )
    return data.data
  }

  /**
   * 获取文档内容
   */
  async getDocContent(docId: number, raw = true): Promise<YuqueDoc> {
    if (!this.config) {
      throw new Error('语雀未配置')
    }
    const { data } = await axios.get(
      `${this.baseUrl}/repos/${this.config.teamLogin}/${this.config.bookSlug}/docs/${docId}`,
      { params: { raw: raw ? 1 : 0 } },
    )
    return data.data
  }

  /**
   * 获取目录结构
   */
  async getToc(): Promise<any> {
    if (!this.config) {
      throw new Error('语雀未配置')
    }
    const { data } = await axios.get(
      `${this.baseUrl}/repos/${this.config.teamLogin}/${this.config.bookSlug}/toc`,
    )
    return data.data
  }

  /**
   * 全量同步（定时任务）
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async fullSync(): Promise<void> {
    this.logger.log('开始语雀全量同步...')
    try {
      const docs = await this.getDocList()
      this.logger.log(`获取到 ${docs.length} 篇文档`)
      
      let successCount = 0
      let errorCount = 0
      
      for (const doc of docs) {
        try {
          await this.syncSingleDoc(doc)
          successCount++
          this.logger.log(`✅ 同步成功：${doc.title}`)
        } catch (error) {
          errorCount++
          this.logger.error(`❌ 同步失败：${doc.title}`, error)
        }
      }
      
      this.logger.log(`语雀全量同步完成：成功 ${successCount} 篇，失败 ${errorCount} 篇`)
    } catch (error) {
      this.logger.error('语雀全量同步失败', error)
    }
  }

  /**
   * 同步单个文档
   */
  private async syncSingleDoc(doc: YuqueDoc): Promise<void> {
    const fullDoc = await this.getDocContent(doc.id)
    
    // 检查是否已存在该文档
    const existingDoc = await this.documentService.findBySourceId(doc.id.toString())
    
    if (existingDoc) {
      // 检查是否需要更新（比较更新时间）
      const existingUpdatedAt = new Date(existingDoc.updatedAt)
      const newUpdatedAt = new Date(fullDoc.updatedAt)
      
      if (newUpdatedAt <= existingUpdatedAt) {
        this.logger.debug(`文档无需更新：${fullDoc.title}`)
        return
      }
      
      this.logger.log(`更新文档：${fullDoc.title}`)
    } else {
      this.logger.log(`创建新文档：${fullDoc.title}`)
    }
    
    // 创建或更新文档记录
    await this.documentService.saveYuqueDoc({
      id: existingDoc?.id || `yuque_${doc.id}`,
      title: fullDoc.title,
      content: fullDoc.body,
      sourceId: doc.id.toString(),
      slug: doc.slug,
      createdAt: new Date(fullDoc.createdAt),
      updatedAt: new Date(fullDoc.updatedAt),
    })
  }

  /**
   * 增量同步（每 30 分钟）
   */
  @Cron('0 */30 * * * *')
  async incrementalSync(): Promise<void> {
    this.logger.log('开始语雀增量同步...')
    
    try {
      // 获取最近更新的文档（按更新时间排序）
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
      const docs = await this.getDocList({ limit: 100 })
      
      let updatedCount = 0
      
      for (const doc of docs) {
        const docUpdatedAt = new Date(doc.updatedAt)
        
        // 只处理最近30分钟内更新的文档
        if (docUpdatedAt > thirtyMinutesAgo) {
          try {
            await this.syncSingleDoc(doc)
            updatedCount++
            this.logger.log(`🔄 增量更新：${doc.title}`)
          } catch (error) {
            this.logger.error(`❌ 增量更新失败：${doc.title}`, error)
          }
        }
      }
      
      this.logger.log(`语雀增量同步完成：更新 ${updatedCount} 篇文档`)
    } catch (error) {
      this.logger.error('语雀增量同步失败', error)
    }
  }
}