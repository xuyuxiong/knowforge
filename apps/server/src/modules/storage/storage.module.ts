import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { StorageService } from './storage.service'
import { LocalStorageStrategy } from './local.storage'
import { OssStorageStrategy } from './oss.storage'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    StorageService,
    LocalStorageStrategy,
    OssStorageStrategy,
  ],
  exports: [StorageService],
})
export class StorageModule {}