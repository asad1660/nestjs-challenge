import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Cache } from 'cache-manager';
import { FilterQuery, Model, Types } from 'mongoose';
import { CreateRecordRequestDTO } from '../dtos/create-record.request.dto';
import {
  DEFAULT_RECORD_LIMIT,
  ListRecordsQueryDTO,
} from '../dtos/list-records.query.dto';
import { ListRecordsResponseDTO } from '../dtos/list-records.response.dto';
import { UpdateRecordRequestDTO } from '../dtos/update-record.request.dto';
import { Record, RecordDocument } from '../schemas/record.schema';
import { MusicBrainzService } from '../../integrations/musicbrainz/musicbrainz.service';

type IterableCacheStore = {
  iterator?: (options?: unknown) => AsyncIterable<[string, unknown]>;
};

@Injectable()
export class RecordService {
  private static readonly LIST_CACHE_PREFIX = 'records:list:';
  private readonly logger = new Logger(RecordService.name);
  private readonly recordListCacheTtlMs: number;

  constructor(
    @InjectModel('Record') private readonly recordModel: Model<RecordDocument>,
    private readonly musicBrainzService: MusicBrainzService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    configService: ConfigService,
  ) {
    this.recordListCacheTtlMs = configService.get<number>(
      'cache.recordListTtlMs',
      60000,
    );
  }

  async create(request: CreateRecordRequestDTO): Promise<Record> {
    const createPayload: Partial<Record> = {
      artist: request.artist,
      album: request.album,
      price: request.price,
      qty: request.qty,
      format: request.format,
      category: request.category,
      mbid: request.mbid,
      tracklist: request.tracklist ?? [],
    };

    if (request.mbid) {
      createPayload.tracklist =
        await this.musicBrainzService.getReleaseTracklist(request.mbid);
      createPayload.musicBrainzFetchedAt = new Date();
      createPayload.musicBrainzError = undefined;
    }

    let record;
    try {
      record = await this.recordModel.create(createPayload);
    } catch (error: any) {
      if (error && error.code === 11000) {
        throw new ConflictException(
          'A record with this artist, album, and format already exists',
        );
      }
      throw error;
    }
    await this.invalidateListCache();

    return record;
  }

  async update(id: string, request: UpdateRecordRequestDTO): Promise<Record> {
    const existingRecord = await this.recordModel.findById(id).exec();

    if (!existingRecord) {
      throw new NotFoundException('Record not found');
    }

    const update = this.buildUpdate(request);
    const mbidChanged =
      request.mbid !== undefined && request.mbid !== existingRecord.mbid;

    if (mbidChanged) {
      update.$set.tracklist = request.mbid
        ? await this.musicBrainzService.getReleaseTracklist(request.mbid)
        : [];
      update.$set.musicBrainzFetchedAt = request.mbid ? new Date() : undefined;
      update.$unset = request.mbid ? { musicBrainzError: '' } : undefined;
    }

    let updatedRecord;
    try {
      updatedRecord = await this.recordModel
        .findByIdAndUpdate(id, update, { new: true, runValidators: true })
        .exec();
    } catch (error: any) {
      if (error && error.code === 11000) {
        throw new ConflictException(
          'A record with this artist, album, and format already exists',
        );
      }
      throw error;
    }

    if (!updatedRecord) {
      throw new NotFoundException('Record not found');
    }

    await this.invalidateListCache();

    return updatedRecord;
  }

  async findMany(query: ListRecordsQueryDTO): Promise<ListRecordsResponseDTO> {
    const normalizedQuery = {
      ...query,
      limit: query.limit ?? DEFAULT_RECORD_LIMIT,
    };
    const cacheKey = `${RecordService.LIST_CACHE_PREFIX}${JSON.stringify(
      normalizedQuery,
    )}`;
    const cached = await this.getCachedList(cacheKey);

    if (cached) {
      return cached;
    }

    const records = await this.recordModel
      .find(this.buildFilter(normalizedQuery))
      .sort({ createdAt: -1, _id: -1 })
      .limit(normalizedQuery.limit + 1)
      .exec();

    const hasNextPage = records.length > normalizedQuery.limit;
    const items = hasNextPage
      ? records.slice(0, normalizedQuery.limit)
      : records;
    const response: ListRecordsResponseDTO = {
      items,
      count: items.length,
      nextCursor: hasNextPage
        ? this.encodeCursor(items[items.length - 1])
        : undefined,
    };

    await this.setCachedList(cacheKey, response);

    return response;
  }

