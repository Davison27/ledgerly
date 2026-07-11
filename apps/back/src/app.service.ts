import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Ledgerly ERP API';
  }

  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'ledgerly-back' };
  }
}
