import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { ChatHistoryService, CreateSessionDto, AddMessageDto } from './chat-history.service'
import { MessageRole } from '../../entities'

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatHistoryService) {}

  @Post('/sessions')
  @ApiOperation({
    summary: '创建会话',
    description: '创建新的对话会话',
  })
  async createSession(
    @Request() req: any,
    @Body() dto: CreateSessionDto,
  ): Promise<any> {
    const session = await this.chatService.createSession({
      ...dto,
      userId: req.user.userId,
    })
    return session
  }

  @Get('/sessions')
  @ApiOperation({
    summary: '获取会话列表',
    description: '获取当前用户的会话列表',
  })
  async getSessions(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<any> {
    return this.chatService.getUserSessions(req.user.userId, {
      limit: limit ? parseInt(limit.toString()) : 20,
      offset: offset ? parseInt(offset.toString()) : 0,
    })
  }

  @Get('/sessions/:id')
  @ApiOperation({
    summary: '获取会话详情',
    description: '获取指定会话的详情和消息历史',
  })
  async getSession(@Param('id') id: string, @Request() req: any): Promise<any> {
    return this.chatService.getSession(id, req.user.userId)
  }

  @Delete('/sessions/:id')
  @ApiOperation({
    summary: '删除会话',
    description: '删除指定会话',
  })
  async deleteSession(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.chatService.deleteSession(id, req.user.userId)
  }

  @Post('/sessions/:id/messages')
  @ApiOperation({
    summary: '添加消息',
    description: '向会话添加消息（用户或 AI）',
  })
  async addMessage(
    @Param('id') sessionId: string,
    @Request() req: any,
    @Body() dto: Omit<AddMessageDto, 'sessionId'>,
  ): Promise<any> {
    return this.chatService.addMessage({
      ...dto,
      sessionId,
    })
  }

  @Get('/sessions/:id/context')
  @ApiOperation({
    summary: '获取会话上下文',
    description: '获取用于多轮对话的上下文',
  })
  async getContext(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ): Promise<any> {
    return this.chatService.getContext(id, {
      limit: limit ? parseInt(limit.toString()) : 10,
    })
  }

  @Post('/messages/:id/feedback')
  @ApiOperation({
    summary: '提交反馈',
    description: '对 AI 回答提交满意度反馈',
  })
  async updateFeedback(
    @Param('id') messageId: string,
    @Body() dto: { feedback: 'like' | 'dislike'; reason?: string },
  ): Promise<any> {
    return this.chatService.updateFeedback(messageId, dto.feedback, dto.reason)
  }

  @Post('/sessions/:id/clear')
  @ApiOperation({
    summary: '清空消息',
    description: '清空会话的所有消息',
  })
  async clearMessages(@Param('id') id: string): Promise<void> {
    return this.chatService.clearMessages(id)
  }
}