import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Member {
  @Prop({ required: true })
  serverId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({
    required: true,
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  })
  roleIds: mongoose.Types.ObjectId[];
}

export type MemberDocument = HydratedDocument<Member>;

export const memberSchema = SchemaFactory.createForClass(Member);
