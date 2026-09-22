import { CalendarOutlined } from '@ant-design/icons';
import { Flex, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  currentReleaseVersion,
  getCategorizedReleaseEntries,
  releaseNotes,
} from '@/entities/release-note';
import { formatDate } from '@/shared/lib/dates';
import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';
import styles from './ChangelogPage.module.css';

const { Text, Title } = Typography;

function getEntryTranslationKey(version: string, entryId: string): string {
  const versionKey = version.replaceAll('.', '_');
  return `releaseNotes.releases.v${versionKey}.entries.${entryId}`;
}

export function ChangelogPage() {
  const { t, i18n } = useTranslation();

  return (
    <PageContainer>
      <div className={styles.page}>
        <PageHeader
          title={t('releaseNotes.changelog.title')}
          subtitle={t('releaseNotes.changelog.description')}
          actions={
            <Flex align="center" gap="small" className={styles.currentVersion}>
              <Text type="secondary">{t('releaseNotes.changelog.currentVersion')}</Text>
              <Tag color="blue">{currentReleaseVersion}</Tag>
            </Flex>
          }
        />

        {releaseNotes.releases.length === 0 ? (
          <Text type="secondary" className={styles.empty}>
            {t('releaseNotes.changelog.empty')}
          </Text>
        ) : (
          <div className={styles.releaseList}>
            {releaseNotes.releases.map((release) => {
              const releaseId = `release-${release.version.replaceAll('.', '-')}`;

              return (
                <article key={release.version} className={styles.release} aria-labelledby={releaseId}>
                  <header className={styles.releaseHeader}>
                    <Title level={3} id={releaseId} className={styles.releaseVersion}>
                      {release.version}
                    </Title>
                    <Text type="secondary" className={styles.releaseDate}>
                      <CalendarOutlined aria-hidden="true" />
                      <span>
                        {t('releaseNotes.changelog.releasedOn')} {formatDate(release.date, i18n.language)}
                      </span>
                    </Text>
                  </header>

                  <div className={styles.categoryList}>
                    {getCategorizedReleaseEntries(release.entries).map(({ category, entries }) => {
                      const categoryId = `${releaseId}-${category}`;

                      return (
                        <section key={category} className={styles.category} aria-labelledby={categoryId}>
                          <Title level={4} id={categoryId} className={styles.categoryTitle}>
                            {t(`releaseNotes.categories.${category}`)}
                          </Title>
                          <ul className={styles.entries}>
                            {entries.map((entry) => {
                              const entryKey = getEntryTranslationKey(release.version, entry.id);

                              return (
                                <li key={entry.id} className={styles.entry}>
                                  <Text strong className={styles.entryTitle}>
                                    {t(`${entryKey}.title`)}
                                  </Text>
                                  <Text type="secondary" className={styles.entryDescription}>
                                    {t(`${entryKey}.description`)}
                                  </Text>
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
