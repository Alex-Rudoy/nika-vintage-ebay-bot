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

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(
      'mongodb+srv://Rudoy:Mongo1w2e3r4t@cluster0.uanrk.mongodb.net/Vintage?retryWrites=true&w=majority',
    ),
    MongooseModule.forFeature([{ name: Link.name, schema: LinkSchema }]),
    MongooseModule.forFeature([{ name: ChatId.name, schema: ChatIdSchema }]),
  ],

  controllers: [AppController],
  providers: [
    AppService,
    TelegramService,
    GoogleSpreadsheetsService,
    CoreService,
  ],
})
export class AppModule {}
