import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'Record', required: true, index: true })
  recordId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  createdAt: Date;

  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
