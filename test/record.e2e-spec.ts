import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RecordFormat, RecordCategory } from '../src/api/schemas/record.enum';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RecordDocument } from '../src/api/schemas/record.schema';
import { OrderDocument } from '../src/api/orders/schemas/order.schema';

process.env.MONGO_URL ??= 'mongodb://localhost:27017/records-test';
process.env.MB_TIMEOUT_MS ??= '500';

describe('RecordController (e2e)', () => {
  let app: INestApplication;
  let recordModel: Model<RecordDocument>;
  let orderModel: Model<OrderDocument>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );
    recordModel = app.get(getModelToken('Record'));
    orderModel = app.get(getModelToken('Order'));
    await app.init();
  });

  beforeEach(async () => {
    await orderModel.deleteMany({});
    await recordModel.deleteMany({});
  });

  it('should create a new record', async () => {
    const createRecordDto = {
      artist: 'The Beatles',
      album: 'Abbey Road',
      price: 25,
      qty: 10,
      format: RecordFormat.VINYL,
      category: RecordCategory.ROCK,
    };

    const response = await request(app.getHttpServer())
      .post('/records')
      .send(createRecordDto)
      .expect(201);

    expect(response.body).toHaveProperty('artist', 'The Beatles');
    expect(response.body).toHaveProperty('album', 'Abbey Road');
    expect(response.body).toHaveProperty('tracklist');
  });

  it('should create a new record and fetch it with filters', async () => {
    const createRecordDto = {
      artist: 'The Fake Band',
      album: 'Fake Album',
      price: 25,
      qty: 10,
      format: RecordFormat.VINYL,
      category: RecordCategory.ROCK,
    };

    await request(app.getHttpServer())
      .post('/records')
      .send(createRecordDto)
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/records?artist=The Fake Band')
      .expect(200);
    expect(response.body.count).toBe(1);
    expect(response.body.items[0]).toHaveProperty('artist', 'The Fake Band');
  });

  it('should paginate records with a cursor', async () => {
    await recordModel.insertMany([
      {
        artist: 'Artist A',
        album: 'Album A',
        price: 10,
        qty: 2,
        format: RecordFormat.VINYL,
        category: RecordCategory.ROCK,
      },
      {
        artist: 'Artist B',
        album: 'Album B',
        price: 10,
        qty: 2,
        format: RecordFormat.CD,
        category: RecordCategory.POP,
      },
      {
        artist: 'Artist C',
        album: 'Album C',
        price: 10,
        qty: 2,
        format: RecordFormat.CASSETTE,
        category: RecordCategory.JAZZ,
      },
    ]);

    const firstPage = await request(app.getHttpServer())
      .get('/records?limit=2')
      .expect(200);

    expect(firstPage.body.count).toBe(2);
    expect(firstPage.body.nextCursor).toBeDefined();

    const secondPage = await request(app.getHttpServer())
      .get(`/records?limit=2&cursor=${firstPage.body.nextCursor}`)
      .expect(200);

    expect(secondPage.body.count).toBe(1);
  });

  it('should return 404 when updating a missing record', async () => {
    await request(app.getHttpServer())
      .put('/records/000000000000000000000001')
      .send({ price: 20 })
      .expect(404);
  });

  it('should prevent concurrent orders from overselling stock', async () => {
    const record = await recordModel.create({
      artist: 'Limited Artist',
      album: 'Limited Album',
      price: 10,
      qty: 1,
      format: RecordFormat.VINYL,
      category: RecordCategory.ROCK,
    });

    const responses = await Promise.all([
      request(app.getHttpServer()).post('/orders').send({
        recordId: record._id.toString(),
        quantity: 1,
      }),
      request(app.getHttpServer()).post('/orders').send({
        recordId: record._id.toString(),
        quantity: 1,
      }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 400,
    ]);
    await expect(orderModel.countDocuments()).resolves.toBe(1);
    await expect(
      recordModel.findById(record._id).then((doc) => doc.qty),
    ).resolves.toBe(0);
  });

  it('should expose health and readiness checks', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    await request(app.getHttpServer()).get('/readiness').expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
