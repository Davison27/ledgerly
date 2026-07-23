import { useCallback, useMemo, useState } from 'react';
import { App, Button, Flex, Segmented, Spin, Alert, Typography, theme } from 'antd';
import { CalendarOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { LAYOUT, SPACE } from '@/shared/config/theme';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { resolveProjectColor } from '@/shared/lib/palette';
import { ApiError } from '@/shared/api/httpClient';
import type { SchedulableProjectDto, ScheduleEventDto } from '@/entities/schedule-event';
import { useCalendarBoard, type CalendarView } from '../model/useCalendarBoard';
import { buildConflictIndex, staffAssignmentConflicts } from '../model/conflictIndex';
import { deriveProjectRanges, DerivedRangeTooLongError } from '../model/derivedRanges';
import { buildDerivedLaneItems, buildEventLaneItems } from '../model/lanes';
import { resizeEventDays } from '../model/resizeDays';
import { CalendarDndContext } from './CalendarDndContext';
import { SchedulablePanel } from './SchedulablePanel';
import { StaffPanel } from './StaffPanel';
import { MonthGrid } from './MonthGrid';
import { WeekGrid } from './WeekGrid';
import { ConflictSummary } from './ConflictSummary';
import { EventEditorModal } from './EventEditorModal';

const { Text } = Typography;
const { useToken } = theme;

export function CalendarPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { token } = useToken();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const {
    view,
    setView,
    cursor,
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

  const [selectedEvent, setSelectedEvent] = useState<ScheduleEventDto | null>(null);
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
  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const derivedRanges = useMemo(() => deriveProjectRanges(projects), [projects]);
  const laneItems = useMemo(
    () => [...buildEventLaneItems(board?.events ?? []), ...buildDerivedLaneItems(derivedRanges)],
    [board?.events, derivedRanges],
  );

  const colorForProject = useCallback(
    (projectId: string, color: string | null) => resolveProjectColor(color, projectId, isDark),
    [isDark],
  );

  const handleDropProject = (projectId: string, date: string) => {
    createFromDrop(projectId, date)
      .then(() => void message.success(t('calendar.event.created')))
      .catch((error: unknown) =>
        void message.error(
          error instanceof ApiError && error.message ? error.message : t('calendar.event.createError'),
        ),
      );
  };

  const handleMaterialize = (project: SchedulableProjectDto, offsetInDays: number, openEditor: boolean) => {
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
          error instanceof ApiError && error.message ? error.message : t('calendar.derived.materializeError'),
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
      .catch((error: unknown) =>
        void message.error(
          error instanceof ApiError && error.message ? error.message : t('calendar.event.moveError'),
        ),
      );
  };

  const handleResizeEvent = (event: ScheduleEventDto, edge: 'start' | 'end', date: string) => {
    resizeEvent(event, resizeEventDays(event.days, edge, date))
      .then(() => void message.success(t('calendar.event.resized')))
      .catch((error: unknown) =>
        void message.error(
          error instanceof ApiError && error.message ? error.message : t('calendar.event.resizeError'),
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
        newConflicts.forEach((conflict) => void message.warning(t(`calendar.conflicts.kind.${conflict.kind}`)));
      })
      .catch((error: unknown) =>
        void message.error(
          error instanceof ApiError && error.message ? error.message : t('calendar.event.staffAssignError'),
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
        error instanceof ApiError && error.message ? error.message : t('calendar.event.deleteError'),
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
    <Flex vertical style={{ flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACE.lg,
          flex: 'none',
          height: LAYOUT.sectionHeaderHeight,
          padding: `0 ${LAYOUT.pagePaddingInline}px`,
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Flex align="center" gap={10}>
          <CalendarOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
          <Text strong style={{ fontSize: 16 }}>
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
          <Text type="secondary" style={{ marginInlineStart: 8 }}>
            {cursorLabel}
          </Text>
        </Flex>

        <div style={{ marginInlineStart: 'auto' }}>
          <ConflictSummary summary={board?.summary ?? null} />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {loading ? (
          <Flex justify="center" style={{ padding: '48px 0' }}>
            <Spin />
          </Flex>
        ) : loadError ? (
          <Alert
            type="error"
            showIcon
            message={t('calendar.loadError')}
            style={{ margin: SPACE.lg }}
          />
        ) : (
          <CalendarDndContext
            onDropProject={handleDropProject}
            onDropDerivedProject={handleDropDerivedProject}
            onMoveEvent={handleMoveEvent}
            onResizeEvent={handleResizeEvent}
            onAssignStaff={handleAssignStaff}
          >
            <Flex style={{ height: '100%', minHeight: 0 }}>
              <Flex
                vertical
                style={{
                  flex: 'none',
                  width: 280,
                  height: '100%',
                  borderInlineEnd: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    padding: SPACE.lg,
                    overflow: 'auto',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  }}
                >
                  <SchedulablePanel projects={projects} colorForProject={colorForProject} />
                </div>
                <div style={{ flex: 1, minHeight: 0, padding: SPACE.lg, overflow: 'auto' }}>
                  <StaffPanel staffMembers={staffMembers} />
                </div>
              </Flex>

              <div style={{ flex: 1, minHeight: 0, padding: SPACE.lg }}>
                {view === 'month' ? (
                  <MonthGrid
                    cursor={cursor}
                    items={laneItems}
                    eventsById={eventsById}
                    projectsById={projectsById}
                    conflictIndex={conflictIndex}
                    colorForProject={colorForProject}
                    onSelectEvent={setSelectedEvent}
                    onSelectDerived={handleSelectDerived}
                  />
                ) : (
                  <WeekGrid
                    cursor={cursor}
                    items={laneItems}
                    eventsById={eventsById}
                    projectsById={projectsById}
                    conflictIndex={conflictIndex}
                    colorForProject={colorForProject}
                    onSelectEvent={setSelectedEvent}
                    onSelectDerived={handleSelectDerived}
                  />
                )}
              </div>
            </Flex>
          </CalendarDndContext>
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
    </Flex>
  );
}
