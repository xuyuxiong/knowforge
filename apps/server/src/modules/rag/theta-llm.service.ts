import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  latency: number
}

/**
 * LLM 服务
 *
 * 支持任何 OpenAI 兼容接口（OpenAI、Ollama、vLLM 等）
 * 通过 LLM_API_KEY 和 LLM_BASE_URL 环境变量配置
 */
@Injectable()
export class ThetaLLMService {
  private readonly logger = new Logger(ThetaLLMService.name)
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly defaultModel: string
  private readonly temperature: number
  private readonly maxTokens: number

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LLM_API_KEY', '')
    this.baseUrl = this.configService.get<string>('LLM_BASE_URL', 'http://localhost:11434/v1')
    this.defaultModel = this.configService.get<string>('LLM_MODEL', 'qwen-max')
    this.temperature = parseFloat(this.configService.get<string>('LLM_TEMPERATURE', '0.7'))
    this.maxTokens = parseInt(this.configService.get<string>('LLM_MAX_TOKENS', '2048'))

    if (!this.apiKey) {
      this.logger.warn('未配置 LLM_API_KEY，将使用模拟响应')
    } else {
      this.logger.log(`LLM 服务已初始化，模型：${this.defaultModel}`)
    }
  }

  /**
   * 调用 LLM 生成回答
   */
  async generate(
    prompt: string,
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
      stream?: boolean
    }
  ): Promise<LLMResponse> {
    const startTime = Date.now()
    const model = options?.model || this.defaultModel

    // 如果没有配置 API Key，返回模拟响应
    if (!this.apiKey) {
      this.logger.warn('未配置 LLM API Key，返回模拟回答')
      return this.getMockResponse(prompt)
    }

    try {
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: '你是一个专业的知识库助手，基于检索到的上下文准确回答问题。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages,
          temperature: options?.temperature || this.temperature,
          max_tokens: options?.maxTokens || this.maxTokens,
          stream: options?.stream || false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: 30000,
        }
      )

      const data = response.data
      const latency = Date.now() - startTime

      this.logger.log(
        `LLM 调用完成：${model}, 耗时 ${latency}ms, ` +
        `tokens: ${data.usage?.total_tokens || 0}`
      )

      return {
        content: data.choices?.[0]?.message?.content || '',
        model: data.model || model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        latency,
      }
    } catch (error) {
      this.logger.error('LLM 调用失败', error)

      if (error.response?.status === 401) {
        throw new Error('LLM API Key 无效，请检查 LLM_API_KEY 配置')
      } else if (error.response?.status === 429) {
        throw new Error('LLM API 请求超限，请稍后重试')
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('LLM API 请求超时')
      }

      throw error
    }
  }

  /**
   * 流式生成（SSE）
   */
  async *generateStream(
    prompt: string,
    options?: { model?: string; temperature?: number }
  ): AsyncGenerator<string, void, unknown> {
    if (!this.apiKey) {
      yield '未配置 LLM API Key，无法提供流式回答。'
      return
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: options?.model || this.defaultModel,
          messages: [
            { role: 'system', content: '你是一个专业的知识库助手。' },
            { role: 'user', content: prompt },
          ],
          temperature: options?.temperature || this.temperature,
          stream: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'text/event-stream',
          },
          responseType: 'stream',
        }
      )

      for await (const chunk of response.data) {
        const chunkStr = chunk.toString()
        const lines = chunkStr.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              const content = data.choices?.[0]?.delta?.content || ''
              if (content) {
                yield content
              }
            } catch {
              // 忽略非 JSON 行（如 [DONE]）
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('LLM 流式生成失败', error)
      yield `生成失败：${error.message}`
    }
  }

  /**
   * 获取嵌入向量
   */
  async getEmbedding(text: string): Promise<{
    embedding: number[]
    dimension: number
    model: string
  }> {
    const embeddingApiKey = this.configService.get('EMBEDDING_API_KEY', this.apiKey)
    const embeddingBaseUrl = this.configService.get('EMBEDDING_BASE_URL', this.baseUrl)

    if (!embeddingApiKey) {
      // 返回模拟向量
      const dim = 1536
      return {
        embedding: Array(dim).fill(0).map(() => Math.random() - 0.5),
        dimension: dim,
        model: 'mock-embedding',
      }
    }

    try {
      const embeddingModel = this.configService.get('EMBEDDING_MODEL', 'text-embedding-v2')

      const response = await axios.post(
        `${embeddingBaseUrl}/embeddings`,
        {
          model: embeddingModel,
          input: text,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${embeddingApiKey}`,
          },
        }
      )

      const data = response.data
      return {
        embedding: data.data?.[0]?.embedding || [],
        dimension: data.data?.[0]?.embedding?.length || 0,
        model: data.model || embeddingModel,
      }
    } catch (error) {
      this.logger.error('嵌入模型调用失败', error)
      throw error
    }
  }

  /**
   * 获取模拟响应（开发测试用）
   */
  private getMockResponse(prompt: string): LLMResponse {
    return {
      content: `这是一个模拟回答（LLM API 未配置）。

根据您的问题："${prompt.substring(0, 50)}..."

请配置 LLM_API_KEY 和 LLM_BASE_URL 环境变量以启用真实 LLM 服务。`,
      model: this.defaultModel,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      latency: 0,
    }
  }

  /**
   * 检查 API 连通性
   */
  async healthCheck(): Promise<{
    connected: boolean
    model?: string
    error?: string
  }> {
    if (!this.apiKey) {
      return { connected: false, error: '未配置 LLM_API_KEY' }
    }

    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 5000,
      })

      return {
        connected: true,
        model: response.data?.data?.[0]?.id || this.defaultModel,
      }
    } catch (error) {
      return {
        connected: false,
        error: error.message || '连接失败',
      }
    }
  }
}