  buildFilter(query: ListRecordsQueryDTO): FilterQuery<RecordDocument> {
    const andFilters: FilterQuery<RecordDocument>[] = [];
    const filter: FilterQuery<RecordDocument> = {};

    if (query.q) {
      filter.$text = { $search: query.q };
    }

    if (query.artist) {
      filter.artist = this.toCaseInsensitiveRegex(query.artist);
    }

    if (query.album) {
      filter.album = this.toCaseInsensitiveRegex(query.album);
    }

    if (query.format) {
      filter.format = query.format;
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.cursor) {
      const cursor = this.decodeCursor(query.cursor);
      andFilters.push({
        $or: [
          { createdAt: { $lt: cursor.createdAt } },
          {
            createdAt: cursor.createdAt,
            _id: { $lt: new Types.ObjectId(cursor.id) },
          },
        ],
      });
    }

    if (andFilters.length) {
      filter.$and = andFilters;
    }

    return filter;
  }

  private buildUpdate(request: UpdateRecordRequestDTO): {
    $set: Partial<Record>;
    $unset?: { [key: string]: '' };
  } {
    const $set: Partial<Record> = {};

    for (const key of [
      'artist',
      'album',
      'price',
      'qty',
      'format',
      'category',
      'mbid',
      'tracklist',
    ] as const) {
      if (request[key] !== undefined) {
        $set[key] = request[key] as never;
      }
    }

    return { $set };
  }

  private toCaseInsensitiveRegex(value: string): RegExp {
    return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }

  private encodeCursor(record: RecordDocument): string {
    return Buffer.from(
      JSON.stringify({
        createdAt: record.createdAt.toISOString(),
        id: record._id.toString(),
      }),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: string } {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString());

    return {
      createdAt: new Date(decoded.createdAt),
      id: decoded.id,
    };
  }

  private async getCachedList(
    cacheKey: string,
  ): Promise<ListRecordsResponseDTO | undefined> {
    try {
      return await this.cacheManager.get<ListRecordsResponseDTO>(cacheKey);
    } catch (error) {
      this.logger.warn(`Record list cache read failed: ${error.message}`);
      return undefined;
    }
  }

  private async setCachedList(
    cacheKey: string,
    response: ListRecordsResponseDTO,
  ): Promise<void> {
    try {
      await this.cacheManager.set(
        cacheKey,
        response,
        this.recordListCacheTtlMs,
      );
    } catch (error) {
      this.logger.warn(`Record list cache write failed: ${error.message}`);
    }
  }

  private async invalidateListCache(): Promise<void> {
    try {
      const cacheStores = (
        this.cacheManager as Cache & {
          stores?: IterableCacheStore[];
        }
      ).stores;

      if (!cacheStores?.length) {
        throw new Error('Redis cache store is not configured');
      }

      const { canIterate, keys: listCacheKeys } =
        await this.findListCacheKeys(cacheStores);

      if (!canIterate) {
        throw new Error('Redis cache store does not support key iteration');
      }

      if (!listCacheKeys.length) {
        return;
      }

      await Promise.all(
        listCacheKeys.map((cacheKey) => this.cacheManager.del(cacheKey)),
      );
    } catch (error) {
      this.logger.warn(
        `Record list cache invalidation failed: ${error.message}`,
      );
    }
  }

  private async findListCacheKeys(
    cacheStores: IterableCacheStore[],
  ): Promise<{ canIterate: boolean; keys: string[] }> {
    const listCacheKeys = new Set<string>();
    let canIterate = false;

    for (const store of cacheStores) {
      if (!store.iterator) {
        continue;
      }

      canIterate = true;

      for await (const [cacheKey] of store.iterator({})) {
        const normalizedCacheKey = this.normalizeListCacheKey(cacheKey);

        if (normalizedCacheKey) {
          listCacheKeys.add(normalizedCacheKey);
        }
      }
    }

    return { canIterate, keys: Array.from(listCacheKeys) };
  }

  private normalizeListCacheKey(cacheKey: string): string | undefined {
    const prefixIndex = cacheKey.indexOf(RecordService.LIST_CACHE_PREFIX);

    if (prefixIndex === -1) {
      return undefined;
    }

    return cacheKey.slice(prefixIndex);
  }
}
