import { useTranslation } from 'react-i18next';
import { Alert, Button, Flex, Modal, Tag, Typography } from 'antd';
import {
  currentReleaseVersion,
  getCategorizedReleaseEntries,
  releaseNotes,
} from '@/entities/release-note';
import { formatDate } from '@/shared/lib/dates';
import { useReleaseNotice } from '../../model/useReleaseNotice';
import styles from './ReleaseNoticeDialog.module.css';

const { Text } = Typography;

export interface ReleaseNoticeDialogProps {
  onViewChangelog: () => void;
}

function getEntryTranslationKey(version: string, entryId: string): string {
  const versionKey = version.replaceAll('.', '_');
  return `releaseNotes.releases.v${versionKey}.entries.${entryId}`;
}

export function ReleaseNoticeDialog({ onViewChangelog }: ReleaseNoticeDialogProps) {
  const { t, i18n } = useTranslation();
  const notice = useReleaseNotice({ onViewChangelog });
  const release = releaseNotes.releases.find(({ version }) => version === currentReleaseVersion);

  if (notice.isLoading || notice.isAcknowledged) return null;

  const checkingError = notice.hasQueryError;
  const releaseGroups = release ? getCategorizedReleaseEntries(release.entries) : [];

  return (
    <Modal
      open
      centered
      width={800}
      title={t(checkingError ? 'releaseNotes.dialog.checkTitle' : 'releaseNotes.dialog.title', {
        version: currentReleaseVersion,
      })}
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={checkingError ? null : (
        <Flex justify="space-between" gap="middle" className={styles.actions}>
          <Button
            onClick={() => void notice.performAction('view-changelog')}
            disabled={notice.isAcknowledging}
            loading={notice.isAcknowledging && notice.pendingAction === 'view-changelog'}
          >
            {t('releaseNotes.dialog.viewFullChangelog')}
          </Button>
          <Button
            type="primary"
            onClick={() => void notice.performAction('acknowledge')}
            disabled={notice.isAcknowledging}
            loading={notice.isAcknowledging && notice.pendingAction === 'acknowledge'}
          >
            {t('releaseNotes.dialog.acknowledge')}
          </Button>
        </Flex>
      )}
      rootClassName={styles.modalRoot}
      classNames={{ body: styles.body }}
    >
      {checkingError ? (
        <div className={styles.checkError}>
          <Alert
            type="error"
            showIcon
            message={t('releaseNotes.dialog.loadError')}
            role="alert"
          />
          <Button onClick={notice.retryQuery} loading={notice.isChecking}>
            {t('releaseNotes.dialog.retry')}
          </Button>
        </div>
      ) : (
        <div className={styles.content}>
          <Flex align="center" gap="small" className={styles.releaseMetadata}>
            <Tag color="blue">{currentReleaseVersion}</Tag>
            {release && (
              <Text type="secondary">
                {t('releaseNotes.changelog.releasedOn')} {formatDate(release.date, i18n.language)}
              </Text>
            )}
          </Flex>
          <Text type="secondary" className={styles.description}>
            {t('releaseNotes.dialog.description')}
          </Text>
          {notice.mutationError && (
            <div className={styles.saveError}>
              <Alert
                type="error"
                showIcon
                message={t('releaseNotes.dialog.error')}
                role="alert"
              />
              <Button
                onClick={notice.retryAcknowledgement}
                loading={notice.isAcknowledging}
              >
                {t('releaseNotes.dialog.retry')}
              </Button>
            </div>
          )}
          <div
            className={styles.categoryList}
            role="region"
            aria-label={t('releaseNotes.dialog.description')}
            tabIndex={0}
          >
            {releaseGroups.map(({ category, entries }) => (
              <section
                key={category}
                className={styles.category}
                aria-label={t(`releaseNotes.categories.${category}`)}
              >
                <Text strong role="heading" aria-level={2} className={styles.categoryTitle}>
                  {t(`releaseNotes.categories.${category}`)}
                </Text>
                <ul className={styles.entries}>
                  {entries.map((entry) => {
                    const entryKey = getEntryTranslationKey(currentReleaseVersion, entry.id);

                    return (
                      <li key={entry.id} className={styles.entry}>
                        <Text strong>{t(`${entryKey}.title`)}</Text>
                        <Text type="secondary">{t(`${entryKey}.description`)}</Text>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
