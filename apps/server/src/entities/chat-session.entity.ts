import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm'
import { User } from './user.entity'
import { ChatMessage } from './chat-message.entity'

@Entity('chat_sessions')
@Index(['user', 'createdAt'])
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 200, nullable: true })
  title?: string

  @ManyToOne(() => User, (user) => user.chatSessions, { nullable: true, onDelete: 'CASCADE' })
  user?: User

  @Column({ nullable: true })
  userId?: string

  @Column({ nullable: true })
  knowledgeBaseId?: string

  @Column({ type: 'jsonb', nullable: true })
  context?: Record<string, any>

  @Column({ default: 0 })
  messageCount: number

  @Column({ nullable: true })
  lastMessageAt?: Date

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date

  @OneToMany(() => ChatMessage, (msg) => msg.session, { cascade: true })
  messages: ChatMessage[]

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      userId: this.userId,
      knowledgeBaseId: this.knowledgeBaseId,
      messageCount: this.messageCount,
      lastMessageAt: this.lastMessageAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}