import { useEffect, useState } from 'react';
import { Form, Modal } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { Project, ProjectFormValues } from '../../../data/company';
import { ProjectFormFields, type ProjectFormFieldValues } from './ProjectFormFields';

interface ProjectFormModalProps {
  open: boolean;
  project?: Project | null;
  onCancel: () => void;
  onSubmit: (values: ProjectFormValues) => void | Promise<void>;
}

export function ProjectFormModal({ open, project, onCancel, onSubmit }: ProjectFormModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<ProjectFormFieldValues>();
  const [image, setImage] = useState<string | undefined>(undefined);
  const isEdit = Boolean(project);

  useEffect(() => {
    if (!open) return;

    if (project) {
      form.setFieldsValue({
        name: project.name,
        code: project.code,
        type: project.type ?? 'other',
        status: project.status ?? 'active',
        description: project.description,
        clientCompany: project.clientCompany,
        clientTaxId: project.clientTaxId,
        contactName: project.contactName,
        contactEmail: project.contactEmail,
        contactPhone: project.contactPhone,
        address: project.address,
        startDate: project.startDate ? dayjs(project.startDate) : undefined,
        endDate: project.endDate ? dayjs(project.endDate) : undefined,
        budget: project.budget,
        currency: project.currency,
        fiscalYear: project.fiscalYear,
        manager: project.manager,
      });
      setImage(project.image);
    } else {
      form.resetFields();
      setImage(undefined);
    }
  }, [open, project, form]);

  const handleCancel = () => {
    form.resetFields();
    setImage(undefined);
    onCancel();
  };

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        const { startDate, endDate, ...rest } = values;
        const payload: ProjectFormValues = {
          ...rest,
          startDate: startDate ? startDate.format('YYYY-MM-DD') : undefined,
          endDate: endDate ? endDate.format('YYYY-MM-DD') : undefined,
          image,
        };
        form.resetFields();
        setImage(undefined);
        void onSubmit(payload);
      })
      .catch(() => {
        // validation errors are shown inline by antd
      });
  };

  return (
    <Modal
      open={open}
      title={t(isEdit ? 'projects.form.editTitle' : 'projects.form.title')}
      okText={t(isEdit ? 'projects.form.save' : 'projects.form.submit')}
      cancelText={t('common.cancel')}
      onOk={handleOk}
      onCancel={handleCancel}
      destroyOnHidden
      centered
      width="min(1080px, 95vw)"
      styles={{ body: { maxHeight: '80vh', overflowY: 'auto', paddingTop: 4 } }}
    >
      <Form<ProjectFormFieldValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ status: 'active', currency: 'EUR' }}
      >
        <ProjectFormFields image={image} onImageChange={setImage} />
      </Form>
    </Modal>
  );
}
