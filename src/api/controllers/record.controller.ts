import { Controller, Get, Post, Body, Param, Query, Put } from '@nestjs/common';
import { Record } from '../schemas/record.schema';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateRecordRequestDTO } from '../dtos/create-record.request.dto';
import { UpdateRecordRequestDTO } from '../dtos/update-record.request.dto';
import { RecordService } from '../services/record.service';
import { ListRecordsQueryDTO } from '../dtos/list-records.query.dto';
import { ListRecordsResponseDTO } from '../dtos/list-records.response.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('records')
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new record' })
  @ApiResponse({ status: 201, description: 'Record successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - A record with this artist, album, and format already exists',
  })
  async create(@Body() request: CreateRecordRequestDTO): Promise<Record> {
    return this.recordService.create(request);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing record' })
  @ApiResponse({ status: 200, description: 'Record updated successfully' })
  @ApiResponse({ status: 404, description: 'Cannot find record to update' })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - A record with this artist, album, and format already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateRecordDto: UpdateRecordRequestDTO,
  ): Promise<Record> {
    return this.recordService.update(id, updateRecordDto);
  }

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Get all records with optional filters' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of records',
    type: ListRecordsResponseDTO,
  })
  async findAll(
    @Query() query: ListRecordsQueryDTO,
  ): Promise<ListRecordsResponseDTO> {
    return this.recordService.findMany(query);
  }
}
