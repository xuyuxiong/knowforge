import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { User, UserRole, UserStatus } from '../../entities'

export interface RegisterDto {
  username: string
  password: string
  email?: string
  nickname?: string
}

export interface LoginDto {
  username: string
  password: string
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  /**
   * 用户注册
   */
  async register(dto: RegisterDto): Promise<{ user: User; accessToken: string }> {
    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { username: dto.username },
      withDeleted: false,
    })

    if (existingUser) {
      throw new ConflictException('用户名已存在')
    }

    // 哈希密码
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(dto.password, salt)

    // 创建用户
    const user = this.userRepository.create({
      username: dto.username,
      password: hashedPassword,
      email: dto.email,
      nickname: dto.nickname || dto.username,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    })

    const savedUser = await this.userRepository.save(user)
    this.logger.log(`用户注册成功：${dto.username}`)

    // 生成 JWT
    const accessToken = await this.generateToken(savedUser)

    return {
      user: savedUser,
      accessToken,
    }
  }

  /**
   * 用户登录
   */
  async login(dto: LoginDto): Promise<{ user: any; accessToken: string }> {
    // 查找用户（包含密码）
    const user = await this.userRepository.findOne({
      where: { username: dto.username },
      select: ['id', 'username', 'email', 'nickname', 'role', 'status', 'password'],
      withDeleted: false,
    })

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误')
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(dto.password, user.password)

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误')
    }

    // 检查用户状态
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('账号已被禁用')
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date()
    await this.userRepository.save(user)

    this.logger.log(`用户登录成功：${dto.username}`)

    // 生成 JWT
    const accessToken = await this.generateToken(user)

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      },
      accessToken,
    }
  }

  /**
   * 验证用户（用于 JWT Strategy）
   */
  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { username },
      select: ['id', 'username', 'email', 'nickname', 'role', 'status', 'password'],
      withDeleted: false,
    })

    if (!user) {
      return null
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return null
    }

    if (user.status !== UserStatus.ACTIVE) {
      return null
    }

    const { password: _, ...result } = user
    return result
  }

  /**
   * 根据 ID 获取用户
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'nickname', 'role', 'avatar'],
    })
  }

  /**
   * 生成 JWT Token
   */
  async generateToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    }

    return this.jwtService.sign(payload)
  }
}