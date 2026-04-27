import { Test, TestingModule } from '@nestjs/testing';
import { RecordController } from './record.controller';
import { CreateRecordRequestDTO } from '../dtos/create-record.request.dto';
import { RecordCategory, RecordFormat } from '../schemas/record.enum';
import { RecordService } from '../services/record.service';

describe('RecordController', () => {
  let recordController: RecordController;
  let recordService: jest.Mocked<RecordService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecordController],
      providers: [
        {
          provide: RecordService,
          useValue: {
            create: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    recordController = module.get<RecordController>(RecordController);
    recordService = module.get(RecordService);
  });

  it('should create a new record', async () => {
    const createRecordDto: CreateRecordRequestDTO = {
      artist: 'Test',
      album: 'Test Record',
      price: 100,
      qty: 10,
      format: RecordFormat.VINYL,
      category: RecordCategory.ALTERNATIVE,
    };

    const savedRecord = {
      _id: '1',
      name: 'Test Record',
      price: 100,
      qty: 10,
    };

    recordService.create.mockResolvedValue(savedRecord as any);

    const result = await recordController.create(createRecordDto);
    expect(result).toEqual(savedRecord);
    expect(recordService.create).toHaveBeenCalledWith(createRecordDto);
  });

  it('should return paginated records', async () => {
    const records = [
      { _id: '1', name: 'Record 1', price: 100, qty: 10 },
      { _id: '2', name: 'Record 2', price: 200, qty: 20 },
    ];
    const response = { items: records, count: records.length };

    recordService.findMany.mockResolvedValue(response as any);

    const query = { limit: 20 };
    const result = await recordController.findAll(query);
    expect(result).toEqual(response);
    expect(recordService.findMany).toHaveBeenCalledWith(query);
  });
});
