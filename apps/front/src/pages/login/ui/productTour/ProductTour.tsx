import type { FocusEvent } from 'react';
import {
  CalendarOutlined,
  DashboardOutlined,
  FileTextOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  ProjectOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  PRODUCT_TOUR_SLIDES,
  type ProductTourSlide,
  useProductTour,
} from '../../model/useProductTour';
import styles from './ProductTour.module.css';

interface ProductTourProps {
  workspaceName: string;
  logo?: string | null;
}

const slideIcons = {
  dashboard: DashboardOutlined,
  projects: ProjectOutlined,
  documents: FileTextOutlined,
  calendar: CalendarOutlined,
} satisfies Record<ProductTourSlide, typeof DashboardOutlined>;

export function ProductTour({ workspaceName, logo }: ProductTourProps) {
  const { t } = useTranslation();
  const {
    activeSlide,
    activeSlideIndex,
    isUserPaused,
    prefersReducedMotion,
    selectSlide,
    setInteractionPaused,
    togglePause,
  } = useProductTour();
  const ActiveIcon = slideIcons[activeSlide];
  const initial = workspaceName.charAt(0).toUpperCase();
  const slideTitle = t(`login.tour.slides.${activeSlide}.title`);
  const slideDescription = t(`login.tour.slides.${activeSlide}.description`);

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setInteractionPaused(false);
    }
  };

  return (
    <section
      className={styles.tour}
      aria-label={t('login.tour.label')}
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={handleBlur}
    >
      <div
        key={`introduction-${activeSlide}`}
        className={`${styles.introduction} ${styles.slideTransition}`}
      >
        <span className={styles.eyebrow}>
          <ActiveIcon aria-hidden="true" />
          {t(`login.tour.slides.${activeSlide}.eyebrow`)}
        </span>
        <h2 className={styles.title}>{slideTitle}</h2>
        <p className={styles.description}>{slideDescription}</p>
      </div>

      <div
        key={`preview-${activeSlide}`}
        className={`${styles.window} ${styles.slideTransition}`}
        aria-hidden="true"
      >
        <div className={styles.windowBar}>
          <div className={styles.windowControls}>
            <span />
            <span />
            <span />
          </div>
          <div className={styles.windowStatus}>
            <span className={styles.statusDot} />
            {t('login.tour.connected')}
          </div>
        </div>

        <div className={styles.applicationShell}>
          <aside className={styles.sidebar}>
            <div className={styles.workspaceIdentity}>
              {logo ? (
                <img src={logo} alt="" className={styles.logo} />
              ) : (
                <span className={styles.monogram}>{initial}</span>
              )}
              <span className={styles.workspaceName}>{workspaceName}</span>
            </div>

            <nav className={styles.navigation}>
              {PRODUCT_TOUR_SLIDES.map((slide) => {
                const Icon = slideIcons[slide];

                return (
                  <span key={slide} data-active={activeSlide === slide || undefined}>
                    <Icon />
                    {t(`login.tour.navigation.${slide}`)}
                  </span>
                );
              })}
              <span>
                <TeamOutlined />
                {t('login.tour.navigation.staff')}
              </span>
            </nav>

            <div className={styles.user}>
              <span className={styles.avatar}>{t('login.tour.user.initials')}</span>
              <span>
                <strong>{t('login.tour.user.name')}</strong>
                <small>{t('login.tour.user.role')}</small>
              </span>
            </div>
          </aside>

          <div className={styles.screen}>
            <div className={styles.screenHeader}>
              <div>
                <span>{t(`login.tour.slides.${activeSlide}.screenLabel`)}</span>
                <strong>{t(`login.tour.slides.${activeSlide}.screenTitle`)}</strong>
              </div>
              <span className={styles.screenAction}>
                {t(`login.tour.slides.${activeSlide}.action`)}
              </span>
            </div>

            {activeSlide === 'dashboard' && renderDashboardScreen(t)}
            {activeSlide === 'projects' && renderProjectsScreen(t)}
            {activeSlide === 'documents' && renderDocumentsScreen(t)}
            {activeSlide === 'calendar' && renderCalendarScreen(t)}
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div
          className={styles.slideSelector}
          role="group"
          aria-label={t('login.tour.slideSelector')}
        >
          {PRODUCT_TOUR_SLIDES.map((slide, index) => (
            <button
              key={slide}
              type="button"
              aria-pressed={activeSlide === slide}
              aria-label={t('login.tour.selectSlide', {
                position: index + 1,
                title: t(`login.tour.slides.${slide}.title`),
              })}
              className={styles.slideButton}
              data-active={activeSlide === slide || undefined}
              onClick={() => selectSlide(slide)}
            />
          ))}
        </div>

        <button
          type="button"
          className={styles.pauseButton}
          aria-label={
            prefersReducedMotion
              ? t('login.tour.reducedMotion')
              : isUserPaused
                ? t('login.tour.resume')
                : t('login.tour.pause')
          }
          aria-pressed={isUserPaused}
          disabled={prefersReducedMotion}
          onClick={togglePause}
        >
          {isUserPaused ? <PlayCircleOutlined /> : <PauseOutlined />}
        </button>
      </div>

      <span className={styles.slideStatus} aria-live="off">
        {t('login.tour.slideStatus', {
          position: activeSlideIndex + 1,
          total: PRODUCT_TOUR_SLIDES.length,
        })}
      </span>
    </section>
  );
}

