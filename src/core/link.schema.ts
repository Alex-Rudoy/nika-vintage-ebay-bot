import { HydratedDocument } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type CatDocument = HydratedDocument<Link>;

@Schema()
export class Link {
  @Prop({ required: true })
  link: string;
}

export const LinkSchema = SchemaFactory.createForClass(Link);
