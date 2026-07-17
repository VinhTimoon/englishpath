import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { resolveApiRuntimeConfig } from './config/runtime';
import { configureOpenApi } from './config/openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const { port, webOrigin } = resolveApiRuntimeConfig();

  app.enableCors({ origin: webOrigin });
  configureOpenApi(app);
  await app.listen(port);
}
void bootstrap();
