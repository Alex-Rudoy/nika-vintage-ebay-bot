import { HydratedDocument } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type CatDocument = HydratedDocument<ChatId>;

@Schema()
export class ChatId {
  @Prop({ required: true })
  chatId: number;
}

export const ChatIdSchema = SchemaFactory.createForClass(ChatId);
