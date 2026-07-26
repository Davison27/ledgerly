import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  App,
  Alert,
  Button,
  Flex,
  Popconfirm,
  Skeleton,
  Table,
  Typography,
  type TableColumnsType,
} from 'antd';
import { DeleteOutlined, EditOutlined, IdcardOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  createStaffMember,
  deleteStaffMember,
  staffQueries,
  updateStaffMember,
  type StaffMemberDto,
} from '@/entities/staff-member';
import { ApiError } from '@/shared/api/httpClient';
import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { Numeric } from '@/shared/ui/Numeric';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import { StaffMemberFormModal, type StaffMemberFormValues } from '@/features/staff-member-form';

const { Text, Link: TypographyLink } = Typography;

export function StaffPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const {
    data: staffMembers = [],
    isPending: loading,
    isError: loadError,
  } = useQuery(staffQueries.list());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState<StaffMemberDto | null>(null);

  const handleAdd = () => {
    setEditingStaffMember(null);
    setIsFormOpen(true);
  };

  const handleEdit = (staffMember: StaffMemberDto) => {
    setEditingStaffMember(staffMember);
    setIsFormOpen(true);
  };

  const handleOpen = (staffMember: StaffMemberDto) => {
    void navigate({ to: '/staff/$staffMemberId', params: { staffMemberId: staffMember.id } });
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingStaffMember(null);
  };

  const handleSubmit = async (values: StaffMemberFormValues) => {
    setSubmitting(true);
    try {
      if (editingStaffMember) {
        await updateStaffMember(editingStaffMember.id, values);
        void message.success(t('staff.form.updated'));
      } else {
        await createStaffMember(values);
        void message.success(t('staff.form.created'));
      }
      setIsFormOpen(false);
      setEditingStaffMember(null);
      await queryClient.invalidateQueries({ queryKey: staffQueries.all });
    } catch {
      void message.error(
        editingStaffMember ? t('staff.form.updateError') : t('staff.form.createError'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (staffMember: StaffMemberDto) => {
    setDeletingId(staffMember.id);
    try {
      await deleteStaffMember(staffMember.id);
      void message.success(t('staff.deleted'));
      await queryClient.invalidateQueries({ queryKey: staffQueries.all });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        modal.confirm({
          title: t('staff.deleteConfirm.blockedTitle'),
          width: 480,
          content: (
            <Flex vertical gap={8}>
              <Text>{error.message || t('staff.deleteConfirm.blockedGeneric')}</Text>
              <Text type="secondary">{t('staff.deleteConfirm.blockedHint')}</Text>
            </Flex>
          ),
          okText: t('staff.deleteConfirm.goToProfile'),
          cancelText: t('common.close'),
          onOk: () => handleOpen(staffMember),
        });
      } else {
        void message.error(t('staff.deleteConfirm.error'));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const columns: TableColumnsType<StaffMemberDto> = [
    {
      title: t('staff.columns.name'),
      key: 'name',
      sorter: (a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
      render: (_, record) => (
        <Flex align="center" gap={8}>
          <TypographyLink onClick={() => handleOpen(record)}>
            {record.firstName} {record.lastName}
          </TypographyLink>
          {record.endDate && <SemanticTag tone="neutral">{t('staff.columns.inactive')}</SemanticTag>}
        </Flex>
      ),
    },
    {
      title: t('staff.columns.position'),
      dataIndex: 'position',
      key: 'position',
      render: (position: string | null | undefined) => position || '—',
    },
    {
      title: t('staff.columns.taxId'),
      dataIndex: 'taxId',
      key: 'taxId',
      width: 160,
      render: (taxId: string | null | undefined) => taxId || '—',
    },
    {
      title: t('staff.columns.hireDate'),
      dataIndex: 'hireDate',
      key: 'hireDate',
      width: 140,
      render: (hireDate: string | null | undefined) =>
        hireDate ? <Numeric>{hireDate}</Numeric> : '—',
    },
    {
      title: t('staff.columns.actions'),
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Flex gap={4} justify="center">
          <Button
            type="text"
            icon={<EditOutlined />}
            aria-label={t('common.edit')}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title={t('staff.deleteConfirm.title')}
            description={t('staff.deleteConfirm.content', {
              name: `${record.firstName} ${record.lastName}`,
            })}
            okText={t('staff.deleteConfirm.ok')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              aria-label={t('common.delete')}
              loading={deletingId === record.id}
            />
          </Popconfirm>
        </Flex>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t('staff.title')}
        subtitle={t('staff.subtitle')}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('staff.add')}
          </Button>
        }
      />

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : loadError ? (
        <Alert type="error" showIcon message={t('staff.loadError')} />
      ) : staffMembers.length === 0 ? (
        <EmptyHint
          icon={<IdcardOutlined />}
          title={t('staff.empty')}
          action={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {t('staff.add')}
            </Button>
          }
        />
      ) : (
        <Table<StaffMemberDto>
          columns={columns}
          dataSource={staffMembers}
          rowKey="id"
          pagination={false}
        />
      )}

      <StaffMemberFormModal
        open={isFormOpen}
        staffMember={editingStaffMember}
        onCancel={handleCancelForm}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </PageContainer>
  );
}
