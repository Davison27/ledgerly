import { useCallback, useMemo, useState } from 'react';
import { App, Button, Flex, Segmented, Spin, Alert, Typography, theme } from 'antd';
import { CalendarOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { LAYOUT, SPACE } from '@/shared/config/theme';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import type { ScheduleEventDto } from '@/entities/schedule-event';
import { useCalendarBoard, type CalendarView } from '../model/useCalendarBoard';
import { buildConflictIndex } from '../model/conflictIndex';
import { projectColor } from '../model/projectColor';
import { resizeEventDays } from '../model/resizeDays';
import { CalendarDndContext } from './CalendarDndContext';
import { SchedulablePanel } from './SchedulablePanel';
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
  } = useCalendarBoard();

  const [selectedEvent, setSelectedEvent] = useState<ScheduleEventDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const conflictIndex = useMemo(
    () => buildConflictIndex(board?.conflicts ?? []),
    [board?.conflicts],
  );

  const colorForProject = useCallback(
    (projectId: string) => projectColor(projectId, isDark),
    [isDark],
  );

  const handleDropProject = (projectId: string, date: string) => {
    createFromDrop(projectId, date)
      .then(() => void message.success(t('calendar.event.created')))
      .catch(() => void message.error(t('calendar.event.createError')));
  };

  const handleMoveEvent = (event: ScheduleEventDto, offsetInDays: number) => {
    moveEvent(event, offsetInDays)
      .then(() => void message.success(t('calendar.event.moved')))
      .catch(() => void message.error(t('calendar.event.moveError')));
  };

  const handleResizeEvent = (event: ScheduleEventDto, edge: 'start' | 'end', date: string) => {
    resizeEvent(event, resizeEventDays(event.days, edge, date))
      .then(() => void message.success(t('calendar.event.resized')))
      .catch(() => void message.error(t('calendar.event.resizeError')));
  };

  const handleSave = async (eventId: string, payload: Parameters<typeof saveEvent>[1]) => {
    setSaving(true);
    try {
      await saveEvent(eventId, payload);
      void message.success(t('calendar.event.saved'));
      setSelectedEvent(null);
    } catch {
      void message.error(t('calendar.event.saveError'));
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
    } catch {
      void message.error(t('calendar.event.deleteError'));
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
            onMoveEvent={handleMoveEvent}
            onResizeEvent={handleResizeEvent}
          >
            <Flex style={{ height: '100%', minHeight: 0 }}>
              <div
                style={{
                  flex: 'none',
                  width: 280,
                  height: '100%',
                  padding: SPACE.lg,
                  overflow: 'auto',
                  borderInlineEnd: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <SchedulablePanel projects={projects} colorForProject={colorForProject} />
              </div>

              <div style={{ flex: 1, minHeight: 0, padding: SPACE.lg }}>
                {view === 'month' ? (
                  <MonthGrid
                    cursor={cursor}
                    events={board?.events ?? []}
                    conflictIndex={conflictIndex}
                    colorForProject={colorForProject}
                    onSelectEvent={setSelectedEvent}
                  />
                ) : (
                  <WeekGrid
                    cursor={cursor}
                    events={board?.events ?? []}
                    conflictIndex={conflictIndex}
                    colorForProject={colorForProject}
                    onSelectEvent={setSelectedEvent}
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
