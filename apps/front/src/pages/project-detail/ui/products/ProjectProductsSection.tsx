import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Empty, Form, InputNumber, Modal, Select, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { productQueries } from '@/entities/product';
import { deleteProjectProduct, projectProductQueries, saveProjectProduct, type ProjectProductDto } from '@/entities/project-product';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { Amount } from '@/shared/ui/Amount';
import type { ProjectSectionProps } from '../../model/types';

interface FormValues {
  productId: string;
  leaseExpense?: number;
  leaseExpenseDate?: dayjs.Dayjs;
}

export function ProjectProductsSection({ project }: ProjectSectionProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { canAccess } = useWorkspaceAccess();
  const canEdit = canAccess('projects', 'edit');
  const { data: assigned = [], isPending } = useQuery(projectProductQueries.list(project.id));
  const { data: products = [] } = useQuery(productQueries.list());
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const refresh = () => queryClient.invalidateQueries({ queryKey: projectProductQueries.all });

  const add = async () => {
    const values = await form.validateFields();
    if (values.leaseExpense !== undefined && !values.leaseExpenseDate) {
      form.setFields([{ name: 'leaseExpenseDate', errors: [t('projects.products.validation.dateRequired')]}]);
      return;
    }
    setSubmitting(true);
    try {
      await saveProjectProduct(project.id, {
        productId: values.productId,
        leaseExpense: values.leaseExpense ?? null,
        leaseExpenseDate: values.leaseExpenseDate?.format('YYYY-MM-DD') ?? null,
      });
      await refresh();
      setOpen(false);
      form.resetFields();
      void message.success(t('projects.products.saved'));
    } catch {
      void message.error(t('projects.products.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (item: ProjectProductDto) => {
    try {
      await deleteProjectProduct(project.id, item.productId);
      await refresh();
      void message.success(t('projects.products.deleted'));
    } catch {
      void message.error(t('projects.products.deleteError'));
    }
  };

  return <>
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('projects.products.add')}</Button>}
      <Table<ProjectProductDto>
        rowKey="productId"
        loading={isPending}
        locale={{ emptyText: <Empty description={t('projects.products.empty')} /> }}
        pagination={false}
        dataSource={assigned}
        columns={[
          { title: t('projects.products.columns.product'), dataIndex: 'name', render: (_, item) => <Space><span>{item.name}</span>{item.reference && <Typography.Text type="secondary">{item.reference}</Typography.Text>}</Space> },
          { title: t('projects.products.columns.catalogLease'), dataIndex: 'leasingMonthlyFee', render: (value: number | null) => value === null ? '—' : <Amount value={value} /> },
          { title: t('projects.products.columns.projectExpense'), dataIndex: 'leaseExpense', render: (value: number | null) => value === null ? '—' : <Amount value={value} /> },
          { title: t('projects.products.columns.date'), dataIndex: 'leaseExpenseDate', render: (value: string | null) => value ?? '—' },
          ...(canEdit ? [{ title: '', key: 'actions', width: 56, render: (_: unknown, item: ProjectProductDto) => <Button type="text" danger aria-label={t('common.delete')} icon={<DeleteOutlined />} onClick={() => void remove(item)} /> }] : []),
        ]}
      />
    </Space>
    <Modal open={open} title={t('projects.products.addTitle')} onCancel={() => setOpen(false)} onOk={() => void add()} confirmLoading={submitting} okText={t('common.add')}>
      <Form form={form} layout="vertical" initialValues={{ leaseExpenseDate: dayjs() }}>
        <Form.Item name="productId" label={t('projects.products.columns.product')} rules={[{ required: true, message: t('projects.products.validation.productRequired') }]}>
          <Select showSearch optionFilterProp="label" options={products.map((product) => ({ value: product.id, label: product.reference ? `${product.name} · ${product.reference}` : product.name }))} />
        </Form.Item>
        <Form.Item name="leaseExpense" label={t('projects.products.columns.projectExpense')} extra={t('projects.products.expenseHelp')}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="leaseExpenseDate" label={t('projects.products.columns.date')}>
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
      </Form>
    </Modal>
  </>;
}
