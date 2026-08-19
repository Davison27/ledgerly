import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  PageRequest,
} from '../../../domain/pagination';

export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  size?: number;
}

export function getOptionalPageRequest(query: PageQueryDto): PageRequest | null {
  if (query.page === undefined && query.size === undefined) {
    return null;
  }

  if (query.page === undefined || query.size === undefined) {
    throw new BadRequestException('page and size must be provided together');
  }

  return {
    page: query.page ?? DEFAULT_PAGE,
    size: query.size ?? DEFAULT_PAGE_SIZE,
  };
}
