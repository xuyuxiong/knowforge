import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import * as os from 'os'
import * as fs from 'fs'

export interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    loadAverage: number[]
  }
  memory: {
    total: number
    used: number
    free: number
    usage: number
  }
  disk: {
    total: number
    used: number
    free: number
    usage: number
  }
  network: {
    interfaces: Record<string, any>
  }
  process: {
    uptime: number
    memory: NodeJS.MemoryUsage
    pid: number
  }
}

export interface ApplicationMetrics {
  requests: {
    total: number
    perMinute: number
    perHour: number
    perDay: number
    errorRate: number
  }
  documents: {
    total: number
    indexed: number
    failed: number
    processing: number
  }
  knowledgeBases: {
    total: number
    active: number
    inactive: number
  }
  users: {
    total: number
    active: number
    newToday: number
  }
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name)
  private readonly metricsPath: string
  private requestCount = 0
  private errorCount = 0
  private requestLog: Array<{
    timestamp: Date
    method: string
    url: string
    status: number
    duration: number
  }> = []

  constructor(
    private configService: ConfigService,
  ) {
    this.metricsPath = this.configService.get('METRICS_PATH', './metrics')
    this.ensureMetricsDirectory()
  }

  /**
   * 获取系统指标
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()
    const usedMemory = totalMemory - freeMemory

    // 获取磁盘信息
    let diskInfo = { total: 0, used: 0, free: 0, usage: 0 }
    try {
      const stats = fs.statSync('/')
      // 简化的磁盘信息，实际应该使用更准确的库
      diskInfo = {
        total: 100 * 1024 * 1024 * 1024, // 100GB 示例
        used: 60 * 1024 * 1024 * 1024,  // 60GB 示例
        free: 40 * 1024 * 1024 * 1024,  // 40GB 示例
        usage: 60,
      }
    } catch (error) {
      this.logger.warn('无法获取磁盘信息', error)
    }

    return {
      cpu: {
        usage: this.getCpuUsage(),
        cores: os.cpus().length,
        loadAverage: os.loadavg(),
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usage: (usedMemory / totalMemory) * 100,
      },
      disk: diskInfo,
      network: {
        interfaces: os.networkInterfaces(),
      },
      process: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
      },
    }
  }

  /**
   * 获取应用指标
   */
  async getApplicationMetrics(): Promise<ApplicationMetrics> {
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const recentRequests = this.requestLog.filter(
      (log) => log.timestamp >= oneMinuteAgo,
    )
    const hourlyRequests = this.requestLog.filter(
      (log) => log.timestamp >= oneHourAgo,
    )
    const dailyRequests = this.requestLog.filter(
      (log) => log.timestamp >= oneDayAgo,
    )

    return {
      requests: {
        total: this.requestCount,
        perMinute: recentRequests.length,
        perHour: hourlyRequests.length,
        perDay: dailyRequests.length,
        errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      },
      documents: {
        total: 0, // 需要从数据库获取
        indexed: 0,
        failed: 0,
        processing: 0,
      },
      knowledgeBases: {
        total: 0,
        active: 0,
        inactive: 0,
      },
      users: {
        total: 0,
        active: 0,
        newToday: 0,
      },
    }
  }

  /**
   * 记录请求
   */
  recordRequest(
    method: string,
    url: string,
    status: number,
    duration: number,
  ) {
    this.requestCount++
    if (status >= 400) {
      this.errorCount++
    }

    this.requestLog.push({
      timestamp: new Date(),
      method,
      url,
      status,
      duration,
    })

    // 保留最近1000条记录
    if (this.requestLog.length > 1000) {
      this.requestLog = this.requestLog.slice(-1000)
    }
  }

  /**
   * 获取CPU使用率
   */
  private getCpuUsage(): number {
    const cpus = os.cpus()
    let totalIdle = 0
    let totalTick = 0

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times]
      }
      totalIdle += cpu.times.idle
    })

    return ((totalTick - totalIdle) / totalTick) * 100
  }

  /**
   * 获取健康状态
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: Record<string, any>
  }> {
    const systemMetrics = await this.getSystemMetrics()
    const appMetrics = await this.getApplicationMetrics()

    const checks = {
      system: {
        cpu: systemMetrics.cpu.usage < 80,
        memory: systemMetrics.memory.usage < 80,
        disk: systemMetrics.disk.usage < 90,
      },
      application: {
        errorRate: appMetrics.requests.errorRate < 5,
        uptime: systemMetrics.process.uptime > 60,
      },
    }

    const allHealthy = Object.values(checks.system).every(Boolean) &&
      Object.values(checks.application).every(Boolean)

    const status = allHealthy ? 'healthy' : 
      Object.values(checks.system).some(c => !c) ? 'unhealthy' : 'degraded'

    return {
      status,
      checks: {
        ...checks,
        metrics: {
          system: systemMetrics,
          application: appMetrics,
        },
      },
    }
  }

  /**
   * 保存指标到文件
   */
  async saveMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        system: await this.getSystemMetrics(),
        application: await this.getApplicationMetrics(),
      }

      const filename = `metrics-${new Date().toISOString().split('T')[0]}.json`
      const filepath = `${this.metricsPath}/${filename}`

      // 追加到现有文件或创建新文件
      let existingData = []
      if (fs.existsSync(filepath)) {
        try {
          existingData = JSON.parse(fs.readFileSync(filepath, 'utf8'))
        } catch (error) {
          this.logger.warn('无法读取现有指标文件', error)
        }
      }

      existingData.push(metrics)
      
      // 保留最近100条记录
      if (existingData.length > 100) {
        existingData = existingData.slice(-100)
      }

      fs.writeFileSync(filepath, JSON.stringify(existingData, null, 2))
      
      this.logger.debug('指标已保存到文件')
    } catch (error) {
      this.logger.error('保存指标失败', error)
    }
  }

  /**
   * 获取历史指标
   */
  async getHistoricalMetrics(days: number = 7): Promise<any[]> {
    try {
      const metrics = []
      const today = new Date()

      for (let i = 0; i < days; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        
        const filename = `metrics-${date.toISOString().split('T')[0]}.json`
        const filepath = `${this.metricsPath}/${filename}`

        if (fs.existsSync(filepath)) {
          try {
            const dayMetrics = JSON.parse(fs.readFileSync(filepath, 'utf8'))
            metrics.push(...dayMetrics)
          } catch (error) {
            this.logger.warn(`无法读取${filename}`, error)
          }
        }
      }

      return metrics
    } catch (error) {
      this.logger.error('获取历史指标失败', error)
      return []
    }
  }

  /**
   * 清理旧指标文件
   */
  async cleanupOldMetrics(retentionDays: number = 30) {
    try {
      const files = fs.readdirSync(this.metricsPath)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      let deletedCount = 0

      for (const file of files) {
        if (file.startsWith('metrics-') && file.endsWith('.json')) {
          const dateStr = file.replace('metrics-', '').replace('.json', '')
          const fileDate = new Date(dateStr)

          if (fileDate < cutoffDate) {
            fs.unlinkSync(`${this.metricsPath}/${file}`)
            deletedCount++
          }
        }
      }

      this.logger.log(`已清理 ${deletedCount} 个旧指标文件`)
    } catch (error) {
      this.logger.error('清理旧指标文件失败', error)
    }
  }

  /**
   * 确保指标目录存在
   */
  private ensureMetricsDirectory() {
    if (!fs.existsSync(this.metricsPath)) {
      fs.mkdirSync(this.metricsPath, { recursive: true })
    }
  }

  /**
   * 获取告警信息
   */
  async getAlerts(): Promise<Array<{
    type: 'warning' | 'error' | 'info'
    message: string
    timestamp: Date
    details?: any
  }>> {
    const alerts = []
    const metrics = await this.getSystemMetrics()

    // CPU 使用率告警
    if (metrics.cpu.usage > 80) {
      alerts.push({
        type: 'warning' as const,
        message: `CPU使用率过高: ${metrics.cpu.usage.toFixed(2)}%`,
        timestamp: new Date(),
        details: { usage: metrics.cpu.usage },
      })
    }

    // 内存使用率告警
    if (metrics.memory.usage > 85) {
      alerts.push({
        type: 'warning' as const,
        message: `内存使用率过高: ${metrics.memory.usage.toFixed(2)}%`,
        timestamp: new Date(),
        details: { usage: metrics.memory.usage },
      })
    }

    // 磁盘使用率告警
    if (metrics.disk.usage > 90) {
      alerts.push({
        type: 'error' as const,
        message: `磁盘使用率过高: ${metrics.disk.usage.toFixed(2)}%`,
        timestamp: new Date(),
        details: { usage: metrics.disk.usage },
      })
    }

    return alerts
  }
}