import { Module } from '@nestjs/common';
import { createKeyv } from '@keyv/redis';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule, CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RecordModule } from './api/record.module';
import { MongooseModule } from '@nestjs/mongoose';
import configuration, { validationSchema } from './app.config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { OrderModule } from './api/orders/order.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): CacheModuleOptions => {
        const redisUrl = configService.getOrThrow<string>('redisUrl');

        return {
          stores: [createKeyv(redisUrl)],
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    TerminusModule,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('mongoUrl'),
      }),
    }),
    RecordModule,
    OrderModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
