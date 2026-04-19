// apps/backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConstantsService } from './constants/constants.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const constants = app.get(ConstantsService);

  app.enableCors({
    origin: constants.getFrontendOrigins(),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = constants.getPort();
  await app.listen(port);
  const langSmithStatus = constants.isLangSmithEnabled()
    ? `LangSmith ON — project=${process.env.LANGCHAIN_PROJECT}`
    : 'LangSmith OFF (set LANGCHAIN_TRACING_V2=true + LANGCHAIN_API_KEY to enable)';
  console.log(`Shortlist API on :${port} | ${langSmithStatus}`);
}

bootstrap();
