import { useEffect, type CSSProperties } from 'react';
import {
  Button,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Typography,
  Upload,
} from 'antd';
import { ProjectOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { ProjectCurrency, ProjectStatus, ProjectType } from '@/entities/project';
import {
  PROJECT_COLOR_TOKENS,
  PROJECT_PALETTE,
  type ProjectColorToken,
} from '@/shared/config/theme';
import { deriveColorToken } from '@/shared/lib/palette';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import typography from '@/shared/ui/typography.module.css';
import styles from './ProjectFormFields.module.css';

const { TextArea } = Input;
const { Text } = Typography;

export interface ProjectFormFieldValues {
  name: string;
  code: string;
  type: ProjectType;
  status: ProjectStatus;
  description?: string;
  clientCompany?: string;
  clientTaxId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  startDate?: Dayjs;
  endDate?: Dayjs;
  budget?: number;
  currency?: ProjectCurrency;
  fiscalYear?: string;
  manager?: string;
  color?: ProjectColorToken;
}

interface ProjectColorPickerProps {
  value?: ProjectColorToken;
  onChange?: (value: ProjectColorToken) => void;
}

function ProjectColorPicker({ value, onChange }: ProjectColorPickerProps) {
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  return (
    <div className={styles.colorPicker}>
      {PROJECT_COLOR_TOKENS.map((colorToken) => {
        const hex = PROJECT_PALETTE[colorToken][isDark ? 'dark' : 'light'];
        const selected = value === colorToken;
        return (
          <button
            key={colorToken}
            type="button"
            aria-label={t(`projects.form.colors.${colorToken}`)}
            aria-pressed={selected}
            data-selected={selected}
            onClick={() => onChange?.(colorToken)}
            className={styles.colorSwatch}
            style={{ '--swatch-color': hex } as CSSProperties}
          />
        );
      })}
    </div>
  );
}

const PROJECT_TYPES: ProjectType[] = [
  'client',
  'internal',
  'audiovisual',
  'construction',
  'consulting',
  'other',
];

const PROJECT_STATUSES: ProjectStatus[] = ['active', 'on_hold', 'completed', 'archived'];

const PROJECT_CURRENCIES: ProjectCurrency[] = ['EUR', 'USD', 'GBP'];

interface ProjectFormFieldsProps {
  image?: string | null;
  onImageChange: (image: string | null | undefined) => void;
  colorSeed?: string;
}

export function ProjectFormFields({ image, onImageChange, colorSeed }: ProjectFormFieldsProps) {
  const { t } = useTranslation();
  const form = Form.useFormInstance<ProjectFormFieldValues>();

  useEffect(() => {
    if (!colorSeed) return;
    if (form.getFieldValue('color')) return;
    form.setFieldValue('color', deriveColorToken(colorSeed));
  }, [colorSeed, form]);

  return (
    <>
      <Row gutter={16}>
        <Col xs={24} sm={8} md={4} className={styles.imageColumn}>
          <Form.Item label={t('projects.form.fields.image')} className={styles.imageField}>
            <Upload
              accept="image/*"
              listType="picture-card"
              showUploadList={false}
              beforeUpload={(file) => {
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === 'string') {
                    onImageChange(reader.result);
                  }
                };
                reader.readAsDataURL(file);
                return false;
              }}
            >
              {image ? (
                <img src={image} alt={t('projects.form.fields.image')} className={styles.imagePreview} />
              ) : (
                <div>
                  <ProjectOutlined className={styles.imagePlaceholderIcon} />
                  <div className={`${typography.caption} ${styles.imagePlaceholderText}`}>
                    {t('projects.form.image.upload')}
                  </div>
                </div>
              )}
            </Upload>
          </Form.Item>
          {image && (
            <Button
              type="link"
              size="small"
              className={styles.removeImageButton}
              onClick={() => onImageChange(null)}
            >
              {t('projects.form.image.remove')}
            </Button>
          )}
          <Text type="secondary" className={styles.imageHint}>
            {t('projects.form.image.hint')}
          </Text>
        </Col>

        <Col xs={24} sm={16} md={20} className={styles.generalFieldsColumn}>
          <Text strong>{t('projects.form.sections.general')}</Text>
          <Divider className={styles.sectionDivider} />
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="name"
                label={t('projects.form.fields.name')}
                rules={[{ required: true, message: t('projects.form.validation.nameRequired') }]}
              >
                <Input placeholder={t('projects.form.placeholders.name')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="code"
                label={t('projects.form.fields.code')}
                rules={[{ required: true, message: t('projects.form.validation.codeRequired') }]}
              >
                <Input placeholder={t('projects.form.placeholders.code')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="type"
                label={t('projects.form.fields.type')}
                rules={[{ required: true, message: t('projects.form.validation.typeRequired') }]}
              >
                <Select
                  placeholder={t('projects.form.placeholders.type')}
                  options={PROJECT_TYPES.map((type) => ({
                    value: type,
                    label: t(`projects.form.types.${type}`),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="status" label={t('projects.form.fields.status')}>
                <Select
                  options={PROJECT_STATUSES.map((status) => ({
                    value: status,
                    label: t(`projects.form.statuses.${status}`),
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="color" label={t('projects.form.fields.color')} className={styles.colorField}>
            <ProjectColorPicker />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="description" label={t('projects.form.fields.description')}>
        <TextArea rows={2} placeholder={t('projects.form.placeholders.description')} />
      </Form.Item>

      <Text strong>{t('projects.form.sections.client')}</Text>
      <Divider className={styles.sectionDivider} />
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item name="clientCompany" label={t('projects.form.fields.clientCompany')}>
            <Input placeholder={t('projects.form.placeholders.clientCompany')} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item name="clientTaxId" label={t('projects.form.fields.clientTaxId')}>
            <Input placeholder={t('projects.form.placeholders.clientTaxId')} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item name="contactName" label={t('projects.form.fields.contactName')}>
            <Input placeholder={t('projects.form.placeholders.contactName')} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="contactEmail"
            label={t('projects.form.fields.contactEmail')}
            rules={[{ type: 'email', message: t('projects.form.validation.emailInvalid') }]}
          >
            <Input type="email" placeholder={t('projects.form.placeholders.contactEmail')} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item name="contactPhone" label={t('projects.form.fields.contactPhone')}>
            <Input placeholder={t('projects.form.placeholders.contactPhone')} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item name="address" label={t('projects.form.fields.address')}>
            <Input placeholder={t('projects.form.placeholders.address')} />
          </Form.Item>
        </Col>
      </Row>

      <Text strong>{t('projects.form.sections.planning')}</Text>
      <Divider className={styles.sectionDivider} />
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Form.Item name="startDate" label={t('projects.form.fields.startDate')}>
            <DatePicker format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item name="endDate" label={t('projects.form.fields.endDate')}>
            <DatePicker format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item
            name="budget"
            label={t('projects.form.fields.budget')}
            rules={[{ type: 'number', min: 0, message: t('projects.form.validation.budgetMin') }]}
          >
            <InputNumber min={0} placeholder={t('projects.form.placeholders.budget')} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item name="currency" label={t('projects.form.fields.currency')}>
            <Select
              options={PROJECT_CURRENCIES.map((currency) => ({
                value: currency,
                label: t(`projects.form.currencies.${currency}`),
              }))}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Form.Item
            name="fiscalYear"
            label={t('projects.form.fields.fiscalYear')}
            className={styles.tightItem}
          >
            <Input placeholder={t('projects.form.placeholders.fiscalYear')} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item
            name="manager"
            label={t('projects.form.fields.manager')}
            className={styles.tightItem}
          >
            <Input placeholder={t('projects.form.placeholders.manager')} />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
