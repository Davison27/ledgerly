import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, Empty, Flex, Input, Typography, theme } from 'antd';
import { ProjectOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { SchedulableProjectDto } from '@/entities/schedule-event';
import type { ProjectDragData } from '../model/dragData';

const { Text } = Typography;

interface SchedulableProjectItemProps {
  project: SchedulableProjectDto;
  color: string;
}

function SchedulableProjectItem({ project, color }: SchedulableProjectItemProps) {
  const { token } = theme.useToken();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `schedulable-project-${project.id}`,
    data: { kind: 'project', projectId: project.id, projectName: project.name } satisfies ProjectDragData,
  });

  return (
    <Flex
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      align="center"
      gap={8}
      style={{
        padding: '6px 8px',
        borderRadius: token.borderRadius,
        border: `1px solid ${token.colorBorderSecondary}`,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        transform: CSS.Translate.toString(transform),
      }}
    >
      {project.image ? (
        <Avatar shape="square" size={22} src={project.image} />
      ) : (
        <Avatar shape="square" size={22} style={{ backgroundColor: color }} icon={<ProjectOutlined />} />
      )}
      <Flex vertical gap={0} style={{ minWidth: 0 }}>
        <Text ellipsis style={{ fontSize: 13 }}>
          {project.name}
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {project.code}
        </Text>
      </Flex>
    </Flex>
  );
}

export interface SchedulablePanelProps {
  projects: SchedulableProjectDto[];
  colorForProject: (projectId: string) => string;
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
              color={colorForProject(project.id)}
            />
          ))
        )}
      </Flex>
    </Flex>
  );
}
