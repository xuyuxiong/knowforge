import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm'
import { Document } from './document.entity'

@Entity('knowledge_bases')
export class KnowledgeBase {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 200 })
  name: string

  @Column({ type: 'text', nullable: true })
  description?: string

  @Column({ length: 100, nullable: true })
  slug?: string

  @Column({ default: false })
  isPublic: boolean

  @Column({ length: 100, nullable: true })
  owner?: string

  @Column({ type: 'jsonb', nullable: true })
  config?: Record<string, any>

  @OneToMany(() => Document, (doc) => doc.knowledgeBase)
  documents: Document[]

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastSyncAt?: Date
}