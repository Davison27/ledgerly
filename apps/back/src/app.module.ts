import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './database/typeorm.config';
import { SharedModule } from './shared/shared.module';
import { CompanyModule } from './contexts/company/company.module';
import { ProjectsModule } from './contexts/projects/projects.module';
import { DocumentsModule } from './contexts/documents/documents.module';
import { InvoicesModule } from './contexts/invoices/invoices.module';
import { SuppliersModule } from './contexts/suppliers/suppliers.module';
import { DashboardModule } from './contexts/dashboard/dashboard.module';
import { DemoModule } from './contexts/demo/demo.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    SharedModule,
    CompanyModule,
    ProjectsModule,
    DocumentsModule,
    InvoicesModule,
    SuppliersModule,
    DashboardModule,
    DemoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
