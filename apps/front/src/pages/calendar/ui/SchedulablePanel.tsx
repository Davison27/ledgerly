import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Empty, Flex, Input, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { SchedulableProjectDto } from '@/entities/schedule-event';
import type { ProjectDragData } from '../model/dragData';
import { SchedulableProjectCard } from './SchedulableProjectCard';

const { Text } = Typography;

interface SchedulableProjectItemProps {
  project: SchedulableProjectDto;
  color: string;
}

function SchedulableProjectItem({ project, color }: SchedulableProjectItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `schedulable-project-${project.id}`,
    data: { kind: 'project', project } satisfies ProjectDragData,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ cursor: 'grab', opacity: isDragging ? 0.5 : 1 }}
    >
      <SchedulableProjectCard project={project} color={color} />
    </div>
  );
}

export interface SchedulablePanelProps {
  projects: SchedulableProjectDto[];
  colorForProject: (projectId: string, color: string | null) => string;
}

export function SchedulablePanel({ projects, colorForProject }: SchedulablePanelProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = projects.filter(
    (project) =>
      !search.trim() ||
      project.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      project.code.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Flex vertical gap={8} style={{ height: '100%', minHeight: 0 }}>
      <Text strong style={{ fontSize: 13 }}>
        {t('calendar.panel.title')}
      </Text>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder={t('calendar.panel.search')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Flex vertical gap={6} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('calendar.panel.empty')} />
        ) : (
          filtered.map((project) => (
            <SchedulableProjectItem
              key={project.id}
              project={project}
              color={colorForProject(project.id, project.color)}
            />
          ))
        )}
      </Flex>
    </Flex>
  );
}
