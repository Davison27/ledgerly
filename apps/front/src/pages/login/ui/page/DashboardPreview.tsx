import {
  CalendarOutlined,
  DashboardOutlined,
  FileTextOutlined,
  ProjectOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './LoginPage.module.css';

interface DashboardPreviewProps {
  workspaceName: string;
  logo?: string | null;
}

export function DashboardPreview({ workspaceName, logo }: DashboardPreviewProps) {
  const { t } = useTranslation();
  const initial = workspaceName.charAt(0).toUpperCase();

  return (
    <div className={styles.previewComposition}>
      <div className={styles.previewWindow}>
        <div className={styles.windowBar}>
          <div className={styles.windowControls}>
            <span />
            <span />
            <span />
          </div>
          <div className={styles.windowStatus}>
            <span className={styles.statusDot} />
            {t('login.preview.connected')}
          </div>
        </div>

        <div className={styles.previewApp}>
          <aside className={styles.previewSidebar}>
            <div className={styles.previewIdentity}>
              {logo ? (
                <img src={logo} alt="" className={styles.previewLogo} />
              ) : (
                <span className={styles.previewMark}>{initial}</span>
              )}
              <span className={styles.previewCompany}>{workspaceName}</span>
            </div>

            <nav className={styles.previewNav}>
              <span className={styles.previewNavActive}>
                <DashboardOutlined />
                {t('login.preview.nav.dashboard')}
              </span>
              <span>
                <ProjectOutlined />
                {t('login.preview.nav.projects')}
              </span>
              <span>
                <FileTextOutlined />
                {t('login.preview.nav.documents')}
              </span>
              <span>
                <CalendarOutlined />
                {t('login.preview.nav.calendar')}
              </span>
              <span>
                <TeamOutlined />
                {t('login.preview.nav.team')}
              </span>
            </nav>

            <div className={styles.previewUser}>
              <span className={styles.previewAvatar}>LC</span>
              <span>
                <strong>{t('login.preview.userName')}</strong>
                <small>{t('login.preview.userRole')}</small>
              </span>
            </div>
          </aside>

          <div className={styles.previewDashboard}>
            <div className={styles.previewHeader}>
              <div>
                <span>{t('login.preview.eyebrow')}</span>
                <strong>{t('login.preview.title')}</strong>
              </div>
              <span className={styles.previewPeriod}>{t('login.preview.period')}</span>
            </div>

            <div className={styles.previewKpis}>
              <div className={styles.previewKpi}>
                <span>{t('login.preview.income')}</span>
                <strong>€184.240</strong>
                <small data-tone="positive">↗ 12,4%</small>
              </div>
              <div className={styles.previewKpi}>
                <span>{t('login.preview.expenses')}</span>
                <strong>€96.580</strong>
                <small>↘ 3,1%</small>
              </div>
              <div className={styles.previewKpi}>
                <span>{t('login.preview.margin')}</span>
                <strong>47,6%</strong>
                <small data-tone="positive">↗ 6,8%</small>
              </div>
            </div>

            <div className={styles.previewMainGrid}>
              <div className={styles.previewChartCard}>
                <div className={styles.previewCardHeader}>
                  <strong>{t('login.preview.cashflow')}</strong>
                  <span>{t('login.preview.lastMonths')}</span>
                </div>
                <svg viewBox="0 0 520 190" className={styles.previewChart}>
                  <path
                    d="M0 150 C55 136 76 94 130 106 C188 118 202 62 260 78 C315 93 347 38 398 54 C446 69 471 28 520 34"
                    className={styles.chartArea}
                  />
                  <path
                    d="M0 150 C55 136 76 94 130 106 C188 118 202 62 260 78 C315 93 347 38 398 54 C446 69 471 28 520 34"
                    className={styles.chartLine}
                  />
                  <path
                    d="M0 166 C62 151 96 138 138 145 C188 154 220 116 270 124 C327 133 356 98 408 109 C452 118 483 91 520 96"
                    className={styles.chartLineSecondary}
                  />
                </svg>
                <div className={styles.previewLegend}>
                  <span><i data-tone="brand" />{t('login.preview.income')}</span>
                  <span><i />{t('login.preview.expenses')}</span>
                </div>
              </div>

              <div className={styles.previewProjects}>
                <div className={styles.previewCardHeader}>
                  <strong>{t('login.preview.projects')}</strong>
                  <span>{t('login.preview.active')}</span>
                </div>
                <div className={styles.projectRow}>
                  <span data-color="brand" />
                  <div><strong>Atlas</strong><small>68%</small></div>
                </div>
                <div className={styles.projectRow}>
                  <span data-color="green" />
                  <div><strong>Nexo</strong><small>44%</small></div>
                </div>
                <div className={styles.projectRow}>
                  <span data-color="amber" />
                  <div><strong>Orion</strong><small>27%</small></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
