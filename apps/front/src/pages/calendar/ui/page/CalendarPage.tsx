import { useCallback, useMemo, useState } from 'react';
import { App, Button, Flex, Segmented, Skeleton, Alert, Typography } from 'antd';
import { CalendarOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { SPACE } from '@/shared/config/theme';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { resolveProjectColor } from '@/shared/lib/palette';
import { ApiError } from '@/shared/api/httpClient';
import type {
  ScheduleBoardDto,
  ScheduleConflictKind,
  SchedulableProjectDto,
  ScheduleEventDto,
} from '@/entities/schedule-event';
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

const CONFLICT_KINDS: ScheduleConflictKind[] = [
  'staff_not_hired',
  'outside_project_dates',
  'staff_overlap',
  'project_not_active',
  'equipment_overallocated',
  'equipment_stock_unset',
];

function visibleBoardForAccess(
  board: ScheduleBoardDto | null,
  canViewStaff: boolean,
  canViewEquipment: boolean,
): ScheduleBoardDto | null {
  if (!board) return null;

  const conflicts = board.conflicts.filter(
    ({ kind }) =>
      (canViewStaff || !['staff_not_hired', 'staff_overlap'].includes(kind)) &&
      (canViewEquipment || !['equipment_overallocated', 'equipment_stock_unset'].includes(kind)),
  );
  const byKind = Object.fromEntries(CONFLICT_KINDS.map((kind) => [kind, 0])) as Record<
    ScheduleConflictKind,
    number
  >;
  let errorCount = 0;
  let infoCount = 0;
  for (const conflict of conflicts) {
    byKind[conflict.kind] += 1;
    if (conflict.severity === 'error') errorCount += 1;
    else infoCount += 1;
  }

  return {
    events: board.events.map((event) => ({
      ...event,
      staff: canViewStaff ? event.staff : [],
      equipment: canViewEquipment ? event.equipment : [],
    })),
    conflicts,
    summary: { errorCount, infoCount, byKind },
  };
}

export function CalendarPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const { canAccess } = useWorkspaceAccess();
  const canViewCalendar = canAccess('calendar', 'view');
  const canEditCalendar = canAccess('calendar', 'edit');
  const canViewProjects = canAccess('projects', 'view');
  const canEditProjects = canAccess('projects', 'edit');
  const canViewStaff = canAccess('staff', 'view');
  const canEditStaff = canAccess('staff', 'edit');
  const canViewEquipment = canAccess('equipment', 'view');
  const canEditEquipment = canAccess('equipment', 'edit');
  const canEditSchedule = canEditCalendar && canEditProjects;
  const canAssignStaff = canEditSchedule && canEditStaff;
  const canAssignEquipment = canEditSchedule && canEditEquipment;
  const canViewSchedule = canViewCalendar && canViewProjects;

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
    equipment,
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
  } = useCalendarBoard({
    canViewCalendar,
    canViewProjects,
    canViewStaff: canViewSchedule && canViewStaff,
    canViewEquipment: canViewSchedule && canViewEquipment,
  });

  const taxCalendar = useTaxComplianceCalendar(range.from, range.to, canViewSchedule);

  const [selectedEvent, setSelectedEvent] = useState<ScheduleEventDto | null>(null);
  const [selectedTaxDeadline, setSelectedTaxDeadline] = useState<TaxDeadlineDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const visibleBoard = useMemo(
    () => visibleBoardForAccess(canViewSchedule ? board : null, canViewStaff, canViewEquipment),
    [board, canViewEquipment, canViewSchedule, canViewStaff],
  );

  const conflictIndex = useMemo(
    () => buildConflictIndex(visibleBoard?.conflicts ?? []),
    [visibleBoard?.conflicts],
  );

  const eventsById = useMemo(
    () => new Map((canViewSchedule ? board?.events ?? [] : []).map((event) => [event.id, event])),
    [board?.events, canViewSchedule],
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
      ...buildEventLaneItems(visibleBoard?.events ?? []),
      ...buildTaxDeadlineLaneItems(taxCalendar.deadlines),
      ...buildDerivedLaneItems(derivedRanges),
    ],
    [derivedRanges, taxCalendar.deadlines, visibleBoard?.events],
  );

  const colorForProject = useCallback(
    (projectId: string, color: string | null) => resolveProjectColor(color, projectId, isDark),
    [isDark],
  );

  const handleDropProject = (projectId: string, date: string) => {
    if (!canEditSchedule) return;
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
    if (!canEditSchedule) return;
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
    if (!canEditSchedule) return;
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
    if (!canEditSchedule) return;
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
    if (!canAssignStaff) return;
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

  const handleSelectEvent = (event: ScheduleEventDto) => {
    setSelectedEvent(eventsById.get(event.id) ?? event);
  };

  const handleSave = async (eventId: string, payload: Parameters<typeof saveEvent>[1]) => {
    if (!canEditSchedule) return;
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
    if (!canEditSchedule) return;
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
        <Flex align="center" gap={SPACE.md}>
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

        {canViewSchedule && (
          <div className={styles.conflictWrapper}>
            <ConflictSummary summary={visibleBoard?.summary ?? null} />
          </div>
        )}
      </Flex>

      <div className={styles.body}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 8 }} className={styles.loadingSkeleton} />
        ) : loadError ? (
          <Alert
            type="error"
            showIcon
            title={t('calendar.loadError')}
            className={styles.loadError}
          />
        ) : (
          <>
            {taxCalendar.loadError && (
              <Alert
                type="warning"
                showIcon
                title={t('calendar.tax.loadError')}
                className={styles.taxLoadError}
              />
            )}
            <CalendarDndContext
              disabled={!canEditSchedule}
              colorForProject={colorForProject}
              onDropProject={handleDropProject}
              onDropDerivedProject={handleDropDerivedProject}
              onMoveEvent={handleMoveEvent}
              onResizeEvent={handleResizeEvent}
              onAssignStaff={handleAssignStaff}
            >
              <Flex className={styles.boardRow}>
                <Flex vertical className={styles.sidePanel}>
                  {canViewSchedule && (
                    <div className={styles.schedulablePanelSlot}>
                      <SchedulablePanel projects={projects} colorForProject={colorForProject} />
                    </div>
                  )}
                  {canViewSchedule && canViewStaff && (
                    <div className={styles.staffPanelSlot}>
                      <StaffPanel staffMembers={staffMembers} canAssign={canAssignStaff} />
                    </div>
                  )}
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
                      onSelectEvent={handleSelectEvent}
                      onSelectTaxDeadline={setSelectedTaxDeadline}
                      onSelectDerived={canEditSchedule ? handleSelectDerived : () => undefined}
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
                      onSelectEvent={handleSelectEvent}
                      onSelectTaxDeadline={setSelectedTaxDeadline}
                      onSelectDerived={canEditSchedule ? handleSelectDerived : () => undefined}
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
        equipment={equipment}
        canEdit={canEditSchedule}
        canViewStaff={canViewSchedule && canViewStaff}
        canEditStaff={canAssignStaff}
        canViewEquipment={canViewSchedule && canViewEquipment}
        canEditEquipment={canAssignEquipment}
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
