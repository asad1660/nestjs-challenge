import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateOrderRequestDTO } from './dtos/create-order.request.dto';
import { Order } from './schemas/order.schema';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create an order for a record' })
  @ApiResponse({ status: 201, description: 'Order successfully created' })
  @ApiResponse({
    status: 400,
    description: 'Record not found or insufficient stock',
  })
  async create(@Body() request: CreateOrderRequestDTO): Promise<Order> {
    return this.orderService.create(request);
  }
}
