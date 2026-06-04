import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm'
import { ChatSession } from './chat-session.entity'

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

@Entity('chat_messages')
@Index(['session', 'createdAt'])
@Index(['role'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    type: 'enum',
    enum: MessageRole,
  })
  role: MessageRole

  @Column({ type: 'text' })
  content: string

  @ManyToOne(() => ChatSession, (session) => session.messages, { onDelete: 'CASCADE' })
  session: ChatSession

  @Column()
  sessionId: string

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>

  @Column({ type: 'jsonb', nullable: true })
  sources?: Record<string, any>[]

  @Column({ nullable: true })
  latency?: number

  @Column({ nullable: true })
  model?: string

  @Column({ nullable: true })
  tokens?: number

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date

  @Column({ nullable: true })
  feedback?: 'like' | 'dislike'

  @Column({ type: 'text', nullable: true })
  feedbackReason?: string

  toJSON() {
    return {
      id: this.id,
      role: this.role,
      content: this.content,
      sessionId: this.sessionId,
      metadata: this.metadata,
      sources: this.sources,
      latency: this.latency,
      model: this.model,
      tokens: this.tokens,
      feedback: this.feedback,
      createdAt: this.createdAt,
    }
  }
}