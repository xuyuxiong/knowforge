import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

@Injectable()
export class LocalStorageStrategy {
  private readonly logger = new Logger(LocalStorageStrategy.name)
  private readonly uploadPath: string
  private readonly baseUrl: string

  constructor(private configService: ConfigService) {
    this.uploadPath = configService.get('UPLOAD_PATH', './uploads')
    this.baseUrl = configService.get('UPLOAD_BASE_URL', '/uploads')
    
    // 确保上传目录存在
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true })
      this.logger.log(`创建上传目录：${this.uploadPath}`)
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
    provider: 'local'
  }> {
    // 生成唯一文件名
    const ext = path.extname(file.originalname)
    const timestamp = Date.now()
    const random = crypto.randomBytes(4).toString('hex')
    
    const filename = options?.keepOriginalName
      ? file.originalname
      : `${category}/${timestamp}-${random}${ext}`
    
    const filePath = path.join(this.uploadPath, filename)
    const dirPath = path.dirname(filePath)
    
    // 确保目录存在
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    
    // 写入文件
    await fs.promises.writeFile(filePath, file.buffer)
    
    const url = `${this.baseUrl}/${filename}`
    
    this.logger.log(`文件上传成功：${filename}, 大小：${file.size} bytes`)
    
    return {
      url,
      path: filePath,
      size: file.size,
      provider: 'local',
    }
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.uploadPath, filePath)
    return fs.promises.readFile(fullPath)
  }

  getUrl(filePath: string): string {
    const relativePath = path.isAbsolute(filePath)
      ? path.relative(this.uploadPath, filePath)
      : filePath
    
    return `${this.baseUrl}/${relativePath}`
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.uploadPath, filePath)
    
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath)
      this.logger.log(`文件已删除：${filePath}`)
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.uploadPath, filePath)
    return fs.existsSync(fullPath)
  }
}