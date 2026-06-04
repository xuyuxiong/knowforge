import { Injectable, Logger } from '@nestjs/common'

export interface KnowledgeBase {
  id: string
  name: string
  description: string
  documentCount: number
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name)

  async create(data: { name: string; description: string }): Promise<KnowledgeBase> {
    this.logger.log(`创建知识库：${data.name}`)
    return {
      id: Date.now().toString(),
      ...data,
      documentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  async list(): Promise<KnowledgeBase[]> {
    this.logger.log('获取知识库列表')
    return []
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`删除知识库：${id}`)
  }
}