import {
  Controller,
  Post,
  Body,
  Logger,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AuthService, RegisterDto, LoginDto } from './auth.service'
import { LocalAuthGuard } from './local-auth.guard'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/register')
  @ApiOperation({
    summary: '用户注册',
    description: '创建新用户账号',
  })
  async register(
    @Body() dto: RegisterDto,
  ): Promise<{
    user: { id: string; username: string; email?: string; nickname?: string }
    accessToken: string
  }> {
    return this.authService.register(dto)
  }

  @Post('/login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '用户登录',
    description: '使用用户名和密码登录，返回 JWT Token',
  })
  async login(@Request() req: any): Promise<{
    user: { id: string; username: string; email?: string; nickname?: string; role: string }
    accessToken: string
  }> {
    return this.authService.login(req.body)
  }

  @Post('/refresh')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '刷新 Token',
    description: '刷新 JWT Token',
  })
  async refresh(@Request() req: any): Promise<{ accessToken: string }> {
    const user = await this.authService.findById(req.user.userId)
    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }
    const accessToken = await this.authService.generateToken(user)
    return { accessToken }
  }

  @Post('/me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '获取当前用户信息',
    description: '获取当前登录用户的详细信息',
  })
  async getMe(@Request() req: any): Promise<any> {
    const user = await this.authService.findById(req.user.userId)
    return user
  }
}