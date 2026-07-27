import { NotificationProps } from './notification';

export type NotificationDraft = Omit<NotificationProps, 'id' | 'createdAt' | 'readAt' | 'emailSentAt'>;
