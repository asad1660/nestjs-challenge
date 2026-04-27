import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RecordDocument } from '../schemas/record.schema';
import { CreateOrderRequestDTO } from './dtos/create-order.request.dto';
import { Order, OrderDocument } from './schemas/order.schema';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel('Order') private readonly orderModel: Model<OrderDocument>,
    @InjectModel('Record') private readonly recordModel: Model<RecordDocument>,
  ) {}

  async create(request: CreateOrderRequestDTO): Promise<Order> {
    const recordId = new Types.ObjectId(request.recordId);
    const updatedRecord = await this.recordModel
      .findOneAndUpdate(
        { _id: recordId, qty: { $gte: request.quantity } },
        { $inc: { qty: -request.quantity } },
        { new: true },
      )
      .exec();

    if (!updatedRecord) {
      throw new BadRequestException('Record not found or insufficient stock');
    }

    return this.orderModel.create({
      recordId,
      quantity: request.quantity,
    });
  }
}
