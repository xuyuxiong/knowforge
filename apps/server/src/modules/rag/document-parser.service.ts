import { Injectable, Logger } from '@nestjs/common'
import { PdfParserService, ParsedPdf } from './pdf-parser.service'
import { WordParserService, ParsedWord } from './word-parser.service'
import * as fs from 'fs'
import * as path from 'path'

export interface ParsedDocument {
  content: string
  metadata: {
    title: string
    author?: string
    createdAt?: string
    updatedAt?: string
    pageCount?: number
    wordCount?: number
    source?: string
  }
  images?: Array<{
    id: string
    base64?: string
    path?: string
    caption?: string
    description?: string
  }>
  tables?: Array<{
    id: string
    markdown: string
    headers: string[]
    rows: string[][]
  }>
}

/**
 * 文档解析服务（统一入口）
 * 
 * 支持格式：
 * - PDF (pdf-parse)
 * - Word (mammoth)
 * - Markdown (原生)
 * - TXT (原生)
 */
@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name)

  constructor(
    private pdfParser: PdfParserService,
    private wordParser: WordParserService,
  ) {}

  /**
   * 根据文件类型解析文档
   */
  async parse(
    filePathOrBuffer: string | Buffer,
    fileType: string,
    filename?: string
  ): Promise<ParsedDocument> {
    this.logger.log(`解析文档，类型：${fileType}`)

    const buffer = typeof filePathOrBuffer === 'string'
      ? fs.readFileSync(filePathOrBuffer)
      : filePathOrBuffer

    switch (fileType.toLowerCase()) {
      case 'pdf':
        return this.parsePDF(buffer, filename)
      case 'doc':
      case 'docx':
        return this.parseWord(buffer, filename)
      case 'md':
      case 'markdown':
        return this.parseMarkdown(buffer, filename)
      case 'txt':
        return this.parseText(buffer, filename)
      default:
        throw new Error(`不支持的文件类型：${fileType}`)
    }
  }

  /**
   * 解析 PDF 文件
   */
  private async parsePDF(buffer: Buffer, filename?: string): Promise<ParsedDocument> {
    const result: ParsedPdf = await this.pdfParser.parse(buffer)
    
    return {
      content: result.content,
      metadata: {
        title: result.metadata.title || filename || '未命名 PDF',
        author: result.metadata.author,
        pageCount: result.metadata.pageCount,
        wordCount: result.content.split(/\s+/).length,
        source: 'pdf',
      },
    }
  }

  /**
   * 解析 Word 文档
   */
  private async parseWord(buffer: Buffer, filename?: string): Promise<ParsedDocument> {
    const result: ParsedWord = await this.wordParser.parse(buffer, {
      includeImages: false,
    })
    
    return {
      content: result.content,
      metadata: {
        title: result.metadata.title || filename || '未命名文档',
        author: result.metadata.author,
        wordCount: result.content.split(/\s+/).length,
        source: 'word',
      },
    }
  }

  /**
   * 解析 Markdown 文件
   */
  private async parseMarkdown(buffer: Buffer, filename?: string): Promise<ParsedDocument> {
    const content = buffer.toString('utf-8')
    const frontMatter = this.extractFrontMatter(content)
    
    return {
      content: frontMatter.content,
      metadata: {
        title: frontMatter.metadata.title || filename || '未命名文档',
        author: frontMatter.metadata.author,
        createdAt: frontMatter.metadata.date,
        updatedAt: frontMatter.metadata.updated,
        wordCount: content.split(/\s+/).length,
        source: 'markdown',
      },
      // 提取代码块和表格
      ...this.extractSpecialBlocks(content),
    }
  }

  /**
   * 解析纯文本文件
   */
  private async parseText(buffer: Buffer, filename?: string): Promise<ParsedDocument> {
    const content = buffer.toString('utf-8')
    
    return {
      content,
      metadata: {
        title: filename || '未命名文档',
        wordCount: content.split(/\s+/).length,
        source: 'text',
      },
    }
  }

  /**
   * 提取 Markdown Front Matter
   */
  private extractFrontMatter(content: string): {
    content: string
    metadata: Record<string, string>
  } {
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
    const match = content.match(frontMatterRegex)
    
    if (!match) {
      return { content, metadata: {} }
    }
    
    const metadataBlock = match[1]
    const markdownContent = match[2]
    
    const metadata: Record<string, string> = {}
    const lines = metadataBlock.split('\n')
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':')
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim()
        metadata[key.trim()] = value.replace(/^["']|["']$/g, '')
      }
    }
    
    return { content: markdownContent, metadata }
  }

  /**
   * 提取特殊块（代码块和表格）
   */
  private extractSpecialBlocks(content: string): {
    images?: any[]
    tables?: Array<{
      id: string
      markdown: string
      headers: string[]
      rows: string[][]
    }>
  } {
    const tables = this.extractTables(content)
    
    return {
      images: [],
      tables: tables.length > 0 ? tables : undefined,
    }
  }

  /**
   * 提取表格（Markdown 格式）
   */
  private extractTables(content: string): Array<{
    id: string
    markdown: string
    headers: string[]
    rows: string[][]
  }> {
    const tableRegex = /(\|[^|\n]+\|([^|\n]*\|)*[^|\n]*\n)((?:\|[-:]+\|)+\n)((?:\|[^|\n]+\|([^|\n]*\|)*[^|\n]*\n)*)/g
    const tables: Array<{
      id: string
      markdown: string
      headers: string[]
      rows: string[][]
    }> = []
    
    let match
    let index = 0
    while ((match = tableRegex.exec(content)) !== null) {
      const headerLine = match[1]
      const rows = match[4].split('\n').filter(line => line.trim())
      
      const headers = headerLine.split('|').filter(cell => cell.trim()).map(h => h.trim())
      const tableRows = rows.map(row => 
        row.split('|').filter(cell => cell.trim()).map(cell => cell.trim())
      )
      
      tables.push({
        id: `table-${index++}`,
        markdown: match[0],
        headers,
        rows: tableRows,
      })
    }
    
    return tables
  }

  /**
   * 将表格转换为自然语言描述
   */
  tableToDescription(table: {
    headers: string[]
    rows: string[][]
  }): string {
    const headerText = table.headers.join('、')
    const rowCount = table.rows.length
    
    let description = `表格包含 ${headerText} 共${rowCount}条记录。`
    
    // 简单描述前几行
    for (let i = 0; i < Math.min(3, table.rows.length); i++) {
      const row = table.rows[i]
      const cells = table.headers.map((h, j) => `${h}:${row[j] || 'N/A'}`).join(', ')
      description += `第${i + 1}行：${cells}。`
    }
    
    return description
  }
}