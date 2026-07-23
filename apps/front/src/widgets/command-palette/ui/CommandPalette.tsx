import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Empty, Input, List, Modal, Typography, theme } from 'antd';
import {
  CalendarOutlined,
  DashboardOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  IdcardOutlined,
  ProjectOutlined,
  SearchOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { SPACE } from '@/shared/config/theme';
import { listAllDocuments, type DocumentListItemDto } from '@/entities/document';
import { listProjects, type ProjectSummaryDto } from '@/entities/project';
import { listSuppliers, type SupplierDto } from '@/entities/supplier';

const { useToken } = theme;
const { Text } = Typography;

const SEARCH_DEBOUNCE_MS = 250;
const MAX_RESULTS_PER_GROUP = 6;

type PaletteCategory = 'nav' | 'projects' | 'suppliers' | 'documents';

interface PaletteItem {
  key: string;
  category: PaletteCategory;
  icon: ReactNode;
  label: string;
  description?: string;
  onSelect: () => void;
}

interface PaletteGroup {
  id: PaletteCategory;
  title: string;
  items: PaletteItem[];
}

function matches(text: string | null | undefined, query: string): boolean {
  return (text ?? '').toLowerCase().includes(query.toLowerCase());
}

function formatAmount(amount: number, currency: string): string {
  return amount.toLocaleString('es-ES', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  });
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { token } = useToken();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [documents, setDocuments] = useState<DocumentListItemDto[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    setQuery('');
    setDebouncedQuery('');
    setDocuments([]);
    setActiveIndex(0);

    listProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
    listSuppliers()
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }, [open]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!open || !debouncedQuery) {
      setDocuments([]);
      return;
    }

    let cancelled = false;
    listAllDocuments({ search: debouncedQuery })
      .then((result) => {
        if (!cancelled) setDocuments(result);
      })
      .catch(() => {
        if (!cancelled) setDocuments([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, debouncedQuery]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery]);

  const handleSelect = (item: PaletteItem) => {
    item.onSelect();
    onClose();
  };

  const groups = useMemo<PaletteGroup[]>(() => {
    const navItemsRaw: Array<Omit<PaletteItem, 'category'> & { category: 'nav' }> = [
      {
        key: 'nav-dashboard',
        category: 'nav',
        icon: <DashboardOutlined />,
        label: t('nav.dashboard'),
        onSelect: () => void navigate({ to: '/dashboard' }),
      },
      {
        key: 'nav-projects',
        category: 'nav',
        icon: <ProjectOutlined />,
        label: t('nav.projects'),
        onSelect: () => void navigate({ to: '/projects' }),
      },
      {
        key: 'nav-calendar',
        category: 'nav',
        icon: <CalendarOutlined />,
        label: t('nav.calendar'),
        onSelect: () => void navigate({ to: '/calendar' }),
      },
      {
        key: 'nav-documents',
        category: 'nav',
        icon: <FileTextOutlined />,
        label: t('nav.documents'),
        onSelect: () => void navigate({ to: '/documents' }),
      },
      {
        key: 'nav-suppliers',
        category: 'nav',
        icon: <TeamOutlined />,
        label: t('nav.suppliers'),
        onSelect: () => void navigate({ to: '/suppliers' }),
      },
      {
        key: 'nav-invoices',
        category: 'nav',
        icon: <FileDoneOutlined />,
        label: t('nav.invoices'),
        onSelect: () => void navigate({ to: '/invoices' }),
      },
      {
        key: 'nav-products',
        category: 'nav',
        icon: <ShoppingOutlined />,
        label: t('nav.products'),
        onSelect: () => void navigate({ to: '/products' }),
      },
      {
        key: 'nav-staff',
        category: 'nav',
        icon: <IdcardOutlined />,
        label: t('nav.staff'),
        onSelect: () => void navigate({ to: '/staff' }),
      },
    ];
    const navItems: PaletteItem[] = navItemsRaw.filter(
      (item) => !debouncedQuery || matches(item.label, debouncedQuery),
    );

    const projectItems: PaletteItem[] = debouncedQuery
      ? projects
          .filter((project) => matches(project.name, debouncedQuery) || matches(project.code, debouncedQuery))
          .slice(0, MAX_RESULTS_PER_GROUP)
          .map((project) => ({
            key: `project-${project.id}`,
            category: 'projects',
            icon: <ProjectOutlined />,
            label: project.name,
            description: project.code,
            onSelect: () =>
              void navigate({ to: '/projects/$projectId', params: { projectId: project.id } }),
          }))
      : [];

    const supplierItems: PaletteItem[] = debouncedQuery
      ? suppliers
          .filter((supplier) => matches(supplier.name, debouncedQuery) || matches(supplier.taxId, debouncedQuery))
          .slice(0, MAX_RESULTS_PER_GROUP)
          .map((supplier) => ({
            key: `supplier-${supplier.id}`,
            category: 'suppliers',
            icon: <TeamOutlined />,
            label: supplier.name,
            description: supplier.taxId ?? undefined,
            onSelect: () => void navigate({ to: '/suppliers' }),
          }))
      : [];

    const documentItems: PaletteItem[] = documents.slice(0, MAX_RESULTS_PER_GROUP).map((doc) => ({
      key: `document-${doc.id}`,
      category: 'documents',
      icon: <FileTextOutlined />,
      label: doc.name,
      description: t('commandPalette.documentMeta', {
        project: doc.projectName,
        amount: formatAmount(doc.amount, doc.currency),
      }),
      onSelect: () => void navigate({ to: '/documents' }),
    }));

    const rawGroups: PaletteGroup[] = [
      { id: 'nav', title: t('commandPalette.groups.goTo'), items: navItems },
      { id: 'projects', title: t('commandPalette.groups.projects'), items: projectItems },
      { id: 'suppliers', title: t('commandPalette.groups.suppliers'), items: supplierItems },
      { id: 'documents', title: t('commandPalette.groups.documents'), items: documentItems },
    ];
    return rawGroups.filter((group) => group.items.length > 0);
  }, [t, navigate, debouncedQuery, projects, suppliers, documents]);

  const flatItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  useEffect(() => {
    const activeEl = containerRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(flatItems.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = flatItems[activeIndex];
      if (item) handleSelect(item);
    }
  };

  let flatIndex = -1;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={640}
      centered
      destroyOnHidden
      styles={{ body: { padding: 0 } }}
    >
      <div ref={containerRef} onKeyDown={handleKeyDown}>
        <div
          style={{
            padding: `${SPACE.md}px ${SPACE.lg}px`,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Input
            autoFocus
            variant="borderless"
            size="large"
            allowClear
            prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
            placeholder={t('commandPalette.placeholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div style={{ maxHeight: 420, overflowY: 'auto', padding: `${SPACE.sm}px 0` }}>
          {flatItems.length === 0 ? (
            <Empty
              description={t('commandPalette.empty')}
              style={{ padding: `${SPACE.xxl}px 0` }}
            />
          ) : (
            groups.map((group) => (
              <div key={group.id} style={{ marginBottom: 4 }}>
                <Text
                  type="secondary"
                  style={{
                    display: 'block',
                    padding: `${SPACE.xs}px ${SPACE.lg}px`,
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                  }}
                >
                  {group.title}
                </Text>
                <List
                  size="small"
                  split={false}
                  dataSource={group.items}
                  renderItem={(item) => {
                    flatIndex += 1;
                    const isActive = flatIndex === activeIndex;
                    return (
                      <List.Item
                        key={item.key}
                        data-index={flatIndex}
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        onClick={() => handleSelect(item)}
                        style={{
                          padding: '8px 16px',
                          margin: '0 4px',
                          borderRadius: token.borderRadius,
                          cursor: 'pointer',
                          background: isActive ? token.colorPrimaryBg : undefined,
                          border: 'none',
                        }}
                      >
                        <List.Item.Meta
                          avatar={<span style={{ fontSize: 16 }}>{item.icon}</span>}
                          title={item.label}
                          description={item.description}
                        />
                      </List.Item>
                    );
                  }}
                />
              </div>
            ))
          )}
        </div>

        <div
          style={{
            padding: '8px 16px',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('commandPalette.hint')}
          </Text>
        </div>
      </div>
    </Modal>
  );
}
