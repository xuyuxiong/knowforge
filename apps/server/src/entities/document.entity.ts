import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm'
import { KnowledgeBase } from './knowledge-base.entity'

export enum DocumentType {
  PDF = 'pdf',
  WORD = 'word',
  MARKDOWN = 'markdown',
  YUQUE = 'yuque',
  TXT = 'txt',
  EXCEL = 'excel',
  PPT = 'ppt',
  IMAGE = 'image',
}

export enum DocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('documents')
@Index(['knowledgeBase', 'status'])
@Index(['type'])
@Index(['createdAt'])
@Index(['knowledgeBaseId'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 500 })
  title: string

  @Column({ nullable: true })
  description?: string

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  type: DocumentType

  @Column({ length: 500, nullable: true })
  filePath?: string

  @Column({ nullable: true })
  fileSize?: number

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus

  @Column({ type: 'text', nullable: true })
  content?: string

  @Column({ nullable: true })
  chunkCount?: number

  @Column({ length: 100, nullable: true })
  sourceId?: string

  @Column({ length: 500, nullable: true })
  sourceUrl?: string

  @Column({ length: 100, nullable: true })
  slug?: string

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>

  @Column({ type: 'simple-array', nullable: true })
  embedding?: number[]

  @Column({ nullable: true })
  uploadedBy?: string

  @ManyToOne(() => KnowledgeBase, (kb) => kb.documents, { nullable: true, onDelete: 'SET NULL' })
  knowledgeBase?: KnowledgeBase

  @Column({ nullable: true })
  knowledgeBaseId?: string

  @Column({ type: 'timestamp with time zone', nullable: true })
  sourceCreatedAt?: Date

  @Column({ type: 'timestamp with time zone', nullable: true })
  sourceUpdatedAt?: Date

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date

  @Column({ type: 'timestamp with time zone', nullable: true })
  indexedAt?: Date

  @Column({ nullable: true })
  errorMessage?: string

  @Column({ type: 'int', default: 0 })
  viewCount?: number

  @Column({ type: 'int', default: 0 })
  searchCount?: number
}