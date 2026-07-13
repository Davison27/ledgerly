import { Card, Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Project } from '../../../../data/enterprises';

interface DetailsCardProps {
  project: Project;
}

const FISCAL_YEARS = ['2024', '2025', '2026'] as const;

/** Tarjeta de detalles del proyecto: nombre, código (solo lectura) y ejercicio fiscal. */
export function DetailsCard({ project }: DetailsCardProps) {
  const { t } = useTranslation();

  return (
    <Card title={t('projects.settings.details')} variant="outlined">
      <Form
        layout="vertical"
        requiredMark={false}
        initialValues={{ name: project.name, fiscalYear: '2025' }}
      >
        <Form.Item name="name" label={t('projects.settings.fieldName')}>
          <Input />
        </Form.Item>
        <Form.Item label={t('projects.settings.fieldCode')}>
          <Input value={project.code} disabled />
        </Form.Item>
        <Form.Item
          name="fiscalYear"
          label={t('projects.settings.fieldFiscalYear')}
          style={{ marginBottom: 0 }}
        >
          <Select
            options={FISCAL_YEARS.map((year) => ({ value: year, label: year }))}
          />
        </Form.Item>
      </Form>
    </Card>
  );
}
