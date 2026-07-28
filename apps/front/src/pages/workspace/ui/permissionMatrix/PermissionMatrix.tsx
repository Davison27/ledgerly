import type { ReactNode } from 'react';
import { Button, Dropdown, Flex, Segmented, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  CalendarOutlined,
  DashboardOutlined,
  DownOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  IdcardOutlined,
  ProjectOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  PERMISSION_LEVELS,
  WORKSPACE_MODULES,
  fillMatrix,
  moduleSupportsEdit,
  type PermissionLevelDto,
  type PermissionMatrixDto,
  type WorkspaceModuleDto,
} from '@/entities/workspace-member';
import typography from '@/shared/ui/typography.module.css';
import styles from './PermissionMatrix.module.css';

const { Text } = Typography;

const MODULE_ICONS: Record<WorkspaceModuleDto, ReactNode> = {
  dashboard: <DashboardOutlined />,
  projects: <ProjectOutlined />,
  calendar: <CalendarOutlined />,
  documents: <FileTextOutlined />,
  suppliers: <TeamOutlined />,
  invoices: <FileDoneOutlined />,
  products: <ShoppingOutlined />,
  staff: <IdcardOutlined />,
};

export interface PermissionMatrixProps {
  value: PermissionMatrixDto;
  onChange: (next: PermissionMatrixDto) => void;
  disabled?: boolean;
}

export function PermissionMatrix({ value, onChange, disabled }: PermissionMatrixProps) {
  const { t } = useTranslation();

  const applyAllItems: MenuProps['items'] = PERMISSION_LEVELS.map((level) => ({
    key: level,
    label: t(`workspace.permissions.levels.${level}`),
    onClick: () => onChange(fillMatrix(level)),
  }));

  return (
    <div className={styles.matrix}>
      <Flex align="center" justify="space-between" wrap gap={8} className={styles.header}>
        <div>
          <Text strong>{t('workspace.permissions.title')}</Text>
          <div>
            <Text type="secondary" className={typography.caption}>
              {t('workspace.permissions.hint')}
            </Text>
          </div>
        </div>
        <Dropdown menu={{ items: applyAllItems }} disabled={disabled} trigger={['click']}>
          <Button size="small">
            {t('workspace.permissions.applyAll')} <DownOutlined />
          </Button>
        </Dropdown>
      </Flex>

      <div className={styles.rows}>
        {WORKSPACE_MODULES.map((module) => {
          const moduleLabel = t(`nav.${module}`);
          const options = PERMISSION_LEVELS.map((level) => {
            const unsupported = level === 'edit' && !moduleSupportsEdit(module);
            return {
              value: level,
              label: t(`workspace.permissions.levels.${level}`),
              disabled: unsupported,
              tooltip: unsupported ? t('workspace.permissions.editUnsupported') : undefined,
            };
          });

          return (
            <div key={module} className={styles.row}>
              <Flex align="center" gap={8} className={styles.moduleLabel}>
                <span className={styles.moduleIcon}>{MODULE_ICONS[module]}</span>
                <Text>{moduleLabel}</Text>
              </Flex>
              <Segmented<PermissionLevelDto>
                block
                className={styles.segmented}
                value={value[module]}
                disabled={disabled}
                aria-label={t('workspace.permissions.ariaLabel', { module: moduleLabel })}
                onChange={(level) => onChange({ ...value, [module]: level })}
                options={options}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
