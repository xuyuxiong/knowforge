import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { DocumentService, DocumentInfo } from './document.service'

@ApiTags('document')
@Controller('documents')
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name)

  constructor(private readonly documentService: DocumentService) {}

  @Post('/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: '上传文档',
    description: '上传 PDF/Word/Markdown 文档到知识库',
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<DocumentInfo> {
    this.logger.log(`文件上传：${file?.originalname}`)
    return this.documentService.upload(file)
  }

  @Get()
  @ApiOperation({
    summary: '获取文档列表',
    description: '分页获取文档列表',
  })
  async list(
    @Query('page') page?: number,
    @Query('size') size?: number,
    @Query('type') type?: string,
  ): Promise<{ total: number; items: DocumentInfo[] }> {
    return this.documentService.list({
      page: page ? parseInt(page.toString()) : 1,
      size: size ? parseInt(size.toString()) : 20,
      type,
    })
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取文档详情',
  })
  async get(@Param('id') id: string): Promise<DocumentInfo | null> {
    const items = await this.documentService.list()
    return items.items.find((item) => item.id === id) || null
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除文档',
  })
  async delete(@Param('id') id: string): Promise<void> {
    return this.documentService.delete(id)
  }
}