import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env-validation.schema';
import { typeOrmConfig } from './database/typeorm.config';
import { SharedModule } from './shared/shared.module';
import { AccessGuard } from './shared/infrastructure/http/access/access.guard';
import { OriginGuard } from './shared/infrastructure/http/access/origin.guard';
import { AuthModule } from './contexts/auth/auth.module';
import { CompanyModule } from './contexts/company/company.module';
import { ProjectsModule } from './contexts/projects/projects.module';
import { DocumentsModule } from './contexts/documents/documents.module';
import { InvoicesModule } from './contexts/invoices/invoices.module';
import { SuppliersModule } from './contexts/suppliers/suppliers.module';
import { ProductsModule } from './contexts/products/products.module';
import { DashboardModule } from './contexts/dashboard/dashboard.module';
import { DemoModule } from './contexts/demo/demo.module';
import { StaffModule } from './contexts/staff/staff.module';
import { ScheduleModule } from './contexts/schedule/schedule.module';
import { NotificationsModule } from './contexts/notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { TaxComplianceModule } from './contexts/tax-compliance/tax-compliance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    SharedModule,
    AuthModule,
    CompanyModule,
    ProjectsModule,
    DocumentsModule,
    InvoicesModule,
    SuppliersModule,
    ProductsModule,
    DashboardModule,
    DemoModule,
    StaffModule,
    ScheduleModule,
    NotificationsModule,
    TaxComplianceModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
})
export class AppModule {}
