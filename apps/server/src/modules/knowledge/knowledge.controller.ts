import { Controller, Post, Get, Delete, Body, Param, Logger } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { KnowledgeService, KnowledgeBase } from './knowledge.service'

@ApiTags('knowledge')
@Controller('knowledge')
export class KnowledgeController {
  private readonly logger = new Logger(KnowledgeController.name)

  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post()
  @ApiOperation({
    summary: '创建知识库',
  })
  async create(
    @Body() data: { name: string; description: string },
  ): Promise<KnowledgeBase> {
    return this.knowledgeService.create(data)
  }

  @Get()
  @ApiOperation({
    summary: '获取知识库列表',
  })
  async list(): Promise<KnowledgeBase[]> {
    return this.knowledgeService.list()
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除知识库',
  })
  async delete(@Param('id') id: string): Promise<void> {
    return this.knowledgeService.delete(id)
  }
}