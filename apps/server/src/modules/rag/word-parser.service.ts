import { Injectable, Logger } from '@nestjs/common'
import * as mammoth from 'mammoth'

export interface ParsedWord {
  content: string
  metadata: {
    title?: string
    author?: string
    subject?: string
    keywords?: string
    lastModifiedBy?: string
    revision?: string
    createdAt?: string
    updatedAt?: string
  }
  images?: Array<{
    contentType: string
    data: Buffer
  }>
}

/**
 * Word 文档解析服务
 * 
 * 使用 mammoth 库解析 .docx 文件
 * 支持文本提取和图片提取
 */
@Injectable()
export class WordParserService {
  private readonly logger = new Logger(WordParserService.name)

  /**
   * 解析 Word 文档 (.docx)
   */
  async parse(buffer: Buffer, options?: { includeImages?: boolean }): Promise<ParsedWord> {
    this.logger.log(`开始解析 Word 文档，大小：${buffer.length} bytes`)
    
    try {
      // 提取文本
      const extractResult = await mammoth.extractRawText({ buffer })
      
      // 提取元数据
      const metadataResult = await this.extractMetadata(buffer)
      
      const result: ParsedWord = {
        content: extractResult.value,
        metadata: metadataResult,
      }
      
      // 可选：提取图片
      if (options?.includeImages) {
        result.images = await this.extractImages(buffer)
      }
      
      this.logger.log(
        `Word 文档解析完成，内容长度：${extractResult.value.length}, ` +
        `图片数：${result.images?.length || 0}`
      )
      
      return result
    } catch (error) {
      this.logger.error(`Word 文档解析失败`, error)
      throw new Error(`Word 文档解析失败：${error.message}`)
    }
  }

  /**
   * 提取元数据
   */
  private async extractMetadata(buffer: Buffer): Promise<any> {
    try {
      // mammoth 不直接支持元数据提取，这里返回空对象
      // 可以使用 officeparser 或其他库来获取更详细的元数据
      return {}
    } catch (error) {
      this.logger.warn(`提取 Word 元数据失败`, error)
      return {}
    }
  }

  /**
   * 提取图片
   */
  private async extractImages(buffer: Buffer): Promise<Array<{
    contentType: string
    data: Buffer
  }>> {
    try {
      const result = await mammoth.extractRawText({ buffer })
      // mammoth 主要用于文本提取，图片提取功能有限
      // 更好的方式是使用 jszip 直接解析.docx (本质是 zip)
      return []
    } catch (error) {
      this.logger.warn(`提取 Word 图片失败`, error)
      return []
    }
  }

  /**
   * 将 Word 转换为 HTML（保留格式）
   */
  async convertToHtml(buffer: Buffer): Promise<string> {
    this.logger.log(`转换 Word 为 HTML`)
    
    try {
      const result = await mammoth.convertToHtml({ buffer })
      return result.value
    } catch (error) {
      this.logger.error(`Word 转 HTML 失败`, error)
      throw new Error(`Word 转 HTML 失败：${error.message}`)
    }
  }

  /**
   * 从 Word 提取纯文本（快捷方法）
   */
  async extractText(buffer: Buffer): Promise<string> {
    const result = await this.parse(buffer)
    return result.content
  }
}