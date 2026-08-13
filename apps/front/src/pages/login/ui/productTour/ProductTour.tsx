import type { FocusEvent } from 'react';
import {
  CalendarOutlined,
  DashboardOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  IdcardOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  ProjectOutlined,
  SearchOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  PRODUCT_TOUR_SLIDES,
  type ProductTourSlide,
  useProductTour,
} from '../../model/useProductTour';
import { ProductTourScreen } from './ProductTourScreens';
import styles from './ProductTour.module.css';

interface ProductTourProps {
  workspaceName: string;
  logo?: string | null;
}

type TourNavigationItem = ProductTourSlide | 'invoices';

const navigationIcons = {
  dashboard: DashboardOutlined,
  projects: ProjectOutlined,
  calendar: CalendarOutlined,
  documents: FileTextOutlined,
  suppliers: TeamOutlined,
  invoices: FileDoneOutlined,
  products: ShoppingOutlined,
  staff: IdcardOutlined,
  workspace: SettingOutlined,
} satisfies Record<TourNavigationItem, typeof DashboardOutlined>;

const navigationItems: TourNavigationItem[] = [
  'dashboard',
  'projects',
  'calendar',
  'documents',
  'suppliers',
  'invoices',
  'products',
  'staff',
];

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
  const ActiveIcon = navigationIcons[activeSlide];

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
        <h2 className={styles.title}>{t(`login.tour.slides.${activeSlide}.title`)}</h2>
        <p className={styles.description}>{t(`login.tour.slides.${activeSlide}.description`)}</p>
      </div>

      <div
        key={`preview-${activeSlide}`}
        className={`${styles.application} ${styles.slideTransition}`}
        aria-hidden="true"
      >
        <aside className={styles.sidebar}>
          <div className={styles.ledgerlyMark}>L</div>
          <nav className={styles.navigation}>
            {navigationItems.map((item) => {
              const Icon = navigationIcons[item];
              return (
                <span key={item} data-active={activeSlide === item || undefined}>
                  <Icon />
                  {t(`login.tour.navigation.${item}`)}
                </span>
              );
            })}
          </nav>
          <div
            className={styles.workspaceIdentity}
            data-active={activeSlide === 'workspace' || undefined}
          >
            {logo ? (
              <img src={logo} alt="" className={styles.logo} />
            ) : (
              <span className={styles.monogram}>{workspaceName.charAt(0).toUpperCase()}</span>
            )}
            <span>
              <strong>{workspaceName}</strong>
              <small>{t('login.tour.sampleWorkspace')}</small>
            </span>
          </div>
        </aside>

        <div className={styles.applicationMain}>
          <div className={styles.applicationTopbar}>
            <div className={styles.searchBox}>
              <SearchOutlined />
              <span>{t('login.tour.search')}</span>
            </div>
            <span className={styles.topbarAvatar}>{t('login.tour.user.initials')}</span>
          </div>
          <ProductTourScreen slide={activeSlide} workspaceName={workspaceName} logo={logo} />
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
          {isUserPaused || prefersReducedMotion ? <PlayCircleOutlined /> : <PauseOutlined />}
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
