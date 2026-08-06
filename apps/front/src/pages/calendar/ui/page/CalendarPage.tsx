import { useCallback, useMemo, useState } from 'react';
import { App, Button, Flex, Segmented, Skeleton, Alert, Typography } from 'antd';
import { CalendarOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { SPACE } from '@/shared/config/theme';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { resolveProjectColor } from '@/shared/lib/palette';
import { ApiError } from '@/shared/api/httpClient';
import type { SchedulableProjectDto, ScheduleEventDto } from '@/entities/schedule-event';
import { useTaxComplianceCalendar, type TaxDeadlineDto } from '@/entities/tax-compliance';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { useCalendarBoard, type CalendarView } from '../../model/useCalendarBoard';
import { buildConflictIndex, staffAssignmentConflicts } from '../../model/conflictIndex';
import { deriveProjectRanges, DerivedRangeTooLongError } from '../../model/derivedRanges';
import {
  buildDerivedLaneItems,
  buildEventLaneItems,
  buildTaxDeadlineLaneItems,
} from '../../model/lanes';
import { resizeEventDays } from '../../model/resizeDays';
import { CalendarDndContext } from '../dnd/CalendarDndContext';
import { SchedulablePanel } from '../schedulable/SchedulablePanel';
import { StaffPanel } from '../staff/StaffPanel';
import { MonthGrid } from '../monthGrid/MonthGrid';
import { WeekGrid } from '../weekGrid/WeekGrid';
import { ConflictSummary } from '../conflicts/ConflictSummary';
import { EventEditorModal } from '../eventEditor/EventEditorModal';
import { TaxDeadlineModal } from '../taxDeadline/TaxDeadlineModal';
import styles from './CalendarPage.module.css';

const { Text } = Typography;

export function CalendarPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const { canAccess } = useWorkspaceAccess();
  const canEdit = canAccess('calendar', 'edit');

  const {
    view,
    setView,
    cursor,
    range,
    board,
    loading,
    loadError,
    projects,
    staffMembers,
    products,
    goToday,
    goPrevious,
    goNext,
    createFromDrop,
    moveEvent,
    resizeEvent,
    saveEvent,
    removeEvent,
    materializeDerivedRange,
    assignStaffToEvent,
  } = useCalendarBoard();

  const taxCalendar = useTaxComplianceCalendar(range.from, range.to);

  const [selectedEvent, setSelectedEvent] = useState<ScheduleEventDto | null>(null);
  const [selectedTaxDeadline, setSelectedTaxDeadline] = useState<TaxDeadlineDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const conflictIndex = useMemo(
    () => buildConflictIndex(board?.conflicts ?? []),
    [board?.conflicts],
  );

  const eventsById = useMemo(
    () => new Map((board?.events ?? []).map((event) => [event.id, event])),
    [board?.events],
  );
  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const deadlinesById = useMemo(
    () => new Map(taxCalendar.deadlines.map((deadline) => [deadline.id, deadline])),
    [taxCalendar.deadlines],
  );
  const derivedRanges = useMemo(() => deriveProjectRanges(projects), [projects]);
  const laneItems = useMemo(
    () => [
      ...buildEventLaneItems(board?.events ?? []),
      ...buildTaxDeadlineLaneItems(taxCalendar.deadlines),
      ...buildDerivedLaneItems(derivedRanges),
    ],
    [board?.events, derivedRanges, taxCalendar.deadlines],
  );

  const colorForProject = useCallback(
    (projectId: string, color: string | null) => resolveProjectColor(color, projectId, isDark),
    [isDark],
  );

  const handleDropProject = (projectId: string, date: string) => {
    createFromDrop(projectId, date)
      .then(() => void message.success(t('calendar.event.created')))
      .catch(
        (error: unknown) =>
          void message.error(
            error instanceof ApiError && error.message
              ? error.message
              : t('calendar.event.createError'),
          ),
      );
  };

  const handleMaterialize = (
    project: SchedulableProjectDto,
    offsetInDays: number,
    openEditor: boolean,
  ) => {
    materializeDerivedRange(project, offsetInDays)
      .then((created) => {
        void message.success(t('calendar.derived.materialized'));
        if (openEditor) setSelectedEvent(created);
      })
      .catch((error: unknown) => {
        if (error instanceof DerivedRangeTooLongError) {
          void message.warning(t('calendar.derived.tooLong'));
          return;
        }
        void message.error(
          error instanceof ApiError && error.message
            ? error.message
            : t('calendar.derived.materializeError'),
        );
      });
  };

  const handleDropDerivedProject = (project: SchedulableProjectDto, offsetInDays: number) => {
    handleMaterialize(project, offsetInDays, false);
  };

  const handleSelectDerived = (project: SchedulableProjectDto) => {
    handleMaterialize(project, 0, true);
  };

  const handleMoveEvent = (event: ScheduleEventDto, offsetInDays: number) => {
    moveEvent(event, offsetInDays)
      .then(() => void message.success(t('calendar.event.moved')))
      .catch(
        (error: unknown) =>
          void message.error(
            error instanceof ApiError && error.message
              ? error.message
              : t('calendar.event.moveError'),
          ),
      );
  };

  const handleResizeEvent = (event: ScheduleEventDto, edge: 'start' | 'end', date: string) => {
    resizeEvent(event, resizeEventDays(event.days, edge, date))
      .then(() => void message.success(t('calendar.event.resized')))
      .catch(
        (error: unknown) =>
          void message.error(
            error instanceof ApiError && error.message
              ? error.message
              : t('calendar.event.resizeError'),
          ),
      );
  };

  const handleAssignStaff = (eventId: string, staffMemberId: string) => {
    const event = eventsById.get(eventId);
    if (!event) return;

    assignStaffToEvent(event, staffMemberId)
      .then((result) => {
        if (result.status === 'already-assigned') {
          void message.info(t('calendar.event.staffAlreadyAssigned'));
          return;
        }
        void message.success(t('calendar.event.staffAssigned'));
        const newConflicts = staffAssignmentConflicts(result.board, eventId, staffMemberId);
        newConflicts.forEach(
          (conflict) => void message.warning(t(`calendar.conflicts.kind.${conflict.kind}`)),
        );
      })
      .catch(
        (error: unknown) =>
          void message.error(
            error instanceof ApiError && error.message
              ? error.message
              : t('calendar.event.staffAssignError'),
          ),
      );
  };

  const handleSave = async (eventId: string, payload: Parameters<typeof saveEvent>[1]) => {
    setSaving(true);
    try {
      await saveEvent(eventId, payload);
      void message.success(t('calendar.event.saved'));
      setSelectedEvent(null);
    } catch (error) {
      void message.error(
        error instanceof ApiError && error.message ? error.message : t('calendar.event.saveError'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    setDeleting(true);
    try {
      await removeEvent(eventId);
      void message.success(t('calendar.event.deleted'));
      setSelectedEvent(null);
    } catch (error) {
      void message.error(
        error instanceof ApiError && error.message
          ? error.message
          : t('calendar.event.deleteError'),
      );
    } finally {
      setDeleting(false);
    }
  };

  const cursorLabel = view === 'month' ? cursor.slice(0, 7) : cursor;

  const viewOptions = [
    { label: t('calendar.views.month'), value: 'month' as CalendarView },
    { label: t('calendar.views.week'), value: 'week' as CalendarView },
  ];

  return (
    <Flex vertical className={styles.page}>
      <Flex align="center" gap={SPACE.lg} className={styles.header}>
        <Flex align="center" gap={10}>
          <CalendarOutlined className={styles.titleIcon} />
          <Text strong className={styles.titleText}>
            {t('calendar.title')}
          </Text>
        </Flex>

        <Segmented<CalendarView> value={view} onChange={setView} options={viewOptions} />

        <Flex align="center" gap={4}>
          <Button
            type="text"
            icon={<LeftOutlined />}
            aria-label={t('calendar.previous')}
            onClick={goPrevious}
          />
          <Button onClick={goToday}>{t('calendar.today')}</Button>
          <Button
            type="text"
            icon={<RightOutlined />}
            aria-label={t('calendar.next')}
            onClick={goNext}
          />
          <Text type="secondary" className={styles.cursorLabel}>
            {cursorLabel}
          </Text>
        </Flex>

        <div className={styles.conflictWrapper}>
          <ConflictSummary summary={board?.summary ?? null} />
        </div>
      </Flex>

      <div className={styles.body}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 8 }} className={styles.loadingSkeleton} />
        ) : loadError ? (
          <Alert
            type="error"
            showIcon
            message={t('calendar.loadError')}
            className={styles.loadError}
          />
        ) : (
          <>
            {taxCalendar.loadError && (
              <Alert
                type="warning"
                showIcon
                message={t('calendar.tax.loadError')}
                className={styles.taxLoadError}
              />
            )}
            <CalendarDndContext
              disabled={!canEdit}
              colorForProject={colorForProject}
              onDropProject={handleDropProject}
              onDropDerivedProject={handleDropDerivedProject}
              onMoveEvent={handleMoveEvent}
              onResizeEvent={handleResizeEvent}
              onAssignStaff={handleAssignStaff}
            >
              <Flex className={styles.boardRow}>
                <Flex vertical className={styles.sidePanel}>
                  <div className={styles.schedulablePanelSlot}>
                    <SchedulablePanel projects={projects} colorForProject={colorForProject} />
                  </div>
                  <div className={styles.staffPanelSlot}>
                    <StaffPanel staffMembers={staffMembers} />
                  </div>
                </Flex>

                <div className={styles.gridSlot}>
                  {view === 'month' ? (
                    <MonthGrid
                      cursor={cursor}
                      items={laneItems}
                      eventsById={eventsById}
                      deadlinesById={deadlinesById}
                      projectsById={projectsById}
                      conflictIndex={conflictIndex}
                      colorForProject={colorForProject}
                      onSelectEvent={canEdit ? setSelectedEvent : () => undefined}
                      onSelectTaxDeadline={setSelectedTaxDeadline}
                      onSelectDerived={canEdit ? handleSelectDerived : () => undefined}
                    />
                  ) : (
                    <WeekGrid
                      cursor={cursor}
                      items={laneItems}
                      eventsById={eventsById}
                      deadlinesById={deadlinesById}
                      projectsById={projectsById}
                      conflictIndex={conflictIndex}
                      colorForProject={colorForProject}
                      onSelectEvent={canEdit ? setSelectedEvent : () => undefined}
                      onSelectTaxDeadline={setSelectedTaxDeadline}
                      onSelectDerived={canEdit ? handleSelectDerived : () => undefined}
                    />
                  )}
                </div>
              </Flex>
            </CalendarDndContext>
          </>
        )}
      </div>

      <EventEditorModal
        open={selectedEvent !== null}
        event={selectedEvent}
        staffMembers={staffMembers}
        products={products}
        onCancel={() => setSelectedEvent(null)}
        onSave={handleSave}
        onDelete={handleDelete}
        submitting={saving}
        deleting={deleting}
      />

      <TaxDeadlineModal
        open={selectedTaxDeadline !== null}
        deadline={selectedTaxDeadline}
        onClose={() => setSelectedTaxDeadline(null)}
      />
    </Flex>
  );
}
