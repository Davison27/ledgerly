import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Empty, Form, InputNumber, Modal, Select, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { equipmentQueries } from '@/entities/equipment';
import {
  deleteProjectEquipment,
  projectEquipmentQueries,
  saveProjectEquipment,
  type ProjectEquipmentDto,
} from '@/entities/project-equipment';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { Amount } from '@/shared/ui/Amount';
import type { ProjectSectionProps } from '../../model/types';

interface FormValues {
  equipmentId: string;
  leaseExpense?: number;
  leaseExpenseDate?: dayjs.Dayjs;
}

export function ProjectEquipmentSection({ project }: ProjectSectionProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { canAccess } = useWorkspaceAccess();
  const canEdit = canAccess('projects', 'edit');
  const { data: assigned = [], isPending } = useQuery(projectEquipmentQueries.list(project.id));
  const { data: equipment = [] } = useQuery(equipmentQueries.list());
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const refresh = () => queryClient.invalidateQueries({ queryKey: projectEquipmentQueries.all });

  const add = async () => {
    const values = await form.validateFields();
    if (values.leaseExpense !== undefined && !values.leaseExpenseDate) {
      form.setFields([{ name: 'leaseExpenseDate', errors: [t('projects.equipment.validation.dateRequired')]}]);
      return;
    }
    setSubmitting(true);
    try {
      await saveProjectEquipment(project.id, {
        equipmentId: values.equipmentId,
        leaseExpense: values.leaseExpense ?? null,
        leaseExpenseDate: values.leaseExpenseDate?.format('YYYY-MM-DD') ?? null,
      });
      await refresh();
      setOpen(false);
      form.resetFields();
      void message.success(t('projects.equipment.saved'));
    } catch {
      void message.error(t('projects.equipment.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (item: ProjectEquipmentDto) => {
    try {
      await deleteProjectEquipment(project.id, item.equipmentId);
      await refresh();
      void message.success(t('projects.equipment.deleted'));
    } catch {
      void message.error(t('projects.equipment.deleteError'));
    }
  };

  return <>
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('projects.equipment.add')}</Button>}
      <Table<ProjectEquipmentDto>
        rowKey="equipmentId"
        loading={isPending}
        locale={{ emptyText: <Empty description={t('projects.equipment.empty')} /> }}
        pagination={false}
        dataSource={assigned}
        columns={[
          { title: t('projects.equipment.columns.equipment'), dataIndex: 'name', render: (_, item) => <Space><span>{item.name}</span>{item.reference && <Typography.Text type="secondary">{item.reference}</Typography.Text>}</Space> },
          { title: t('projects.equipment.columns.catalogLease'), dataIndex: 'leasingMonthlyFee', render: (value: number | null) => value === null ? '—' : <Amount value={value} /> },
          { title: t('projects.equipment.columns.projectExpense'), dataIndex: 'leaseExpense', render: (value: number | null) => value === null ? '—' : <Amount value={value} /> },
          { title: t('projects.equipment.columns.date'), dataIndex: 'leaseExpenseDate', render: (value: string | null) => value ?? '—' },
          ...(canEdit ? [{ title: '', key: 'actions', width: 56, render: (_: unknown, item: ProjectEquipmentDto) => <Button type="text" danger aria-label={t('common.delete')} icon={<DeleteOutlined />} onClick={() => void remove(item)} /> }] : []),
        ]}
      />
    </Space>
    <Modal open={open} title={t('projects.equipment.addTitle')} onCancel={() => setOpen(false)} onOk={() => void add()} confirmLoading={submitting} okText={t('common.add')}>
      <Form form={form} layout="vertical" initialValues={{ leaseExpenseDate: dayjs() }}>
        <Form.Item name="equipmentId" label={t('projects.equipment.columns.equipment')} rules={[{ required: true, message: t('projects.equipment.validation.equipmentRequired') }]}>
          <Select showSearch optionFilterProp="label" options={equipment.map((item) => ({ value: item.id, label: item.reference ? `${item.name} · ${item.reference}` : item.name }))} />
        </Form.Item>
        <Form.Item name="leaseExpense" label={t('projects.equipment.columns.projectExpense')} extra={t('projects.equipment.expenseHelp')}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="leaseExpenseDate" label={t('projects.equipment.columns.date')}>
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
      </Form>
    </Modal>
  </>;
}
