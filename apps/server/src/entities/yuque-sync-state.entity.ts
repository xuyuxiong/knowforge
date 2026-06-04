import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm'

@Entity('yuque_sync_states')
@Unique(['teamLogin', 'bookSlug'])
export class YuqueSyncState {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 100 })
  teamLogin: string

  @Column({ length: 100 })
  bookSlug: string

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastFullSyncAt?: Date

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastIncrementalSyncAt?: Date

  @Column({ default: 0 })
  totalDocs: number

  @Column({ default: 0 })
  syncedDocs: number

  @Column({ default: 0 })
  failedDocs: number

  @Column({
    type: 'enum',
    enum: ['idle', 'syncing', 'error'],
    default: 'idle',
  })
  status: 'idle' | 'syncing' | 'error'

  @Column({ type: 'text', nullable: true })
  lastError?: string

  @Column({ type: 'jsonb', nullable: true })
  syncedDocHashes?: Record<number, string>

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date

  toJSON() {
    return {
      id: this.id,
      teamLogin: this.teamLogin,
      bookSlug: this.bookSlug,
      lastFullSyncAt: this.lastFullSyncAt,
      lastIncrementalSyncAt: this.lastIncrementalSyncAt,
      totalDocs: this.totalDocs,
      syncedDocs: this.syncedDocs,
      failedDocs: this.failedDocs,
      status: this.status,
      lastError: this.lastError,
      updatedAt: this.updatedAt,
    }
  }
}