import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('')
  async ok() {
    return 'OK';
  }

  @Get(':brand')
  async getHello(@Param('brand') brand: string) {
    return await this.appService.getHello(brand);
  }
}
