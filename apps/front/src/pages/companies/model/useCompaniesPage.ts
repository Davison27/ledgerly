import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  addClient,
  clientQueries,
  removeClient,
  restoreClient,
  updateClientModel,
  type ClientFormValues,
  type ClientDto,
  type ClientSummaryDto,
  type CreateClientPayload,
  type UpdateClientPayload,
} from '@/entities/client';
import { documentQueries } from '@/entities/document';
import { projectQueries } from '@/entities/project';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { ApiError } from '@/shared/api/httpClient';
import {
  clientDeletionMessageKey,
  clientMutationErrorMessageKey,
  visibleCompanyClients,
} from './companiesPage';

export interface UseCompaniesPageOptions {
  onOpenClient?: (client: ClientSummaryDto) => void;
}

export type CompaniesPageModel = ReturnType<typeof useCompaniesPage>;

export function useCompaniesPage({ onOpenClient }: UseCompaniesPageOptions = {}) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { canAccess } = useWorkspaceAccess();
  const { data: clients = [], isPending, isError } = useQuery(clientQueries.list());
  const [showArchived, setShowArchived] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);
  const canEdit = canAccess('projects', 'edit');
  const visibleClients = visibleCompanyClients(clients, showArchived);

  const invalidateClientDirectory = async (includeDocuments = false) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: clientQueries.all }),
      queryClient.invalidateQueries({ queryKey: projectQueries.all }),
      ...(includeDocuments
        ? [queryClient.invalidateQueries({ queryKey: documentQueries.all })]
        : []),
    ]);
  };

  const handleAdd = () => {
    setEditingClient(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingClient(null);
  };

  const handleEdit = async (client: ClientSummaryDto) => {
    try {
      setEditingClient(await queryClient.fetchQuery(clientQueries.detail(client.id)));
      setIsFormOpen(true);
    } catch {
      void message.error(t('companies.unavailable'));
    }
  };

  const handleSubmit = async (values: ClientFormValues | UpdateClientPayload) => {
    const operation = editingClient ? 'update' : 'create';
    setSubmitting(true);
    try {
      if (editingClient) {
        await updateClientModel(editingClient.id, values);
        void message.success(t('companies.form.updated'));
      } else {
        await addClient(values as CreateClientPayload);
        void message.success(t('companies.form.created'));
      }
      closeForm();
      await invalidateClientDirectory();
    } catch (error) {
      void message.error(t(clientMutationErrorMessageKey(error, operation)));
      if (error instanceof ApiError && error.status === 404) {
        await invalidateClientDirectory();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (client: ClientSummaryDto) => {
    setDeletingId(client.id);
    try {
      const outcome = await removeClient(client.id);
      void message.success(t(clientDeletionMessageKey(outcome)));
      await invalidateClientDirectory(outcome === 'archived');
    } catch {
      void message.error(t('companies.deleteConfirm.error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleUnarchive = async (client: ClientSummaryDto) => {
    setUnarchivingId(client.id);
    try {
      await restoreClient(client.id);
      void message.success(t('companies.unarchived'));
      await invalidateClientDirectory(true);
    } catch {
      void message.error(t('companies.unavailable'));
    } finally {
      setUnarchivingId(null);
    }
  };

  return {
    t,
    clients,
    visibleClients,
    isPending,
    isError,
    showArchived,
    setShowArchived,
    canEdit,
    isFormOpen,
    editingClient,
    submitting,
    deletingId,
    unarchivingId,
    handleAdd,
    handleEdit,
    handleSubmit,
    handleDelete,
    handleUnarchive,
    closeForm,
    onOpenClient,
  };
}
