import { PdfParserService } from '../src/modules/rag/pdf-parser.service'
import { WordParserService } from '../src/modules/rag/word-parser.service'
import { ExcelParserService } from '../src/modules/rag/excel-parser.service'
import { PptParserService } from '../src/modules/rag/ppt-parser.service'
import { ImageParserService } from '../src/modules/rag/image-parser.service'

describe('Document Parser Services', () => {
  let pdfParser: PdfParserService
  let wordParser: WordParserService
  let excelParser: ExcelParserService
  let pptParser: PptParserService
  let imageParser: ImageParserService

  beforeEach(() => {
    pdfParser = new PdfParserService()
    wordParser = new WordParserService()
    excelParser = new ExcelParserService()
    pptParser = new PptParserService()
    imageParser = new ImageParserService()
  })

  describe('PdfParserService', () => {
    it('应该处理空PDF内容', async () => {
      const mockBuffer = Buffer.from('mock pdf content')
      
      // 由于缺少实际PDF解析库，测试降级处理
      const result = await pdfParser.parse(mockBuffer)
      
      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('metadata')
      expect(result).toHaveProperty('pages')
      expect(Array.isArray(result.pages)).toBe(true)
    })

    it('应该提取文本内容', async () => {
      const mockBuffer = Buffer.from('mock pdf content')
      
      const result = await pdfParser.extractText(mockBuffer)
      
      expect(typeof result).toBe('string')
    })
  })

  describe('WordParserService', () => {
    it('应该处理空Word文档', async () => {
      const mockBuffer = Buffer.from('mock word content')
      
      const result = await wordParser.parse(mockBuffer)
      
      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('metadata')
      expect(result.metadata).toHaveProperty('wordCount')
    })

    it('应该提取纯文本', async () => {
      const mockBuffer = Buffer.from('mock word content')
      
      const result = await wordParser.extractText(mockBuffer)
      
      expect(typeof result).toBe('string')
    })
  })

  describe('ExcelParserService', () => {
    it('应该处理空Excel文件', async () => {
      const mockBuffer = Buffer.from('mock excel content')
      
      const result = await excelParser.parse(mockBuffer)
      
      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('metadata')
      expect(result).toHaveProperty('sheets')
      expect(Array.isArray(result.sheets)).toBe(true)
    })

    it('应该提取表格数据', async () => {
      const mockBuffer = Buffer.from('mock excel content')
      
      const result = await excelParser.extractText(mockBuffer)
      
      expect(typeof result).toBe('string')
    })
  })

  describe('PptParserService', () => {
    it('应该处理空PPT文件', async () => {
      const mockBuffer = Buffer.from('mock ppt content')
      
      const result = await pptParser.parse(mockBuffer)
      
      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('metadata')
      expect(result).toHaveProperty('slides')
      expect(Array.isArray(result.slides)).toBe(true)
    })

    it('应该获取幻灯片标题', async () => {
      const mockBuffer = Buffer.from('mock ppt content')
      
      const result = await pptParser.getSlideTitles(mockBuffer)
      
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('ImageParserService', () => {
    it('应该处理图片文件', async () => {
      // 创建一个简单的PNG文件头
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
      ])
      
      const result = await imageParser.parse(pngHeader)
      
      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('metadata')
    })

    it('应该检查支持的图片格式', () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
      ])
      
      const result = imageParser.isSupportedFormat(pngBuffer)
      
      expect(typeof result).toBe('boolean')
    })

    it('应该返回支持的格式列表', () => {
      const formats = imageParser.getSupportedFormats()
      
      expect(Array.isArray(formats)).toBe(true)
      expect(formats.length).toBeGreaterThan(0)
    })
  })
})