import { useEffect } from 'react';
import { Col, DatePicker, Form, Input, Modal, Row } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { StaffMemberDto } from '../../../data/api/types';

const { TextArea } = Input;

export interface StaffMemberFormValues {
  firstName: string;
  lastName: string;
  taxId?: string;
  email?: string;
  phone?: string;
  position?: string;
  hireDate?: string;
  endDate?: string;
  notes?: string;
}

interface StaffMemberFormFieldValues {
  firstName: string;
  lastName: string;
  taxId?: string;
  email?: string;
  phone?: string;
  position?: string;
  hireDate?: Dayjs;
  endDate?: Dayjs;
  notes?: string;
}

interface StaffMemberFormModalProps {
  open: boolean;
  staffMember?: StaffMemberDto | null;
  onCancel: () => void;
  onSubmit: (values: StaffMemberFormValues) => void | Promise<void>;
  submitting?: boolean;
}

export function StaffMemberFormModal({
  open,
  staffMember,
  onCancel,
  onSubmit,
  submitting,
}: StaffMemberFormModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<StaffMemberFormFieldValues>();
  const isEdit = Boolean(staffMember);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        firstName: staffMember?.firstName ?? '',
        lastName: staffMember?.lastName ?? '',
        taxId: staffMember?.taxId ?? undefined,
        email: staffMember?.email ?? undefined,
        phone: staffMember?.phone ?? undefined,
        position: staffMember?.position ?? undefined,
        hireDate: staffMember?.hireDate ? dayjs(staffMember.hireDate) : undefined,
        endDate: staffMember?.endDate ? dayjs(staffMember.endDate) : undefined,
        notes: staffMember?.notes ?? undefined,
      });
    }
  }, [open, staffMember, form]);

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        const { hireDate, endDate, ...rest } = values;
        void onSubmit({
          ...rest,
          hireDate: hireDate ? hireDate.format('YYYY-MM-DD') : undefined,
          endDate: endDate ? endDate.format('YYYY-MM-DD') : undefined,
        });
      })
      .catch(() => {});
  };

  return (
    <Modal
      open={open}
      title={isEdit ? t('staff.form.editTitle') : t('staff.form.createTitle')}
      okText={isEdit ? t('staff.form.submit') : t('staff.form.createSubmit')}
      cancelText={t('common.cancel')}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting}
      destroyOnHidden
      centered
      width="min(720px, 95vw)"
    >
      <Form<StaffMemberFormFieldValues> form={form} layout="vertical" requiredMark={false}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="firstName"
              label={t('staff.fields.firstName')}
              style={{ marginBottom: 12 }}
              rules={[{ required: true, message: t('staff.form.validation.firstNameRequired') }]}
            >
              <Input placeholder={t('staff.form.placeholders.firstName')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="lastName"
              label={t('staff.fields.lastName')}
              style={{ marginBottom: 12 }}
              rules={[{ required: true, message: t('staff.form.validation.lastNameRequired') }]}
            >
              <Input placeholder={t('staff.form.placeholders.lastName')} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="taxId" label={t('staff.fields.taxId')} style={{ marginBottom: 12 }}>
              <Input placeholder={t('staff.form.placeholders.taxId')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="position" label={t('staff.fields.position')} style={{ marginBottom: 12 }}>
              <Input placeholder={t('staff.form.placeholders.position')} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="email"
              label={t('staff.fields.email')}
              style={{ marginBottom: 12 }}
              rules={[{ type: 'email', message: t('staff.form.validation.emailInvalid') }]}
            >
              <Input type="email" placeholder={t('staff.form.placeholders.email')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="phone" label={t('staff.fields.phone')} style={{ marginBottom: 12 }}>
              <Input placeholder={t('staff.form.placeholders.phone')} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="hireDate" label={t('staff.fields.hireDate')} style={{ marginBottom: 12 }}>
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="endDate"
              label={t('staff.fields.endDate')}
              style={{ marginBottom: 12 }}
              extra={t('staff.form.endDateHelp')}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="notes" label={t('staff.fields.notes')} style={{ marginBottom: 0 }}>
          <TextArea rows={3} placeholder={t('staff.form.placeholders.notes')} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
