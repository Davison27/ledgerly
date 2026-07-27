import { Button, Flex } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { SPACE } from '@/shared/config/theme';
import typography from '@/shared/ui/typography.module.css';
import { useCommandPalette } from '../../model/useCommandPalette';
import { CommandPalette } from '../palette/CommandPalette';
import styles from './CommandPaletteSearch.module.css';

export function CommandPaletteSearch() {
  const { t } = useTranslation();
  const { open, close, toggle } = useCommandPalette();

  return (
    <>
      <Button
        type="text"
        className={`ledgerly-search-trigger ${styles.trigger}`}
        aria-label={t('commandPalette.trigger')}
        onClick={toggle}
      >
        <Flex align="center" gap={SPACE.xs}>
          <SearchOutlined />
          <span>{t('commandPalette.trigger')}</span>
        </Flex>
        <span className={`${typography.caption} ${styles.shortcut}`}>⌘K</span>
      </Button>

      <CommandPalette open={open} onClose={close} />
    </>
  );
}
