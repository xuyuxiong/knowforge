import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
} from 'typeorm'
import { ChatSession } from './chat-session.entity'

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
}

@Entity('users')
@Unique(['username'])
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 50 })
  username: string

  @Column({ length: 100, select: false })
  password: string

  @Column({ length: 100, nullable: true })
  email: string

  @Column({ length: 50, nullable: true })
  nickname: string

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus

  @Column({ nullable: true })
  avatar?: string

  @Column({ nullable: true })
  lastLoginAt?: Date

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date

  @OneToMany(() => ChatSession, (session) => session.user)
  chatSessions: ChatSession[]

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      nickname: this.nickname,
      role: this.role,
      avatar: this.avatar,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}