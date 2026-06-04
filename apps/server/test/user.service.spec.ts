import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserService } from '../src/modules/user/user.service'
import { User, UserRole, UserStatus } from '../src/modules/user/user.entity'
import * as bcrypt from 'bcrypt'

describe('UserService', () => {
  let service: UserService
  let repository: Repository<User>

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<UserService>(UserService)
    repository = module.get<Repository<User>>(getRepositoryToken(User))

    jest.clearAllMocks()
  })

  describe('createUser', () => {
    it('应该成功创建用户', async () => {
      const createUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'password123',
        role: UserRole.VIEWER,
      }

      const hashedPassword = 'hashedPassword'
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never)
      mockRepository.findOne.mockResolvedValue(null)
      mockRepository.create.mockReturnValue(createUserDto)
      mockRepository.save.mockResolvedValue({
        id: '1',
        ...createUserDto,
        passwordHash: hashedPassword,
      })

      const result = await service.createUser(createUserDto)

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10)
      expect(mockRepository.save).toHaveBeenCalled()
      expect(result).toHaveProperty('id')
    })

    it('应该抛出用户名已存在的错误', async () => {
      const createUserDto = {
        username: 'existinguser',
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'password123',
      }

      mockRepository.findOne.mockResolvedValue({ id: '1' })

      await expect(service.createUser(createUserDto)).rejects.toThrow('用户名或邮箱已存在')
    })
  })

  describe('validatePassword', () => {
    it('应该验证密码成功', async () => {
      const user = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        status: UserStatus.ACTIVE,
      }

      mockRepository.findOne.mockResolvedValue(user)
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never)

      const result = await service.validatePassword('testuser', 'password123')

      expect(result).toEqual(user)
    })

    it('应该抛出用户不存在的错误', async () => {
      mockRepository.findOne.mockResolvedValue(null)

      await expect(service.validatePassword('nonexistent', 'password123')).rejects.toThrow('用户名或密码错误')
    })

    it('应该抛出账户被禁用的错误', async () => {
      const user = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        status: UserStatus.SUSPENDED,
      }

      mockRepository.findOne.mockResolvedValue(user)

      await expect(service.validatePassword('testuser', 'password123')).rejects.toThrow('账户已被禁用')
    })

    it('应该抛出密码错误的错误', async () => {
      const user = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        status: UserStatus.ACTIVE,
      }

      mockRepository.findOne.mockResolvedValue(user)
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never)

      await expect(service.validatePassword('testuser', 'wrongpassword')).rejects.toThrow('用户名或密码错误')
    })
  })

  describe('updateUser', () => {
    it('应该更新用户信息', async () => {
      const userId = '1'
      const updateData = { displayName: 'Updated Name' }
      const existingUser = {
        id: userId,
        username: 'testuser',
        displayName: 'Old Name',
      }

      mockRepository.findOne.mockResolvedValue(existingUser)
      mockRepository.save.mockResolvedValue({ ...existingUser, ...updateData })

      const result = await service.updateUser(userId, updateData)

      expect(mockRepository.save).toHaveBeenCalledWith({ ...existingUser, ...updateData })
      expect(result.displayName).toBe('Updated Name')
    })

    it('应该抛出用户不存在的错误', async () => {
      const userId = 'nonexistent'
      mockRepository.findOne.mockResolvedValue(null)

      await expect(service.updateUser(userId, {})).rejects.toThrow('用户不存在')
    })
  })

  describe('getUsersPaginated', () => {
    it('应该返回分页的用户列表', async () => {
      const users = [
        { id: '1', username: 'user1' },
        { id: '2', username: 'user2' },
      ]
      const total = 10

      mockRepository.findAndCount.mockResolvedValue([users, total])

      const result = await service.getUsersPaginated(1, 2)

      expect(result).toEqual({
        users,
        total,
        page: 1,
        totalPages: 5,
      })
    })
  })

  describe('getUserStats', () => {
    it('应该返回用户统计信息', async () => {
      mockRepository.count.mockResolvedValueOnce(100)
      mockRepository.count.mockResolvedValueOnce(80)
      mockRepository.count.mockResolvedValueOnce(10)
      mockRepository.count.mockResolvedValueOnce(5)

      const result = await service.getUserStats()

      expect(result).toEqual({
        totalUsers: 100,
        activeUsers: 80,
        suspendedUsers: 10,
        newUsersToday: 5,
      })
    })
  })

  describe('deleteUser', () => {
    it('应该软删除用户', async () => {
      const userId = '1'
      const user = { id: userId, username: 'testuser' }

      mockRepository.findOne.mockResolvedValue(user)
      mockRepository.softDelete.mockResolvedValue({ affected: 1 })

      await service.deleteUser(userId)

      expect(mockRepository.softDelete).toHaveBeenCalledWith(userId)
    })
  })
})