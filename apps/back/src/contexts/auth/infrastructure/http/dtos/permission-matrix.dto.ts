import { IsIn } from 'class-validator';

const PERMISSION_LEVELS = ['none', 'view', 'edit'] as const;

export class PermissionMatrixDto {
  @IsIn(PERMISSION_LEVELS)
  dashboard: 'none' | 'view' | 'edit';

  @IsIn(PERMISSION_LEVELS)
  projects: 'none' | 'view' | 'edit';

  @IsIn(PERMISSION_LEVELS)
  calendar: 'none' | 'view' | 'edit';

  @IsIn(PERMISSION_LEVELS)
  documents: 'none' | 'view' | 'edit';

  @IsIn(PERMISSION_LEVELS)
  suppliers: 'none' | 'view' | 'edit';

  @IsIn(PERMISSION_LEVELS)
  @IsIn(PERMISSION_LEVELS)
  products: 'none' | 'view' | 'edit';

  @IsIn(PERMISSION_LEVELS)
  staff: 'none' | 'view' | 'edit';
}
