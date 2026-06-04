import { Module } from '@nestjs/common'
import { YuqueService } from './yuque.service'
import { YuqueController } from './yuque.controller'
import { YuqueSyncProcessor } from './yuque-sync.processor'
import { YuqueMcpService } from './yuque-mcp.service'
import { DocumentModule } from '../document/document.module'

@Module({
  imports: [DocumentModule],
  controllers: [YuqueController],
  providers: [YuqueService, YuqueSyncProcessor, YuqueMcpService],
  exports: [YuqueService, YuqueSyncProcessor, YuqueMcpService],
})
export class YuqueModule {}