import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common'
import { Request as ExpressRequest } from 'express'
import { UserService, CreateUserDto, UpdateUserDto } from './user.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { UserRole } from './user.entity'

@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取当前用户信息
   */
  @Get('me')
  async getCurrentUser(@Request() req) {
    const user = await this.userService.getUserById(req.user.userId)
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatar: user.avatar,
      preferences: user.preferences,
      createdAt: user.createdAt,
    }
  }

  /**
   * 更新当前用户信息
   */
  @Put('me')
  async updateCurrentUser(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return await this.userService.updateUser(req.user.userId, updateUserDto)
  }

  /**
   * 更新当前用户密码
   */
  @Put('me/password')
  async updateCurrentUserPassword(
    @Request() req,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    // 验证当前密码
    await this.userService.validatePassword(req.user.username, body.currentPassword)
    
    // 更新密码
    await this.userService.updatePassword(req.user.userId, body.newPassword)
    
    return { message: '密码已更新' }
  }

  /**
   * 获取所有用户（管理员）
   */
  @Get()
  async getAllUsers() {
    return await this.userService.getAllUsers()
  }

  /**
   * 分页获取用户
   */
  @Get('paginated')
  async getUsersPaginated(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    
    return await this.userService.getUsersPaginated(pageNum, limitNum)
  }

  /**
   * 搜索用户
   */
  @Get('search')
  async searchUsers(@Query('q') query: string) {
    return await this.userService.searchUsers(query)
  }

  /**
   * 获取用户统计
   */
  @Get('stats')
  async getUserStats() {
    return await this.userService.getUserStats()
  }

  /**
   * 获取指定用户信息
   */
  @Get(':id')
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return await this.userService.getUserById(id)
  }

  /**
   * 创建用户（管理员）
   */
  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.userService.createUser(createUserDto)
  }

  /**
   * 更新用户信息（管理员）
   */
  @Put(':id')
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.userService.updateUser(id, updateUserDto)
  }

  /**
   * 删除用户（管理员）
   */
  @Delete(':id')
  async deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    await this.userService.deleteUser(id)
    return { message: '用户已删除' }
  }

  /**
   * 禁用用户（管理员）
   */
  @Put(':id/suspend')
  async suspendUser(@Param('id', ParseUUIDPipe) id: string) {
    await this.userService.suspendUser(id)
    return { message: '用户已禁用' }
  }

  /**
   * 启用用户（管理员）
   */
  @Put(':id/activate')
  async activateUser(@Param('id', ParseUUIDPipe) id: string) {
    await this.userService.activateUser(id)
    return { message: '用户已启用' }
  }
}