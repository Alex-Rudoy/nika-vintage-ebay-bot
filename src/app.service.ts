import { Injectable } from '@nestjs/common';
import { CoreService } from './core/core.service';

@Injectable()
export class AppService {
  constructor(private readonly coreService: CoreService) {}
  async getHello(brand: string) {
    return await this.coreService.showThePage(
      `https://www.ebay.co.uk/sch/281/i.html?_fsrp=1&_from=R40&_nkw=${brand}&LH_PrefLoc=1&_udhi=8&_sop=10&rt=nc&LH_BIN=1`,
    );
  }
}
