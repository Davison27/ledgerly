import { FileTextOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ProductTourSlide } from '../../model/useProductTour';
import styles from './ProductTour.module.css';

interface ProductTourScreenProps {
  slide: ProductTourSlide;
  workspaceName: string;
  logo?: string | null;
}

const TABLE_SLIDES = ['documents', 'suppliers', 'staff'] as const;

export function ProductTourScreen({ slide, workspaceName, logo }: ProductTourScreenProps) {
  return (
    <div className={styles.screen}>
      <ScreenHeader slide={slide} />
      {slide === 'dashboard' && <DashboardScreen />}
      {slide === 'projects' && <ProjectsScreen />}
      {slide === 'calendar' && <CalendarScreen />}
      {TABLE_SLIDES.includes(slide as (typeof TABLE_SLIDES)[number]) && (
        <TableScreen slide={slide as (typeof TABLE_SLIDES)[number]} />
      )}
      {slide === 'equipment' && <EquipmentScreen />}
      {slide === 'workspace' && <WorkspaceScreen workspaceName={workspaceName} logo={logo} />}
    </div>
  );
}

function ScreenHeader({ slide }: { slide: ProductTourSlide }) {
  const { t } = useTranslation();

  return (
    <div className={styles.screenHeader}>
      <div>
        <strong>{t(`login.tour.screens.${slide}.heading`)}</strong>
        <span>{t(`login.tour.screens.${slide}.subheading`)}</span>
      </div>
      <span className={styles.screenAction}>{t(`login.tour.screens.${slide}.action`)}</span>
    </div>
  );
}

