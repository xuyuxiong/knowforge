import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { TypeOrmModule } from '@nestjs/typeorm'

// 实体
import {
  User,
  Document,
  KnowledgeBase,
  ChatSession,
  ChatMessage,
  YuqueSyncState,
} from './entities'

// 功能模块
import { AuthModule } from './modules/auth/auth.module'
import { StorageModule } from './modules/storage/storage.module'
import { RagModule } from './modules/rag/rag.module'
import { DocumentModule } from './modules/document/document.module'
import { KnowledgeModule } from './modules/knowledge/knowledge.module'
import { YuqueModule } from './modules/yuque/yuque.module'
import { ChatModule } from './modules/chat/chat.module'

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // 定时任务模块
    ScheduleModule.forRoot(),

    // 数据库模块
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'knowforge',
      entities: [
        User,
        Document,
        KnowledgeBase,
        ChatSession,
        ChatMessage,
        YuqueSyncState,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),

    // 业务模块
    AuthModule,        // 用户认证
    StorageModule,     // 文件存储
    RagModule,         // RAG 核心
    DocumentModule,    // 文档管理
    KnowledgeModule,   // 知识库
    YuqueModule,       // 语雀集成
    ChatModule,        // 问答历史
  ],
})
export class AppModule {}