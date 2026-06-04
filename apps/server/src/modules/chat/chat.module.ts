import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ChatSession, ChatMessage } from '../../entities'
import { ChatHistoryService } from './chat-history.service'
import { ChatController } from './chat.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, ChatMessage]),
  ],
  providers: [ChatHistoryService],
  controllers: [ChatController],
  exports: [ChatHistoryService],
})
export class ChatModule {}