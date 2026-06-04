import { Injectable, Logger, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { User, UserRole, UserStatus } from './user.entity'

export interface CreateUserDto {
  username: string
  email: string
  displayName: string
  password: string
  role?: UserRole
}

export interface UpdateUserDto {
  displayName?: string
  email?: string
  avatar?: string
  preferences?: Record<string, any>
  permissions?: string[]
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name)
  private readonly saltRounds = 10

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 创建用户
   */
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { username, email, displayName, password, role = UserRole.VIEWER } = createUserDto

    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    })

    if (existingUser) {
      throw new ConflictException('用户名或邮箱已存在')
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, this.saltRounds)

    const user = this.userRepository.create({
      username,
      email,
      displayName,
      passwordHash,
      role,
    })

    const savedUser = await this.userRepository.save(user)
    
    this.logger.log(`用户已创建：${username} (${email})`)
    
    return savedUser
  }

  /**
   * 根据 ID 获取用户
   */
  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } })
    
    if (!user) {
      throw new NotFoundException('用户不存在')
    }
    
    return user
  }

  /**
   * 根据用户名获取用户
   */
  async getUserByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { username } })
    
    if (!user) {
      throw new NotFoundException('用户不存在')
    }
    
    return user
  }

  /**
   * 根据邮箱获取用户
   */
  async getUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } })
    
    if (!user) {
      throw new NotFoundException('用户不存在')
    }
    
    return user
  }

  /**
   * 更新用户信息
   */
  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.getUserById(id)
    
    Object.assign(user, updateUserDto)
    
    const updatedUser = await this.userRepository.save(user)
    
    this.logger.log(`用户信息已更新：${user.username}`)
    
    return updatedUser
  }

  /**
   * 更新用户密码
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const user = await this.getUserById(id)
    
    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds)
    
    await this.userRepository.update(id, { passwordHash })
    
    this.logger.log(`用户密码已更新：${user.username}`)
  }

  /**
   * 验证用户密码
   */
  async validatePassword(username: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { username } })
    
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误')
    }
    
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('账户已被禁用')
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误')
    }
    
    return user
  }

  /**
   * 更新最后登录信息
   */
  async updateLastLogin(id: string, ip?: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      loginCount: () => 'loginCount + 1',
    })
  }

  /**
   * 获取所有用户
   */
  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.find({
      order: { createdAt: 'DESC' },
    })
  }

  /**
   * 分页获取用户
   */
  async getUsersPaginated(page: number = 1, limit: number = 10): Promise<{
    users: User[]
    total: number
    page: number
    totalPages: number
  }> {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    })
    
    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id)
    
    await this.userRepository.softDelete(id)
    
    this.logger.log(`用户已删除：${user.username}`)
  }

  /**
   * 禁用用户
   */
  async suspendUser(id: string): Promise<void> {
    await this.userRepository.update(id, { status: UserStatus.SUSPENDED })
    
    this.logger.log(`用户已禁用：${id}`)
  }

  /**
   * 启用用户
   */
  async activateUser(id: string): Promise<void> {
    await this.userRepository.update(id, { status: UserStatus.ACTIVE })
    
    this.logger.log(`用户已启用：${id}`)
  }

  /**
   * 搜索用户
   */
  async searchUsers(query: string): Promise<User[]> {
    return await this.userRepository
      .createQueryBuilder('user')
      .where('user.username LIKE :query', { query: `%${query}%` })
      .orWhere('user.email LIKE :query', { query: `%${query}%` })
      .orWhere('user.displayName LIKE :query', { query: `%${query}%` })
      .getMany()
  }

  /**
   * 获取用户统计
   */
  async getUserStats(): Promise<{
    totalUsers: number
    activeUsers: number
    suspendedUsers: number
    newUsersToday: number
  }> {
    const [totalUsers, activeUsers, suspendedUsers, newUsersToday] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { status: UserStatus.ACTIVE } }),
      this.userRepository.count({ where: { status: UserStatus.SUSPENDED } }),
      this.userRepository.count({
        where: {
          createdAt: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
    ])
    
    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      newUsersToday,
    }
  }
}