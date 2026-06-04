import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // 全局前缀
  app.setGlobalPrefix('api')

  // 跨域配置
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Swagger 文档
  const config = new DocumentBuilder()
    .setTitle('KnowForge API')
    .setDescription('KnowForge 后端 API 接口文档')
    .setVersion('1.0')
    .addTag('rag', 'RAG 检索相关接口')
    .addTag('document', '文档管理接口')
    .addTag('knowledge', '知识库管理接口')
    .addTag('yuque', '语雀集成接口')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document)

  const port = process.env.PORT || 4000
  await app.listen(port)
  console.log(`🚀 应用启动在：http://localhost:${port}`)
  console.log(`📚 Swagger 文档：http://localhost:${port}/docs`)
}

bootstrap()