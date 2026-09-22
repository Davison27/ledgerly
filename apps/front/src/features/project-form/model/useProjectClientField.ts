import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientQueries, createClient, type ClientDto } from '@/entities/client';
import { projectQueries } from '@/entities/project';

export interface ProjectClientCreateValues {
  name: string;
  taxId: string;
}

export interface ProjectClientFieldState {
  clients: ClientDto[];
  clientsPending: boolean;
  createOpen: boolean;
  createValues: ProjectClientCreateValues;
  creating: boolean;
  setCreateValues: (values: ProjectClientCreateValues) => void;
  openCreate: () => void;
  closeCreate: () => void;
  refreshActiveClients: () => Promise<void>;
  create: () => Promise<ClientDto>;
}

export function useProjectClientField(): ProjectClientFieldState {
  const queryClient = useQueryClient();
  const { data: clientsData = [], isPending: clientsPending } = useQuery(clientQueries.list());
  const [createOpen, setCreateOpen] = useState(false);
  const [createValues, setCreateValues] = useState<ProjectClientCreateValues>({ name: '', taxId: '' });
  const [creating, setCreating] = useState(false);

  const clients = useMemo(
    () => clientsData.filter((client) => !client.archivedAt),
    [clientsData],
  );

  const openCreate = () => {
    setCreateValues({ name: '', taxId: '' });
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateValues({ name: '', taxId: '' });
  };

  const refreshActiveClients = async () => {
    await queryClient.invalidateQueries({ queryKey: clientQueries.all });
  };

  const create = async (): Promise<ClientDto> => {
    setCreating(true);
    try {
      const client = await createClient({
        name: createValues.name.trim(),
        taxId: createValues.taxId.trim() || undefined,
      });
      await Promise.all([
        refreshActiveClients(),
        queryClient.invalidateQueries({ queryKey: projectQueries.all }),
      ]);
      closeCreate();
      return client;
    } finally {
      setCreating(false);
    }
  };

  return {
    clients,
    clientsPending,
    createOpen,
    createValues,
    creating,
    setCreateValues,
    openCreate,
    closeCreate,
    refreshActiveClients,
    create,
  };
}