function DashboardScreen() {
  const { t } = useTranslation();
  const metrics = ['income', 'expenses', 'profit', 'margin'] as const;

  return (
    <div>
      <div className={styles.kpiGrid}>
        {metrics.map((metric) => (
          <section key={metric} className={styles.kpiCard}>
            <span>{t(`login.tour.dashboard.metrics.${metric}.label`)}</span>
            <strong>{t(`login.tour.dashboard.metrics.${metric}.value`)}</strong>
            <small data-tone={metric}>{t(`login.tour.dashboard.metrics.${metric}.trend`)}</small>
          </section>
        ))}
      </div>
      <div className={styles.dashboardPrimaryGrid}>
        <section className={styles.previewCard}>
          <MiniCardHeader
            title={t('login.tour.dashboard.chart.title')}
            meta={t('login.tour.dashboard.chart.period')}
          />
          <svg viewBox="0 0 430 110" className={styles.lineChart}>
            <path
              d="M0 90 C38 84 63 59 100 67 C139 75 163 40 208 52 C251 64 273 24 315 35 C358 46 385 15 430 23"
              className={styles.chartArea}
            />
            <path
              d="M0 90 C38 84 63 59 100 67 C139 75 163 40 208 52 C251 64 273 24 315 35 C358 46 385 15 430 23"
              className={styles.chartLine}
            />
            <path
              d="M0 100 C43 92 75 77 113 81 C153 86 184 66 219 72 C259 79 287 58 325 65 C365 72 396 49 430 54"
              className={styles.chartLineSecondary}
            />
          </svg>
        </section>
        <section className={styles.previewCard}>
          <MiniCardHeader
            title={t('login.tour.dashboard.status.title')}
            meta={t('login.tour.dashboard.status.meta')}
          />
          <div className={styles.statusSummary}>
            <span className={styles.donut} />
            <div>
              <strong>{t('login.tour.dashboard.status.value')}</strong>
              <small>{t('login.tour.dashboard.status.caption')}</small>
            </div>
          </div>
        </section>
      </div>
      <div className={styles.dashboardLowerGrid}>
        <section className={styles.previewCard}>
          <MiniCardHeader
            title={t('login.tour.dashboard.projects.title')}
            meta={t('login.tour.dashboard.projects.meta')}
          />
          {['atlas', 'orion', 'nexo'].map((item) => (
            <div key={item} className={styles.compactRow}>
              <i data-tone={item} />
              <span>{t(`login.tour.dashboard.projects.${item}`)}</span>
              <strong>{t(`login.tour.dashboard.projects.${item}Progress`)}</strong>
            </div>
          ))}
        </section>
        <section className={styles.previewCard}>
          <MiniCardHeader
            title={t('login.tour.dashboard.schedule.title')}
            meta={t('login.tour.dashboard.schedule.meta')}
          />
          {['review', 'delivery'].map((item) => (
            <div key={item} className={styles.scheduleRow}>
              <span>{t(`login.tour.dashboard.schedule.${item}Date`)}</span>
              <strong>{t(`login.tour.dashboard.schedule.${item}`)}</strong>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function ProjectsScreen() {
  const { t } = useTranslation();

  return (
    <div>
      <div className={styles.miniProjectGrid}>
        {['atlas', 'orion', 'nexo'].map((project) => (
          <article key={project} className={styles.miniProjectCard}>
            <div className={styles.miniProjectIdentity}>
              <i data-tone={project} />
              <span>{t(`login.tour.projects.${project}.code`)}</span>
              <b>•••</b>
            </div>
            <strong>{t(`login.tour.projects.${project}.name`)}</strong>
            <small>{t('login.tour.projects.profit')}</small>
            <em>{t(`login.tour.projects.${project}.profit`)}</em>
            <div className={styles.miniFinancials}>
              <span>
                {t('login.tour.projects.income')}
                <b>{t(`login.tour.projects.${project}.income`)}</b>
              </span>
              <span>
                {t('login.tour.projects.expenses')}
                <b>{t(`login.tour.projects.${project}.expenses`)}</b>
              </span>
            </div>
            <footer>
              {t(`login.tour.projects.${project}.documents`)}{' '}
              <b>{t(`login.tour.projects.${project}.margin`)}</b>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}

function CalendarScreen() {
  const { t } = useTranslation();
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

  return (
    <div className={styles.calendarScreen}>
      <aside className={styles.resourceRail}>
        <strong>{t('login.tour.calendar.resources')}</strong>
        <span className={styles.miniInput}>
          <SearchOutlined />
          {t('login.tour.calendar.search')}
        </span>
        {['atlas', 'orion', 'nexo'].map((item) => (
          <span key={item} className={styles.resourceItem}>
            <i data-tone={item} />
            {t(`login.tour.dashboard.projects.${item}`)}
          </span>
        ))}
      </aside>
      <section className={styles.calendarBoard}>
        <div className={styles.calendarToolbar}>
          <span>{t('login.tour.calendar.month')}</span>
          <span>{t('login.tour.calendar.view')}</span>
        </div>
        <div className={styles.calendarDays}>
          {days.map((day) => (
            <span key={day}>{t(`login.tour.calendar.days.${day}`)}</span>
          ))}
        </div>
        <div className={styles.calendarGrid}>
          {Array.from({ length: 35 }).map((_, index) => (
            <span key={index}>{index + 1}</span>
          ))}
        </div>
        <span className={styles.calendarEvent} data-tone="atlas">
          {t('login.tour.calendar.events.review')}
        </span>
        <span className={styles.calendarEvent} data-tone="orion">
          {t('login.tour.calendar.events.delivery')}
        </span>
        <span className={styles.calendarEvent} data-tone="nexo">
          {t('login.tour.calendar.events.tax')}
        </span>
      </section>
    </div>
  );
}

function TableScreen({ slide }: { slide: (typeof TABLE_SLIDES)[number] }) {
  const { t } = useTranslation();
  const columns = ['first', 'second', 'third', 'fourth'] as const;
  const rows = ['first', 'second', 'third'] as const;

  return (
    <div>
      <div className={styles.tableToolbar}>
        <span className={styles.miniInput}>
          <SearchOutlined />
          {t(`login.tour.tables.${slide}.search`)}
        </span>
        <span className={styles.filterChip}>{t(`login.tour.tables.${slide}.filter`)}</span>
      </div>
      <section className={styles.tableSurface}>
        <div className={styles.tableHeader}>
          {columns.map((column) => (
            <span key={column}>{t(`login.tour.tables.${slide}.columns.${column}`)}</span>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row} className={styles.tableRow}>
            {columns.map((column) => (
              <span key={column} data-column={column}>
                {t(`login.tour.tables.${slide}.rows.${row}.${column}`)}
              </span>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}

function EquipmentScreen() {
  const { t } = useTranslation();

  return (
    <div>
      <div className={styles.miniEquipmentGrid}>
        {['studio', 'camera', 'consulting'].map((equipment) => (
          <article key={equipment} className={styles.miniEquipmentCard}>
            <div className={styles.miniEquipmentVisual}>
              <FileTextOutlined />
              <span>•••</span>
            </div>
            <div>
              <span className={styles.equipmentCategory}>
                {t(`login.tour.equipment.${equipment}.category`)}
              </span>
              <strong>{t(`login.tour.equipment.${equipment}.name`)}</strong>
              <small>{t(`login.tour.equipment.${equipment}.reference`)}</small>
              <footer>
                <span>{t(`login.tour.equipment.${equipment}.price`)}</span>
                <b>{t(`login.tour.equipment.${equipment}.stock`)}</b>
              </footer>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function WorkspaceScreen({
  workspaceName,
  logo,
}: Pick<ProductTourScreenProps, 'workspaceName' | 'logo'>) {
  const { t } = useTranslation();

  return (
    <div>
      <div className={styles.settingsTabs}>
        {['company', 'members', 'integrations', 'tax'].map((tab, index) => (
          <span key={tab} data-active={index === 0 || undefined}>
            {t(`login.tour.workspace.tabs.${tab}`)}
          </span>
        ))}
      </div>
      <div className={styles.workspaceCards}>
        <section className={styles.workspaceCard}>
          <MiniCardHeader title={t('login.tour.workspace.identity.title')} />
          <div className={styles.companyPreview}>
            {logo ? (
              <img src={logo} alt="" />
            ) : (
              <span>{workspaceName.charAt(0).toUpperCase()}</span>
            )}
            <div>
              <strong>{workspaceName}</strong>
              <small>{t('login.tour.workspace.identity.sector')}</small>
            </div>
            <i />
          </div>
          <div className={styles.formLines}>
            <span />
            <span />
            <span />
          </div>
        </section>
        <section className={styles.workspaceCard}>
          <MiniCardHeader title={t('login.tour.workspace.contact.title')} />
          <div className={styles.formLines}>
            <span />
            <span />
            <span />
          </div>
        </section>
      </div>
    </div>
  );
}

function MiniCardHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className={styles.miniCardHeader}>
      <strong>{title}</strong>
      {meta ? <span>{meta}</span> : null}
    </div>
  );
}
