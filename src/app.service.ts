import { Injectable } from '@nestjs/common';
import { CoreService } from './core/core.service';

@Injectable()
export class AppService {
  constructor(private readonly coreService: CoreService) {}
  async getHello(brand: string) {
    return await this.coreService.debugSearch(brand);
  }
}
