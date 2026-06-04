import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { YuqueService, YuqueDoc } from './yuque.service'
import { ConfigService } from '@nestjs/config'

interface SyncState {
  lastFullSyncTime: Date | null
  lastIncrementalSyncTime: Date | null
  syncedDocs: Map<number, string> // docId -> content hash
}

@Injectable()
export class YuqueSyncProcessor implements OnModuleInit {
  private readonly logger = new Logger(YuqueSyncProcessor.name)
  private readonly syncState: SyncState = {
    lastFullSyncTime: null,
    lastIncrementalSyncTime: null,
    syncedDocs: new Map(),
  }

  constructor(
    private yuqueService: YuqueService,
    private configService: ConfigService,
  ) {
    // 从配置加载语雀信息
    const teamLogin = this.configService.get('YUQUE_TEAM_LOGIN')
    const bookSlug = this.configService.get('YUQUE_BOOK_SLUG')
    
    if (teamLogin && bookSlug) {
      this.yuqueService.configure({
        baseUrl: process.env.YUQUE_BASE_URL || 'https://yuque.example.com/api/v2',
        teamLogin,
        bookSlug,
      })
      this.logger.log(`语雀同步处理器已初始化：${teamLogin}/${bookSlug}`)
    } else {
      this.logger.warn('语雀配置缺失，跳过多雀同步')
    }
  }

  async onModuleInit() {
    // 启动时检查是否需要立即同步
    this.logger.log('语雀同步处理器启动')
  }

  /**
   * 全量同步（每天凌晨 2 点）
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async fullSync(): Promise<{ success: boolean; count: number; errors: string[] }> {
    this.logger.log('开始语雀全量同步...')
    const startTime = Date.now()
    const errors: string[] = []
    let successCount = 0

    try {
      // Step 1: 获取所有文档列表
      const docs = await this.yuqueService.getDocList({ limit: 100 })
      this.logger.log(`获取到 ${docs.length} 篇文档`)

      // Step 2: 逐篇处理
      for (const doc of docs) {
        try {
          await this.processDocument(doc)
          successCount++
        } catch (error) {
          this.logger.error(`处理文档失败：${doc.title}`, error)
          errors.push(`文档"${doc.title}"处理失败：${error.message}`)
        }
      }

      // Step 3: 更新同步状态
      this.syncState.lastFullSyncTime = new Date()

      const duration = Date.now() - startTime
      this.logger.log(`语雀全量同步完成：${successCount}/${docs.length}, 耗时 ${duration}ms`)

      return { success: errors.length === 0, count: successCount, errors }
    } catch (error) {
      this.logger.error('语雀全量同步失败', error)
      return { success: false, count: 0, errors: [error.message] }
    }
  }

  /**
   * 增量同步（每 30 分钟）
   */
  @Cron('0 */30 * * * *')
  async incrementalSync(): Promise<{ success: boolean; count: number; errors: string[] }> {
    this.logger.log('开始语雀增量同步...')
    const errors: string[] = []
    let successCount = 0

    try {
      // Step 1: 获取所有文档列表
      const docs = await this.yuqueService.getDocList({ limit: 100 })
      
      // Step 2: 筛选更新的文档
      const updatedDocs = docs.filter((doc) => {
        const lastSynced = this.syncState.lastIncrementalSyncTime
        if (!lastSynced) return true // 首次增量同步，全量处理
        
        return new Date(doc.updatedAt) > lastSynced
      })

      if (updatedDocs.length === 0) {
        this.logger.log('无更新文档')
        return { success: true, count: 0, errors: [] }
      }

      this.logger.log(`发现 ${updatedDocs.length} 篇更新文档`)

      // Step 3: 处理更新的文档
      for (const doc of updatedDocs) {
        try {
          await this.processDocument(doc, true)
          successCount++
        } catch (error) {
          this.logger.error(`处理文档失败：${doc.title}`, error)
          errors.push(`文档"${doc.title}"处理失败：${error.message}`)
        }
      }

      // Step 4: 更新同步状态
      this.syncState.lastIncrementalSyncTime = new Date()

      this.logger.log(`语雀增量同步完成：${successCount} 篇`)
      return { success: errors.length === 0, count: successCount, errors }
    } catch (error) {
      this.logger.error('语雀增量同步失败', error)
      return { success: false, count: 0, errors: [error.message] }
    }
  }

  /**
   * 处理单篇文档
   */
  private async processDocument(doc: YuqueDoc, isUpdate = false): Promise<void> {
    this.logger.log(`${isUpdate ? '更新' : '索引'}文档：${doc.title}`)
    // 这里简化处理，实际应该调用文档服务进行索引
  }

  /**
   * 手动触发全量同步
   */
  async triggerFullSync(): Promise<{ success: boolean; count: number; errors: string[] }> {
    return this.fullSync()
  }

  /**
   * 手动触发增量同步
   */
  async triggerIncrementalSync(): Promise<{ success: boolean; count: number; errors: string[] }> {
    return this.incrementalSync()
  }

  /**
   * 获取同步状态
   */
  getSyncState(): {
    lastFullSyncTime: Date | null
    lastIncrementalSyncTime: Date | null
    syncedDocCount: number
  } {
    return {
      lastFullSyncTime: this.syncState.lastFullSyncTime,
      lastIncrementalSyncTime: this.syncState.lastIncrementalSyncTime,
      syncedDocCount: this.syncState.syncedDocs.size,
    }
  }
}