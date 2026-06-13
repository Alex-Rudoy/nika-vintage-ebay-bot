import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { validateEnv } from './config/validate-env';
import { CoreService } from './core/core.service';
import { Link, LinkSchema } from './core/link.schema';
import { GoogleSpreadsheetsService } from './google-spreadsheets/google-spreadsheets.service';
import { TelegramService } from './telegram/telegram.service';
import { EbayService } from './ebay/ebay.service';

@Module({
  imports: [
    ConfigModule.forRoot({ validate: validateEnv }),
    MongooseModule.forRoot(process.env.MONGO_URL),
    MongooseModule.forFeature([{ name: Link.name, schema: LinkSchema }]),
  ],
  providers: [
    TelegramService,
    GoogleSpreadsheetsService,
    CoreService,
    EbayService,
  ],
})
export class AppModule {}
