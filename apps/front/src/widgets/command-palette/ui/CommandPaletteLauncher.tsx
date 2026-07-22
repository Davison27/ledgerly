import { Button, theme } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { SPACE } from '@/shared/config/theme';
import { useCommandPalette } from '../model/useCommandPalette';
import { CommandPalette } from './CommandPalette';

const { useToken } = theme;

export function CommandPaletteLauncher() {
  const { token } = useToken();
  const { t } = useTranslation();
  const { open, close, toggle } = useCommandPalette();

  return (
    <>
      <Button
        type="default"
        shape="round"
        icon={<SearchOutlined />}
        onClick={toggle}
        style={{
          position: 'fixed',
          bottom: SPACE.xl,
          right: SPACE.xl,
          zIndex: 100,
          boxShadow: token.boxShadowSecondary,
          background: token.colorBgContainer,
        }}
      >
        {t('commandPalette.trigger')} <span style={{ opacity: 0.6 }}>⌘K</span>
      </Button>

      <CommandPalette open={open} onClose={close} />
    </>
  );
}
