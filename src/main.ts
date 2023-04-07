import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { runCron } from './lib/cron';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  runCron();
  await app.listen(3000);
}
bootstrap();
