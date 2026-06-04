import {
  Controller,
  Get,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common'
import { MonitoringService } from './monitoring.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'

@ApiTags('监控')
@Controller('api/system')
@UseGuards(JwtAuthGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('status')
  @ApiOperation({ summary: '获取系统健康状态' })
  @ApiResponse({ status: 200, description: '系统状态信息' })
  async getSystemStatus() {
    return await this.monitoringService.getHealthStatus()
  }

  @Get('metrics')
  @ApiOperation({ summary: '获取系统指标' })
  @ApiResponse({ status: 200, description: '系统性能指标' })
  async getSystemMetrics() {
    const [systemMetrics, applicationMetrics] = await Promise.all([
      this.monitoringService.getSystemMetrics(),
      this.monitoringService.getApplicationMetrics(),
    ])

    return {
      system: systemMetrics,
      application: applicationMetrics,
    }
  }

  @Get('alerts')
  @ApiOperation({ summary: '获取系统告警' })
  @ApiResponse({ status: 200, description: '当前系统告警列表' })
  async getSystemAlerts() {
    return await this.monitoringService.getAlerts()
  }

  @Get('metrics/history')
  @ApiOperation({ summary: '获取历史指标' })
  @ApiResponse({ status: 200, description: '历史性能指标' })
  async getHistoricalMetrics(
    @Query('days', ParseIntPipe) days: number = 7,
  ) {
    return await this.monitoringService.getHistoricalMetrics(days)
  }
}