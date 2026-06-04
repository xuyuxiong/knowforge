import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ChatSession, ChatMessage, MessageRole } from '../../entities'

export interface CreateSessionDto {
  userId?: string
  title?: string
  knowledgeBaseId?: string
}

export interface AddMessageDto {
  sessionId: string
  role: MessageRole
  content: string
  sources?: any[]
  latency?: number
  model?: string
  tokens?: number
}

export interface ChatContext {
  messages: Array<{
    role: MessageRole
    content: string
  }>
  sessionId: string
}

@Injectable()
export class ChatHistoryService {
  private readonly logger = new Logger(ChatHistoryService.name)

  constructor(
    @InjectRepository(ChatSession)
    private sessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
  ) {}

  /**
   * 创建新会话
   */
  async createSession(dto: CreateSessionDto): Promise<ChatSession> {
    const session = this.sessionRepository.create({
      title: dto.title || '新对话',
      userId: dto.userId,
      knowledgeBaseId: dto.knowledgeBaseId,
      messageCount: 0,
    })

    const saved = await this.sessionRepository.save(session)
    this.logger.log(`创建会话：${saved.id}`)
    return saved
  }

  /**
   * 获取会话详情
   */
  async getSession(sessionId: string, userId?: string): Promise<ChatSession> {
    const session = await this.sessionRepository.findOne({
      where: userId ? { id: sessionId, userId } : { id: sessionId },
      relations: ['messages'],
      order: {
        messages: { createdAt: 'ASC' },
      },
    })

    if (!session) {
      throw new NotFoundException('会话不存在')
    }

    return session
  }

  /**
   * 获取用户会话列表
   */
  async getUserSessions(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ total: number; sessions: ChatSession[] }> {
    const [sessions, total] = await this.sessionRepository.findAndCount({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    })

    return { total, sessions }
  }

  /**
   * 添加消息
   */
  async addMessage(dto: AddMessageDto): Promise<ChatMessage> {
    const session = await this.sessionRepository.findOne({
      where: { id: dto.sessionId },
    })

    if (!session) {
      throw new NotFoundException('会话不存在')
    }

    const message = this.messageRepository.create({
      role: dto.role,
      content: dto.content,
      sessionId: dto.sessionId,
      sources: dto.sources,
      latency: dto.latency,
      model: dto.model,
      tokens: dto.tokens,
    })

    const saved = await this.messageRepository.save(message)

    // 更新会话
    session.messageCount += 1
    session.lastMessageAt = new Date()
    
    // 如果是第一条用户消息，更新会话标题
    if (dto.role === MessageRole.USER && session.messageCount === 1) {
      session.title = dto.content.slice(0, 50) + (dto.content.length > 50 ? '...' : '')
    }
    
    await this.sessionRepository.save(session)

    this.logger.log(`添加消息到会话：${dto.sessionId}`)
    return saved
  }

  /**
   * 获取会话上下文（用于多轮对话）
   */
  async getContext(
    sessionId: string,
    options?: { limit?: number }
  ): Promise<ChatContext> {
    const messages = await this.messageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      take: options?.limit || 10,
      select: ['role', 'content'],
    })

    return {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      sessionId,
    }
  }

  /**
   * 更新消息反馈
   */
  async updateFeedback(
    messageId: string,
    feedback: 'like' | 'dislike',
    reason?: string
  ): Promise<ChatMessage> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    })

    if (!message) {
      throw new NotFoundException('消息不存在')
    }

    message.feedback = feedback
    message.feedbackReason = reason
    await this.messageRepository.save(message)

    this.logger.log(`更新消息反馈：${messageId} - ${feedback}`)
    return message
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string, userId?: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: userId ? { id: sessionId, userId } : { id: sessionId },
    })

    if (!session) {
      throw new NotFoundException('会话不存在')
    }

    await this.sessionRepository.delete(sessionId)
    this.logger.log(`删除会话：${sessionId}`)
  }

  /**
   * 清空会话消息
   */
  async clearMessages(sessionId: string): Promise<void> {
    await this.messageRepository.delete({ sessionId })
    
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    })
    
    if (session) {
      session.messageCount = 0
      session.lastMessageAt = undefined
      await this.sessionRepository.save(session)
    }
    
    this.logger.log(`清空会话消息：${sessionId}`)
  }
}