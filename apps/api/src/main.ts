import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { resolveApiRuntimeConfig } from './config/runtime';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const { port, webOrigin } = resolveApiRuntimeConfig();

  app.enableCors({ origin: webOrigin });
  await app.listen(port);
}
void bootstrap();
