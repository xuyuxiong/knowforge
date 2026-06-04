import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 100, unique: true })
  username: string

  @Column({ length: 100, unique: true })
  email: string

  @Column({ length: 100 })
  displayName: string

  @Column({ length: 255 })
  passwordHash: string

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.VIEWER,
  })
  role: UserRole

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus

  @Column({ type: 'text', nullable: true })
  avatar?: string

  @Column({ type: 'jsonb', nullable: true })
  preferences?: Record<string, any>

  @Column({ type: 'jsonb', nullable: true })
  permissions?: string[]

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastLoginAt?: Date

  @Column({ type: 'text', nullable: true })
  lastLoginIp?: string

  @Column({ type: 'int', default: 0 })
  loginCount?: number

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date

  @Column({ type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date
}