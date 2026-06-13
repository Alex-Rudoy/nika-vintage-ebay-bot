import { HydratedDocument } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type LinkDocument = HydratedDocument<Link>;

@Schema({ timestamps: true })
export class Link {
  @Prop({ required: true })
  link: string;

  @Prop()
  brandName?: string;
}

export const LinkSchema = SchemaFactory.createForClass(Link);
LinkSchema.index({ link: 1 }, { unique: true });
