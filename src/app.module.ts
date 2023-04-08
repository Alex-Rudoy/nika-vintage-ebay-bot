import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreService } from './core/core.service';
import { Link, LinkSchema } from './core/link.schema';
import { GoogleSpreadsheetsService } from './google-spreadsheets/google-spreadsheets.service';
import { ChatId, ChatIdSchema } from './telegram/chatId.schema';
import { TelegramService } from './telegram/telegram.service';
import { CoreController } from './core/core.controller';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_URL),
    MongooseModule.forFeature([{ name: Link.name, schema: LinkSchema }]),
    MongooseModule.forFeature([{ name: ChatId.name, schema: ChatIdSchema }]),
  ],

  controllers: [AppController, CoreController],
  providers: [
    AppService,
    TelegramService,
    GoogleSpreadsheetsService,
    CoreService,
  ],
})
export class AppModule {}
