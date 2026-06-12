import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);

  process.on('SIGINT', async () => {
    console.log('Received SIGINT. Shutting down gracefully...');
    await app.close(); // Close NestJS application context
    process.exit(0); // Exit the process
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Shutting down gracefully...');
    await app.close(); // Close NestJS application context
    process.exit(0); // Exit the process
  });
}
bootstrap();
