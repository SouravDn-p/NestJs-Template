import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { ApiResponse } from './common/types/global.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(){
    const data = this.appService.getHello();
    return ApiResponse.success(data);
  }
}
