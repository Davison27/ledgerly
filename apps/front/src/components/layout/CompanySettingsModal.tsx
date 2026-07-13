import { useEffect, useState } from 'react';
import { App, ColorPicker, Form, Input, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useCompany } from '../../app/providers/CompanyProvider';

interface CompanySettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function CompanySettingsModal({ open, onClose }: CompanySettingsModalProps) {
  const { t } = useTranslation();
  const { company, updateCompany } = useCompany();
  const { message } = App.useApp();
  const [name, setName] = useState(company.name);
  const [sector, setSector] = useState(company.sector);
  const [color, setColor] = useState(company.color);

  useEffect(() => {
    if (open) {
      setName(company.name);
      setSector(company.sector);
      setColor(company.color);
    }
  }, [open, company]);

  const handleOk = () => {
    updateCompany({ name: name.trim() || company.name, sector, color });
    void message.success(t('company.settings.saved'));
    onClose();
  };

  return (
    <Modal
      open={open}
      title={t('company.settings.title')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnHidden
    >
      <Form layout="vertical" requiredMark={false}>
        <Form.Item label={t('company.settings.name')}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Form.Item>
        <Form.Item label={t('company.settings.sector')}>
          <Input value={sector} onChange={(e) => setSector(e.target.value)} />
        </Form.Item>
        <Form.Item label={t('company.settings.color')} style={{ marginBottom: 0 }}>
          <ColorPicker
            value={color}
            onChange={(_, hex) => setColor(hex)}
            showText
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
