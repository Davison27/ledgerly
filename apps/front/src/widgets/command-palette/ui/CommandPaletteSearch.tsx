import { Button, Flex, theme } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { SPACE } from '@/shared/config/theme';
import { useCommandPalette } from '../model/useCommandPalette';
import { CommandPalette } from './CommandPalette';

const { useToken } = theme;

export function CommandPaletteSearch() {
  const { token } = useToken();
  const { t } = useTranslation();
  const { open, close, toggle } = useCommandPalette();

  return (
    <>
      <Button
        type="text"
        className="ledgerly-search-trigger"
        aria-label={t('commandPalette.trigger')}
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: SPACE.sm,
          height: 40,
          width: '100%',
          maxWidth: 360,
          padding: `0 ${SPACE.md}px`,
          borderRadius: token.borderRadiusLG,
          background: token.colorFillTertiary,
          color: token.colorTextTertiary,
        }}
      >
        <Flex align="center" gap={SPACE.xs}>
          <SearchOutlined />
          <span>{t('commandPalette.trigger')}</span>
        </Flex>
        <span style={{ opacity: 0.6, fontSize: 12 }}>⌘K</span>
      </Button>

      <CommandPalette open={open} onClose={close} />
    </>
  );
}
