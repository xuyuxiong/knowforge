import { Injectable, Logger } from '@nestjs/common'
import * as XLSX from 'xlsx'

export interface ParsedExcel {
  content: string
  metadata: {
    title?: string
    creator?: string
    createdAt?: string
    modifiedAt?: string
    sheetCount: number
  }
  sheets: Array<{
    name: string
    content: string
    rowCount: number
    colCount: number
  }>
}

/**
 * Excel 解析服务
 * 
 * 使用 xlsx 库解析 Excel 文件 (.xlsx, .xls)
 * 支持工作表内容提取和元数据读取
 */
@Injectable()
export class ExcelParserService {
  private readonly logger = new Logger(ExcelParserService.name)

  /**
   * 解析 Excel 文件
   */
  async parse(buffer: Buffer): Promise<ParsedExcel> {
    this.logger.log(`开始解析 Excel，大小：${buffer.length} bytes`)
    
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      
      const sheets = workbook.SheetNames.map(sheetName => {
        const worksheet = workbook.Sheets[sheetName]
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1')
        
        // 提取表格内容
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        const content = this.formatTableContent(data as any[][])
        
        return {
          name: sheetName,
          content,
          rowCount: range.e.r - range.s.r + 1,
          colCount: range.e.c - range.s.c + 1,
        }
      })
      
      const result: ParsedExcel = {
        content: sheets.map(s => `## ${s.name}\n${s.content}`).join('\n\n'),
        metadata: {
          title: workbook.Props?.Title,
          creator: workbook.Props?.Creator,
          createdAt: workbook.Props?.CreatedDate?.toISOString(),
          modifiedAt: workbook.Props?.ModifiedDate?.toISOString(),
          sheetCount: sheets.length,
        },
        sheets,
      }
      
      this.logger.log(`Excel 解析完成，共 ${sheets.length} 个工作表`)
      
      return result
    } catch (error) {
      this.logger.error(`Excel 解析失败`, error)
      throw new Error(`Excel 解析失败：${error.message}`)
    }
  }

  /**
   * 格式化表格内容为文本
   */
  private formatTableContent(data: any[][]): string {
    if (!data || data.length === 0) return ''
    
    // 转换为 Markdown 表格格式
    let content = ''
    
    // 表头
    if (data.length > 0) {
      const headers = data[0] || []
      content += '| ' + headers.map(h => String(h || '')).join(' | ') + ' |\n'
      content += '| ' + headers.map(() => '---').join(' | ') + ' |\n'
    }
    
    // 数据行
    for (let i = 1; i < data.length; i++) {
      const row = data[i] || []
      content += '| ' + row.map(cell => String(cell || '')).join(' | ') + ' |\n'
    }
    
    return content.trim()
  }

  /**
   * 提取纯文本内容
   */
  async extractText(buffer: Buffer): Promise<string> {
    const result = await this.parse(buffer)
    return result.content
  }

  /**
   * 获取工作表列表
   */
  async getSheetNames(buffer: Buffer): Promise<string[]> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      return workbook.SheetNames
    } catch (error) {
      this.logger.error(`获取工作表列表失败`, error)
      throw new Error(`获取工作表列表失败：${error.message}`)
    }
  }

  /**
   * 解析指定工作表
   */
  async parseSheet(buffer: Buffer, sheetName: string): Promise<string> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const worksheet = workbook.Sheets[sheetName]
      
      if (!worksheet) {
        throw new Error(`工作表 "${sheetName}" 不存在`)
      }
      
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      return this.formatTableContent(data as any[][])
    } catch (error) {
      this.logger.error(`解析工作表失败`, error)
      throw new Error(`解析工作表失败：${error.message}`)
    }
  }
}