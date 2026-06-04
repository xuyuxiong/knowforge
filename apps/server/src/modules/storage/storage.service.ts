import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LocalStorageStrategy } from './local.storage'
import { OssStorageStrategy } from './oss.storage'

export interface UploadResult {
  url: string
  path: string
  size: number
  provider: 'local' | 'oss'
}

/**
 * 文件存储服务
 * 
 * 支持：
 * - 本地存储（开发环境）
 * - 阿里云 OSS（生产环境）
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private readonly provider: 'local' | 'oss'
  
  constructor(
    private configService: ConfigService,
    private localStorage: LocalStorageStrategy,
    private ossStorage: OssStorageStrategy,
  ) {
    this.provider = configService.get('STORAGE_PROVIDER', 'local') as 'local' | 'oss'
    this.logger.log(`文件存储已初始化：${this.provider}`)
  }

  /**
   * 上传文件
   */
  async upload(
    file: Express.Multer.File,
    options?: { category?: string; keepOriginalName?: boolean }
  ): Promise<UploadResult> {
    const category = options?.category || 'uploads'
    
    if (this.provider === 'oss') {
      return this.ossStorage.upload(file, category, options)
    }
    
    return this.localStorage.upload(file, category, options)
  }

  /**
   * 下载文件
   */
  async download(path: string): Promise<Buffer> {
    if (this.provider === 'oss') {
      return this.ossStorage.download(path)
    }
    
    return this.localStorage.download(path)
  }

  /**
   * 获取文件 URL
   */
  getUrl(path: string): string {
    if (this.provider === 'oss') {
      return this.ossStorage.getUrl(path)
    }
    
    return this.localStorage.getUrl(path)
  }

  /**
   * 删除文件
   */
  async delete(path: string): Promise<void> {
    if (this.provider === 'oss') {
      return this.ossStorage.delete(path)
    }
    
    return this.localStorage.delete(path)
  }

  /**
   * 检查文件是否存在
   */
  async exists(path: string): Promise<boolean> {
    if (this.provider === 'oss') {
      return this.ossStorage.exists(path)
    }
    
    return this.localStorage.exists(path)
  }
}