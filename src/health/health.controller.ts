import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';

@Controller()
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly mongooseHealthIndicator: MongooseHealthIndicator,
  ) {}

  @Get('health')
  @HealthCheck()
  health() {
    return this.healthCheckService.check([
      () => this.mongooseHealthIndicator.pingCheck('mongodb'),
    ]);
  }

  @Get('readiness')
  @HealthCheck()
  readiness() {
    return this.healthCheckService.check([
      () => this.mongooseHealthIndicator.pingCheck('mongodb'),
    ]);
  }
}
