import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CoreService } from './core/core.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const coreService = app.get(CoreService);

  try {
    await coreService.checkForNewItems();
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Cron job failed:', error);
    await app.close();
    process.exit(1);
  }
}

bootstrap();
