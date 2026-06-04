import { Controller, Get, Post, Body, Logger, Query, Param } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { YuqueService, YuqueConfig } from './yuque.service'
import { YuqueSyncProcessor } from './yuque-sync.processor'
import { YuqueMcpService } from './yuque-mcp.service'

@ApiTags('yuque')
@Controller('yuque')
export class YuqueController {
  private readonly logger = new Logger(YuqueController.name)

  constructor(
    private readonly yuqueService: YuqueService,
    private readonly yuqueSyncProcessor: YuqueSyncProcessor,
    private readonly yuqueMcpService: YuqueMcpService,
  ) {}

  @Post('/configure')
  @ApiOperation({
    summary: '配置语雀连接',
    description: '设置语雀团队和信息库参数',
  })
  async configure(@Body() config: YuqueConfig): Promise<{ success: boolean }> {
    this.yuqueService.configure(config)
    return { success: true }
  }

  @Get('/repo')
  @ApiOperation({
    summary: '获取知识库详情',
  })
  async getRepo(): Promise<any> {
    return this.yuqueService.getRepo()
  }

  @Get('/docs')
  @ApiOperation({
    summary: '获取文档列表',
  })
  async getDocList(
    @Query('limit') limit?: number, 
    @Query('offset') offset?: number,
  ): Promise<any[]> {
    return this.yuqueService.getDocList({ 
      limit: limit ? parseInt(limit.toString()) : 100,
      offset: offset ? parseInt(offset.toString()) : 0,
    })
  }

  @Get('/docs/:id')
  @ApiOperation({
    summary: '获取文档内容',
  })
  async getDocContent(
    @Param('id') id: string, 
    @Query('raw') raw?: string,
  ): Promise<any> {
    return this.yuqueService.getDocContent(parseInt(id), raw !== 'false')
  }

  @Get('/toc')
  @ApiOperation({
    summary: '获取目录结构',
  })
  async getToc(): Promise<any> {
    return this.yuqueService.getToc()
  }

  @Post('/sync/full')
  @ApiOperation({
    summary: '全量同步',
    description: '手动触发语雀文档全量同步',
  })
  async fullSync(): Promise<{ success: boolean; count: number; errors: string[] }> {
    return this.yuqueSyncProcessor.triggerFullSync()
  }

  @Post('/sync/incremental')
  @ApiOperation({
    summary: '增量同步',
    description: '手动触发语雀文档增量同步',
  })
  async incrementalSync(): Promise<{ success: boolean; count: number; errors: string[] }> {
    return this.yuqueSyncProcessor.triggerIncrementalSync()
  }

  @Get('/sync/state')
  @ApiOperation({
    summary: '获取同步状态',
    description: '查看语雀同步状态',
  })
  async getSyncState(): Promise<{
    lastFullSyncTime: Date | null
    lastIncrementalSyncTime: Date | null
    syncedDocCount: number
  }> {
    return this.yuqueSyncProcessor.getSyncState()
  }

  @Get('/mcp/status')
  @ApiOperation({
    summary: '获取 MCP 状态',
    description: '查看语雀 MCP 连接状态',
  })
  async getMcpStatus(): Promise<{
    enabled: boolean
    connected: boolean
    serverCode: string
    error?: string
  }> {
    const status = await this.yuqueMcpService.checkConnection()
    return {
      enabled: true,
      ...status
    }
  }

  @Post('/mcp/test')
  @ApiOperation({
    summary: '测试 MCP 连接',
    description: '测试语雀 MCP 连接是否可用',
  })
  async testMcp(): Promise<{ success: boolean; message: string }> {
    const status = await this.yuqueMcpService.checkConnection()
    
    if (status.connected) {
      return {
        success: true,
        message: 'MCP 连接正常',
      }
    } else {
      return {
        success: false,
        message: `MCP 连接失败：${status.error || '未知错误'}`,
      }
    }
  }
}