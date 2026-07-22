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
import { CompanyModule } from './contexts/company/company.module';
import { ProjectsModule } from './contexts/projects/projects.module';
import { DocumentsModule } from './contexts/documents/documents.module';
import { InvoicesModule } from './contexts/invoices/invoices.module';
import { SuppliersModule } from './contexts/suppliers/suppliers.module';
import { ProductsModule } from './contexts/products/products.module';
import { DashboardModule } from './contexts/dashboard/dashboard.module';
import { DemoModule } from './contexts/demo/demo.module';
import { StaffModule } from './contexts/staff/staff.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    // Límite global y generoso: el objetivo es cortar abuso (subida de
    // ficheros, extracción de PDF sin límite), no molestar al uso normal del
    // front. Los endpoints caros añaden su propio límite más estricto con
    // @Throttle() en su controlador.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    SharedModule,
    CompanyModule,
    ProjectsModule,
    DocumentsModule,
    InvoicesModule,
    SuppliersModule,
    ProductsModule,
    DashboardModule,
    DemoModule,
    StaffModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
