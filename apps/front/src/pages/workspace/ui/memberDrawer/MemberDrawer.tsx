import { useEffect, useState } from 'react';
import type { FormInstance } from 'antd';
import { Alert, Button, Drawer, Flex, Form, Input, Radio, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  matrixForRole,
  type PermissionMatrixDto,
  type WorkspaceRoleDto,
} from '@/entities/workspace-member';
import typography from '@/shared/ui/typography.module.css';
import type { MemberFormValues, MembersDrawerState } from '../../model/useMembersPanel';
import { PermissionMatrix } from '../permissionMatrix/PermissionMatrix';
import styles from './MemberDrawer.module.css';

const { Text } = Typography;

const ASSIGNABLE_ROLES: readonly WorkspaceRoleDto[] = ['admin', 'member'];

export interface MemberDrawerProps {
  drawer: MembersDrawerState;
  submitting: boolean;
  onClose: () => void;
  onInvite: (
    values: MemberFormValues,
    role: WorkspaceRoleDto,
    permissions: PermissionMatrixDto,
    form: FormInstance<MemberFormValues>,
  ) => Promise<void>;
  onSave: (
    memberId: string,
    name: string,
    role: WorkspaceRoleDto,
    permissions: PermissionMatrixDto,
  ) => Promise<void>;
}

export function MemberDrawer({ drawer, submitting, onClose, onInvite, onSave }: MemberDrawerProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<MemberFormValues>();
  const [role, setRole] = useState<WorkspaceRoleDto>('member');
  const [matrix, setMatrix] = useState<PermissionMatrixDto>(() => matrixForRole('member'));

  const open = drawer !== null;
  const mode = drawer?.mode;
  const editingMember = drawer?.mode === 'edit' ? drawer.member : null;
  useEffect(() => {
    if (!drawer) return;
    if (drawer.mode === 'edit') {
      form.setFieldsValue({ name: drawer.member.name, email: drawer.member.email });
      setRole(drawer.member.role);
      setMatrix({ ...drawer.member.permissions });
    } else {
      form.resetFields();
      setRole('member');
      setMatrix(matrixForRole('member'));
    }
  }, [drawer, form]);

  const handleSubmit = async () => {
    let values: MemberFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const submittedMatrix = role === 'admin' && mode === 'invite' ? matrixForRole('admin') : matrix;

    if (mode === 'invite') {
      await onInvite(values, role, submittedMatrix, form);
    } else if (editingMember) {
      await onSave(editingMember.id, values.name, role, submittedMatrix);
    }
  };

  return (
    <Drawer
      open={open}
      width="min(560px, 100vw)"
      destroyOnHidden
      onClose={onClose}
      title={
        mode === 'edit' && editingMember
          ? t('workspace.memberDrawer.editTitle', { name: editingMember.name })
          : t('workspace.memberDrawer.inviteTitle')
      }
      footer={
        <Flex justify="end" gap={8}>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="primary" loading={submitting} onClick={() => void handleSubmit()}>
            {mode === 'invite' ? t('workspace.memberDrawer.submitInvite') : t('workspace.memberDrawer.submitEdit')}
          </Button>
        </Flex>
      }
    >
      <Flex vertical gap={24}>
        <div>
          <Text strong className={styles.sectionTitle}>
            {t('workspace.memberDrawer.sections.person')}
          </Text>
          <Form<MemberFormValues> form={form} layout="vertical" requiredMark={false} className={styles.form}>
            <Form.Item
              name="name"
              label={t('workspace.memberDrawer.fields.name')}
              rules={[{ required: true, message: t('workspace.memberDrawer.validation.nameRequired') }]}
            >
              <Input placeholder={t('workspace.memberDrawer.placeholders.name')} />
            </Form.Item>
            <Form.Item
              name="email"
              label={t('workspace.memberDrawer.fields.email')}
              extra={mode === 'edit' ? t('workspace.memberDrawer.emailLocked') : undefined}
              rules={[
                { required: true, message: t('workspace.memberDrawer.validation.emailRequired') },
                { type: 'email', message: t('workspace.memberDrawer.validation.emailInvalid') },
              ]}
            >
              <Input placeholder={t('workspace.memberDrawer.placeholders.email')} disabled={mode === 'edit'} />
            </Form.Item>
          </Form>
        </div>

        <div>
          <Text strong className={styles.sectionTitle}>
            {t('workspace.memberDrawer.sections.role')}
          </Text>
          <Radio.Group
            className={styles.roleGroup}
            value={role}
            onChange={(event) => setRole(event.target.value as WorkspaceRoleDto)}
          >
            <Flex vertical gap={8}>
              {ASSIGNABLE_ROLES.map((selectableRole) => (
                <label key={selectableRole} className={styles.roleCard} data-active={role === selectableRole}>
                  <Radio value={selectableRole} className={styles.roleRadio} />
                  <div>
                    <Text strong>{t(`workspace.roles.${selectableRole}.name`)}</Text>
                    <div>
                      <Text type="secondary" className={typography.caption}>
                        {t(`workspace.roles.${selectableRole}.description`)}
                      </Text>
                    </div>
                  </div>
                </label>
              ))}
            </Flex>
          </Radio.Group>
        </div>

        {role === 'admin' ? (
          <Alert type="info" showIcon title={t('workspace.memberDrawer.adminAccess')} />
        ) : (
          <PermissionMatrix value={matrix} onChange={setMatrix} />
        )}
      </Flex>
    </Drawer>
  );
}
