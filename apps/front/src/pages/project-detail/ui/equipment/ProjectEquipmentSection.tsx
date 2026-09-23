import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  DatePicker,
  Empty,
  Flex,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { equipmentQueries } from '@/entities/equipment';
import {
  deleteProjectEquipment,
  deleteProjectLeaseExpense,
  projectEquipmentQueries,
  saveProjectEquipment,
  type ProjectEquipmentDto,
  type ProjectLeaseExpenseDto,
} from '@/entities/project-equipment';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { Amount } from '@/shared/ui/Amount';
import { PageContainer } from '@/shared/ui/PageContainer';
import type { ProjectSectionProps } from '../../model/types';
import styles from './ProjectEquipmentSection.module.css';

interface FormValues {
  equipmentId: string;
  leaseExpense?: number;
  leaseExpenseDate?: Dayjs;
}

type ModalMode = 'equipment' | 'expense';

export function ProjectEquipmentSection({ project }: ProjectSectionProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { canAccess } = useWorkspaceAccess();
  const canView = canAccess('projects', 'view') && canAccess('equipment', 'view');
  const canEdit = canAccess('projects', 'edit') && canAccess('equipment', 'edit');
  const { data: assigned = [], isPending } = useQuery({
    ...projectEquipmentQueries.list(project.id),
    enabled: canView,
  });
  const { data: equipmentData = [] } = useQuery({
    ...equipmentQueries.list(),
    enabled: canView,
  });
  const equipment = equipmentData.filter((item) => !item.archivedAt);
  const [open, setOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('equipment');
  const [expenseEquipment, setExpenseEquipment] = useState<ProjectEquipmentDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const refresh = () => queryClient.invalidateQueries({ queryKey: projectEquipmentQueries.all });

  const openEquipmentModal = () => {
    form.resetFields();
    setModalMode('equipment');
    setExpenseEquipment(null);
    setOpen(true);
  };

  const openExpenseModal = (item: ProjectEquipmentDto) => {
    form.resetFields();
    form.setFieldsValue({ equipmentId: item.equipmentId });
    setModalMode('expense');
    setExpenseEquipment(item);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setExpenseEquipment(null);
    form.resetFields();
  };

  const save = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await saveProjectEquipment(project.id, {
        equipmentId: values.equipmentId,
        ...(modalMode === 'expense'
          ? {
              leaseExpense: values.leaseExpense,
              leaseExpenseDate: values.leaseExpenseDate?.format('YYYY-MM-DD'),
            }
          : {}),
      });
      await refresh();
      closeModal();
      void message.success(
        t(modalMode === 'expense' ? 'projects.equipment.leaseExpenses.saved' : 'projects.equipment.saved'),
      );
    } catch {
      void message.error(
        t(
          modalMode === 'expense'
            ? 'projects.equipment.leaseExpenses.saveError'
            : 'projects.equipment.saveError',
        ),
      );
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

  const removeExpense = async (item: ProjectEquipmentDto, expense: ProjectLeaseExpenseDto) => {
    try {
      await deleteProjectLeaseExpense(project.id, item.equipmentId, expense.id);
      await refresh();
      void message.success(t('projects.equipment.leaseExpenses.deleted'));
    } catch {
      void message.error(t('projects.equipment.leaseExpenses.deleteError'));
    }
  };

  return (
    <>
      <PageContainer>
        <Space orientation="vertical" size={16} className={styles.root}>
          {canEdit ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={openEquipmentModal}>
              {t('projects.equipment.add')}
            </Button>
          ) : null}
          <Table<ProjectEquipmentDto>
            rowKey="equipmentId"
            loading={isPending}
            locale={{ emptyText: <Empty description={t('projects.equipment.empty')} /> }}
            pagination={false}
            dataSource={assigned}
            columns={[
              {
                title: t('projects.equipment.columns.equipment'),
                dataIndex: 'name',
                render: (_, item) => (
                  <Space>
                    <span>{item.name}</span>
                    {item.reference ? <Typography.Text type="secondary">{item.reference}</Typography.Text> : null}
                  </Space>
                ),
              },
              {
                title: t('projects.equipment.columns.catalogLease'),
                dataIndex: 'leasingMonthlyFee',
                render: (value: number | null) => value === null ? '—' : <Amount value={value} />,
              },
              {
                title: t('projects.equipment.leaseExpenses.title'),
                dataIndex: 'leaseExpenses',
                render: (expenses: ProjectLeaseExpenseDto[], item: ProjectEquipmentDto) => (
                  <Flex vertical gap={4} className={styles.expenseList}>
                    {expenses.length === 0 ? <span>—</span> : expenses.map((expense) => (
                      <Flex key={expense.id} align="center" gap={8} className={styles.expenseRow}>
                        <Amount value={expense.amount} />
                        <Typography.Text type="secondary">{expense.date}</Typography.Text>
                        {canEdit ? (
                          <Button
                            type="text"
                            danger
                            size="small"
                            aria-label={t('projects.equipment.leaseExpenses.delete')}
                            icon={<DeleteOutlined />}
                            onClick={() => void removeExpense(item, expense)}
                          />
                        ) : null}
                      </Flex>
                    ))}
                  </Flex>
                ),
              },
              ...(canEdit ? [{
                title: t('projects.equipment.columns.actions'),
                key: 'actions',
                width: 180,
                render: (_: unknown, item: ProjectEquipmentDto) => (
                  <Flex gap={4}>
                    <Button type="link" size="small" onClick={() => openExpenseModal(item)}>
                      {t('projects.equipment.leaseExpenses.add')}
                    </Button>
                    <Button
                      type="text"
                      danger
                      aria-label={t('common.delete')}
                      icon={<DeleteOutlined />}
                      onClick={() => void remove(item)}
                    />
                  </Flex>
                ),
              }] : []),
            ]}
          />
        </Space>
      </PageContainer>
      {canEdit && (
        <Modal
          open={open}
          title={t(modalMode === 'expense' ? 'projects.equipment.leaseExpenses.addTitle' : 'projects.equipment.addTitle')}
          onCancel={closeModal}
          onOk={() => void save()}
          confirmLoading={submitting}
          okText={t('common.add')}
        >
          <Form form={form} layout="vertical" initialValues={{ leaseExpenseDate: dayjs() }}>
          <Form.Item
            name="equipmentId"
            label={t('projects.equipment.columns.equipment')}
            rules={[{ required: true, message: t('projects.equipment.validation.equipmentRequired') }]}
          >
            <Select
              showSearch
              disabled={modalMode === 'expense'}
              optionFilterProp="label"
              options={equipment.map((item) => ({
                value: item.id,
                label: item.reference ? `${item.name} · ${item.reference}` : item.name,
              }))}
            />
          </Form.Item>
          {modalMode === 'expense' ? (
            <>
              <Form.Item
                name="leaseExpense"
                label={t('projects.equipment.leaseExpenses.amount')}
                rules={[{ required: true, message: t('projects.equipment.leaseExpenses.amountRequired') }]}
              >
                <InputNumber min={0} className={styles.fullWidth} />
              </Form.Item>
              <Form.Item
                name="leaseExpenseDate"
                label={t('projects.equipment.leaseExpenses.date')}
                rules={[{ required: true, message: t('projects.equipment.leaseExpenses.dateRequired') }]}
              >
                <DatePicker className={styles.fullWidth} format="YYYY-MM-DD" />
              </Form.Item>
            </>
          ) : null}
          </Form>
          {expenseEquipment ? <Typography.Text type="secondary">{expenseEquipment.name}</Typography.Text> : null}
        </Modal>
      )}
    </>
  );
}
