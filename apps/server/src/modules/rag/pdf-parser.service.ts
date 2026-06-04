import { Injectable, Logger } from '@nestjs/common'
const pdfParse = require('pdf-parse')

export interface ParsedPdf {
  content: string
  metadata: {
    title?: string
    author?: string
    subject?: string
    keywords?: string
    creator?: string
    producer?: string
    pageCount: number
  }
  pages: string[] // 每页的内容
}

/**
 * PDF 解析服务
 * 
 * 使用 pdf-parse 库解析 PDF 文件
 * 支持文本提取和元数据读取
 */
@Injectable()
export class PdfParserService {
  private readonly logger = new Logger(PdfParserService.name)

  /**
   * 解析 PDF 文件
   */
  async parse(buffer: Buffer, options?: { password?: string }): Promise<ParsedPdf> {
    this.logger.log(`开始解析 PDF, 大小：${buffer.length} bytes`)
    
    try {
      const data = await pdfParse(buffer, {
        password: options?.password,
        max: 0, // 解析所有页面
        version: 'v2.0',
      })
      
      // 按页分割内容（pdf-parse 不直接提供每页内容，需要自己处理）
      // 这里简化处理，将整个内容作为一个整体
      const pages = this.splitIntoPages(data.text, data.numpages)
      
      const result: ParsedPdf = {
        content: data.text,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          subject: data.info?.Subject,
          keywords: data.info?.Keywords,
          creator: data.info?.Creator,
          producer: data.info?.Producer,
          pageCount: data.numpages,
        },
        pages,
      }
      
      this.logger.log(`PDF 解析完成，共 ${data.numpages} 页，内容长度：${data.text.length}`)
      
      return result
    } catch (error) {
      this.logger.error(`PDF 解析失败`, error)
      throw new Error(`PDF 解析失败：${error.message}`)
    }
  }

  /**
   * 将内容按页分割（简化实现）
   */
  private splitIntoPages(content: string, pageCount: number): string[] {
    // 由于 pdf-parse 不保留页面边界，这里按固定长度分割
    // 更好的方式是使用其他库如 pdfjs-dist
    
    const avgPageSize = Math.ceil(content.length / pageCount)
    const pages: string[] = []
    
    for (let i = 0; i < pageCount; i++) {
      const start = i * avgPageSize
      const end = Math.min(start + avgPageSize, content.length)
      pages.push(content.slice(start, end).trim())
    }
    
    return pages.filter(page => page.length > 0)
  }

  /**
   * 从 PDF 提取纯文本（快捷方法）
   */
  async extractText(buffer: Buffer): Promise<string> {
    const result = await this.parse(buffer)
    return result.content
  }
}