function renderDashboardScreen(t: ReturnType<typeof useTranslation>['t']) {
  return (
    <div className={styles.dashboardScreen}>
      <div className={styles.metrics}>
        {['income', 'expenses', 'margin'].map((metric) => (
          <div key={metric} className={styles.metric}>
            <span>{t(`login.tour.dashboard.metrics.${metric}.label`)}</span>
            <strong>{t(`login.tour.dashboard.metrics.${metric}.value`)}</strong>
            <small data-positive={metric !== 'expenses' || undefined}>
              {t(`login.tour.dashboard.metrics.${metric}.trend`)}
            </small>
          </div>
        ))}
      </div>
      <div className={styles.dashboardGrid}>
        <section className={styles.chartPanel}>
          <div className={styles.panelHeader}>
            <strong>{t('login.tour.dashboard.chart.title')}</strong>
            <span>{t('login.tour.dashboard.chart.period')}</span>
          </div>
          <svg viewBox="0 0 440 120" className={styles.chart}>
            <path
              d="M0 96 C48 88 64 49 112 64 C158 79 183 32 226 49 C274 68 298 24 338 36 C376 48 401 15 440 22"
              className={styles.chartArea}
            />
            <path
              d="M0 96 C48 88 64 49 112 64 C158 79 183 32 226 49 C274 68 298 24 338 36 C376 48 401 15 440 22"
              className={styles.chartLine}
            />
            <path
              d="M0 108 C48 96 79 80 119 87 C162 94 190 69 230 75 C278 82 304 63 346 69 C389 76 410 54 440 56"
              className={styles.chartLineSecondary}
            />
          </svg>
        </section>
        <section className={styles.projectPanel}>
          <div className={styles.panelHeader}>
            <strong>{t('login.tour.dashboard.projects.title')}</strong>
            <span>{t('login.tour.dashboard.projects.meta')}</span>
          </div>
          {['atlas', 'orion', 'nexo'].map((project) => (
            <div key={project} className={styles.projectRow}>
              <i data-project={project} />
              <strong>{t(`login.tour.dashboard.projects.${project}`)}</strong>
              <span>{t(`login.tour.dashboard.projects.${project}Progress`)}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function renderProjectsScreen(t: ReturnType<typeof useTranslation>['t']) {
  return (
    <div className={styles.projectsScreen}>
      <div className={styles.projectGrid}>
        {['atlas', 'orion', 'nexo'].map((project) => (
          <article key={project} className={styles.projectCard}>
            <div className={styles.projectCardHeader}>
              <i data-project={project} />
              <span>{t(`login.tour.projects.${project}.status`)}</span>
            </div>
            <strong>{t(`login.tour.projects.${project}.name`)}</strong>
            <small>{t(`login.tour.projects.${project}.meta`)}</small>
            <div className={styles.progress}>
              <span data-project={project} />
            </div>
            <span className={styles.projectAmount}>
              {t(`login.tour.projects.${project}.amount`)}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}

function renderDocumentsScreen(t: ReturnType<typeof useTranslation>['t']) {
  return (
    <div className={styles.documentsScreen}>
      <div className={styles.documentToolbar}>
        <span>{t('login.tour.documents.search')}</span>
        <span>{t('login.tour.documents.filter')}</span>
      </div>
      <div className={styles.documentTable}>
        <div className={styles.tableHeader}>
          <span>{t('login.tour.documents.columns.document')}</span>
          <span>{t('login.tour.documents.columns.project')}</span>
          <span>{t('login.tour.documents.columns.status')}</span>
          <span>{t('login.tour.documents.columns.amount')}</span>
        </div>
        {['hosting', 'materials', 'invoice'].map((document) => (
          <div key={document} className={styles.tableRow}>
            <span>
              <FileTextOutlined />
              {t(`login.tour.documents.rows.${document}.name`)}
            </span>
            <span>{t(`login.tour.documents.rows.${document}.project`)}</span>
            <span data-status={document === 'materials' ? 'pending' : 'paid'}>
              {t(`login.tour.documents.rows.${document}.status`)}
            </span>
            <strong>{t(`login.tour.documents.rows.${document}.amount`)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderCalendarScreen(t: ReturnType<typeof useTranslation>['t']) {
  return (
    <div className={styles.calendarScreen}>
      <div className={styles.calendarDays}>
        {['mon', 'tue', 'wed', 'thu', 'fri'].map((day) => (
          <span key={day}>{t(`login.tour.calendar.days.${day}`)}</span>
        ))}
      </div>
      <div className={styles.calendarGrid}>
        {[10, 11, 12, 13, 14, 17, 18, 19, 20, 21].map((day) => (
          <span key={day} data-today={day === 12 || undefined}>
            {day}
          </span>
        ))}
        <span className={styles.calendarEvent} data-tone="brand">
          {t('login.tour.calendar.events.review')}
        </span>
        <span className={styles.calendarEvent} data-tone="green">
          {t('login.tour.calendar.events.delivery')}
        </span>
        <span className={styles.calendarEvent} data-tone="amber">
          {t('login.tour.calendar.events.tax')}
        </span>
      </div>
      <div className={styles.calendarSummary}>
        <CalendarOutlined />
        <span>{t('login.tour.calendar.summary')}</span>
      </div>
    </div>
  );
}
