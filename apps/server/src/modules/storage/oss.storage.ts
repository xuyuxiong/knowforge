import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import * as path from 'path'

let OSS: any = null

@Injectable()
export class OssStorageStrategy {
  private readonly logger = new Logger(OssStorageStrategy.name)
  private enabled: boolean
  private client: any = null
  
  private readonly bucket: string
  private readonly region: string
  private readonly accessKeyId: string
  private readonly accessKeySecret: string
  private readonly cdnBaseUrl: string

  constructor(private configService: ConfigService) {
    this.enabled = configService.get('OSS_ENABLED', 'false') === 'true'
    this.bucket = configService.get('OSS_BUCKET', '')
    this.region = configService.get('OSS_REGION', 'oss-cn-hangzhou')
    this.accessKeyId = configService.get('OSS_ACCESS_KEY_ID', '')
    this.accessKeySecret = configService.get('OSS_ACCESS_KEY_SECRET', '')
    this.cdnBaseUrl = configService.get('OSS_CDN_URL', `https://${this.bucket}.${this.region}.aliyuncs.com`)
    
    if (this.enabled && this.bucket && this.accessKeyId && this.accessKeySecret) {
      this.initializeClient()
    }
    
    this.logger.log(`OSS 存储已初始化: enabled=${this.enabled}, bucket=${this.bucket}`)
  }

  private initializeClient() {
    try {
      OSS = require('ali-oss')
      this.client = new OSS({
        region: this.region,
        accessKeyId: this.accessKeyId,
        accessKeySecret: this.accessKeySecret,
        bucket: this.bucket,
      })
      this.logger.log('OSS 客户端初始化成功')
    } catch (error) {
      this.logger.error('OSS 客户端初始化失败', error)
      this.enabled = false
    }
  }

  async upload(
    file: Express.Multer.File,
    category: string,
    options?: { keepOriginalName?: boolean }
  ): Promise<{
    url: string
    path: string
    size: number
    provider: 'oss'
  }> {
    if (!this.enabled || !this.client) {
      throw new Error('OSS 存储未启用')
    }

    // 生成唯一文件名
    const ext = path.extname(file.originalname)
    const timestamp = Date.now()
    const random = crypto.randomBytes(4).toString('hex')
    
    const objectKey = options?.keepOriginalName
      ? `${category}/${file.originalname}`
      : `${category}/${timestamp}-${random}${ext}`
    
    try {
      // 上传到 OSS
      const result = await this.client.put(objectKey, file.buffer)
      
      const url = this.cdnBaseUrl + '/' + objectKey
      
      this.logger.log(`OSS 上传成功：${objectKey}, 大小：${file.size} bytes`)
      
      return {
        url,
        path: objectKey,
        size: file.size,
        provider: 'oss',
      }
    } catch (error) {
      this.logger.error(`OSS 上传失败：${objectKey}`, error)
      throw error
    }
  }

  async download(objectKey: string): Promise<Buffer> {
    if (!this.enabled || !this.client) {
      throw new Error('OSS 存储未启用')
    }

    try {
      const result = await this.client.get(objectKey)
      return result.content as Buffer
    } catch (error) {
      this.logger.error(`OSS 下载失败：${objectKey}`, error)
      throw error
    }
  }

  getUrl(objectKey: string): string {
    return `${this.cdnBaseUrl}/${objectKey}`
  }

  async delete(objectKey: string): Promise<void> {
    if (!this.enabled || !this.client) {
      return
    }

    try {
      await this.client.delete(objectKey)
      this.logger.log(`OSS 删除成功：${objectKey}`)
    } catch (error) {
      this.logger.error(`OSS 删除失败：${objectKey}`, error)
      throw error
    }
  }

  async exists(objectKey: string): Promise<boolean> {
    if (!this.enabled || !this.client) {
      return false
    }

    try {
      await this.client.head(objectKey)
      return true
    } catch (error) {
      return false
    }
  }
}