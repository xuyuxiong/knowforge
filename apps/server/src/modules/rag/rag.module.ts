import { Module } from '@nestjs/common'
import { RagService } from './rag.service'
import { RagController } from './rag.controller'
import { RagCoreService } from './rag-core.service'
import { LangchainService } from './langchain.service'
import { DocumentParserService } from './document-parser.service'
import { ThetaLLMService } from './theta-llm.service'
import { PdfParserService } from './pdf-parser.service'
import { WordParserService } from './word-parser.service'
import { BM25Service } from './bm25.service'
import { RerankerService } from './reranker.service'
import { HybridSearchService } from './hybrid-search.service'

@Module({
  controllers: [RagController],
  providers: [
    RagService,
    RagCoreService,
    LangchainService,
    DocumentParserService,
    ThetaLLMService,
    PdfParserService,
    WordParserService,
    BM25Service,
    RerankerService,
    HybridSearchService,
  ],
  exports: [
    RagService,
    RagCoreService,
    LangchainService,
    DocumentParserService,
    ThetaLLMService,
    PdfParserService,
    WordParserService,
    BM25Service,
    RerankerService,
    HybridSearchService,
  ],
})
export class RagModule {}