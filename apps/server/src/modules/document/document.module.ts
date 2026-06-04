import { Module } from '@nestjs/common'
import { DocumentService } from './document.service'
import { DocumentController } from './document.controller'
import { DocumentParserService } from '../rag/document-parser.service'
import { RagModule } from '../rag/rag.module'

@Module({
  imports: [RagModule],
  controllers: [DocumentController],
  providers: [DocumentService, DocumentParserService],
  exports: [DocumentService],
})
export class DocumentModule {}