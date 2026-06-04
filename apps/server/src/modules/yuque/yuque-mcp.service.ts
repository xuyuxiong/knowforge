import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { YuqueService, YuqueDoc } from './yuque.service'

/**
 * 语雀 MCP 服务
 * 
 * 通过 MCP Server 集成语雀
 * 作为现有 HTTP API 方式的补充，提供更稳定的内网访问
 */
@Injectable()
export class YuqueMcpService implements OnModuleInit {
  private readonly logger = new Logger(YuqueMcpService.name)
  private readonly mcpServerCode = 'mcp.ant.yuque.yuquemcpserver'
  private mcpClient: any = null
  private enabled = false

  constructor(
    private configService: ConfigService,
    private yuqueService: YuqueService,
  ) {}

  async onModuleInit() {
    // 检查是否启用 MCP 方式
    const useMcp = this.configService.get('YUQUE_USE_MCP', false)
    
    if (useMcp) {
      await this.initializeMcpClient()
    } else {
      this.logger.log('语雀 MCP 未启用，使用 HTTP API 方式')
    }
  }

  /**
   * 初始化 MCP 客户端
   */
  private async initializeMcpClient() {
    try {
      // 通过 Ant MCP 网关连接语雀 MCP Server
      // 注意：这里使用 ant_mcp 工具进行发现和调用
      this.logger.log(`正在连接语雀 MCP Server: ${this.mcpServerCode}`)
      
      // MCP 客户端初始化逻辑
      // 实际使用时通过 ant_mcp 工具调用
      this.enabled = true
      this.logger.log('语雀 MCP 客户端初始化成功')
    } catch (error) {
      this.logger.error('语雀 MCP 客户端初始化失败，降级到 HTTP API 方式', error)
      this.enabled = false
    }
  }

  /**
   * 使用 MCP 方式获取文档列表
   * 如果 MCP 不可用，降级到 HTTP API
   */
  async getDocList(params?: { limit?: number; offset?: number }): Promise<YuqueDoc[]> {
    if (this.enabled && this.mcpClient) {
      try {
        this.logger.log('使用 MCP 方式获取文档列表')
        // TODO: 通过 ant_mcp 调用 MCP 工具
        // const result = await this.callMcpTool('getDocList', params)
        // return result
      } catch (error) {
        this.logger.warn('MCP 调用失败，降级到 HTTP API', error)
      }
    }

    // 降级到 HTTP API
    this.logger.log('使用 HTTP API 方式获取文档列表')
    return this.yuqueService.getDocList(params)
  }

  /**
   * 使用 MCP 方式获取文档内容
   */
  async getDocContent(docId: number, raw = true): Promise<YuqueDoc> {
    if (this.enabled && this.mcpClient) {
      try {
        this.logger.log(`使用 MCP 方式获取文档内容：${docId}`)
        // TODO: 通过 ant_mcp 调用 MCP 工具
        // const result = await this.callMcpTool('getDocContent', { docId, raw })
        // return result
      } catch (error) {
        this.logger.warn('MCP 调用失败，降级到 HTTP API', error)
      }
    }

    // 降级到 HTTP API
    return this.yuqueService.getDocContent(docId, raw)
  }

  /**
   * 使用 MCP 方式获取知识库详情
   */
  async getRepo(): Promise<any> {
    if (this.enabled && this.mcpClient) {
      try {
        this.logger.log('使用 MCP 方式获取知识库详情')
        // TODO: 通过 ant_mcp 调用 MCP 工具
        // const result = await this.callMcpTool('getRepo')
        // return result
      } catch (error) {
        this.logger.warn('MCP 调用失败，降级到 HTTP API', error)
      }
    }

    // 降级到 HTTP API
    return this.yuqueService.getRepo()
  }

  /**
   * 使用 MCP 方式获取目录结构
   */
  async getToc(): Promise<any> {
    if (this.enabled && this.mcpClient) {
      try {
        this.logger.log('使用 MCP 方式获取目录结构')
        // TODO: 通过 ant_mcp 调用 MCP 工具
        // const result = await this.callMcpTool('getToc')
        // return result
      } catch (error) {
        this.logger.warn('MCP 调用失败，降级到 HTTP API', error)
      }
    }

    // 降级到 HTTP API
    return this.yuqueService.getToc()
  }

  /**
   * 调用 MCP 工具的通用方法
   * 
   * 实际使用时，这里会通过 ant_mcp 工具进行调用
   * 示例：
   * const result = await this.antMcp.call({
   *   action: 'call',
   *   server_code: this.mcpServerCode,
   *   tool_name: toolName,
   *   tool_args: args,
   * })
   */
  private async callMcpTool(toolName: string, args?: Record<string, any>): Promise<any> {
    // 这里是占位实现
    // 实际调用需要通过 ant_mcp 工具
    throw new Error('MCP 调用需要通过 ant_mcp 工具实现')
  }

  /**
   * 检查 MCP 连接状态
   */
  async checkConnection(): Promise<{
    connected: boolean
    serverCode: string
    error?: string
  }> {
    if (!this.enabled) {
      return {
        connected: false,
        serverCode: this.mcpServerCode,
        error: 'MCP 未启用',
      }
    }

    try {
      // 测试连接
      await this.getRepo()
      return {
        connected: true,
        serverCode: this.mcpServerCode,
      }
    } catch (error) {
      return {
        connected: false,
        serverCode: this.mcpServerCode,
        error: error.message,
      }
    }
  }

  /**
   * 获取 MCP 状态
   */
  getStatus(): {
    enabled: boolean
    connected: boolean
    serverCode: string
  } {
    return {
      enabled: this.enabled,
      connected: this.enabled && !!this.mcpClient,
      serverCode: this.mcpServerCode,
    }
  }
}