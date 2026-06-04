import {
  Controller,
  Post,
  Body,
  Query,
  Delete,
  Param,
  Logger,
  Sse,
  MessageEvent,
  Get,
} from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Observable, from, map } from 'rxjs'
import { RagCoreService, RAGResponse, RAGSource } from './rag-core.service'
import { RagService } from './rag.service'

@ApiTags('rag')
@Controller('rag')
export class RagController {
  private readonly logger = new Logger(RagController.name)

  constructor(
    private readonly ragCoreService: RagCoreService,
    private readonly ragService: RagService,
  ) {}

  @Post('/query')
  @ApiOperation({
    summary: 'RAG 智能问答',
    description: '基于知识库进行智能问答，返回答案和引用来源',
  })
  async query(
    @Body('question') question: string,
    @Query('topK') topK?: number,
    @Query('method') method?: 'vector' | 'keyword' | 'hybrid',
    @Query('rerank') rerank?: string,
  ): Promise<RAGResponse> {
    this.logger.log(`API 请求：RAG 问答 - ${question.substring(0, 50)}...`)
    
    return this.ragCoreService.query(question, {
      topK: topK ? parseInt(topK.toString()) : undefined,
      method: method as any,
      rerank: rerank ? rerank === 'true' : undefined,
    })
  }

  @Post('/query/stream')
  @ApiOperation({
    summary: 'RAG 流式问答',
    description: '流式返回 RAG 答案，适合长回答场景',
  })
  @Sse()
  queryStream(
    @Body('question') question: string,
  ): Observable<MessageEvent> {
    return from(this.ragCoreService.query(question)).pipe(
      map((response: RAGResponse) => ({
        type: 'answer' as const,
        data: response,
      })),
    )
  }

  @Post('/index')
  @ApiOperation({
    summary: '索引文档',
    description: '将文档内容分块并向量化存储',
  })
  async index(
    @Body() body: {
      documentId: string
      title: string
      content: string
      type: string
      metadata?: Record<string, any>
    },
  ): Promise<{ success: boolean; chunkCount: number }> {
    this.logger.log(`API 请求：索引文档 - ${body.title}`)
    return this.ragCoreService.indexDocument({
      id: body.documentId,
      title: body.title,
      content: body.content,
      type: body.type,
      metadata: body.metadata,
    })
  }

  @Delete('/index/:documentId')
  @ApiOperation({
    summary: '删除文档索引',
    description: '从向量库中删除文档的向量表示',
  })
  async deleteIndex(@Param('documentId') documentId: string): Promise<{ success: boolean }> {
    this.logger.log(`API 请求：删除索引 - ${documentId}`)
    return this.ragCoreService.deleteDocument(documentId)
  }

  @Post('/embed')
  @ApiOperation({
    summary: '文本向量化',
    description: '将文本转换为向量表示',
  })
  async embed(@Body('text') text: string): Promise<{ embedding: number[]; dimension: number }> {
    const result = await this.ragService.embed(text)
    return {
      embedding: result,
      dimension: result.length,
    }
  }

  @Post('/search')
  @ApiOperation({
    summary: '相似性搜索',
    description: '查找与查询文本最相似的文档片段',
  })
  async search(
    @Body('query') query: string,
    @Query('topK') topK?: number,
    @Query('filter') filter?: string,
  ): Promise<RAGSource[]> {
    const chunks = await this.ragService.retrieve(query, {
      topK: topK ? parseInt(topK.toString()) : 5,
      filters: filter ? JSON.parse(filter) : undefined,
    })
    
    return chunks.map((chunk) => ({
      id: chunk.id,
      title: chunk.metadata.title || '未知',
      content: chunk.content,
      similarity: (chunk.metadata as any).similarity || 0,
      metadata: chunk.metadata,
    }))
  }

  @Get('/health')
  @ApiOperation({
    summary: '健康检查',
    description: '检查RAG服务状态',
  })
  async health(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }
}