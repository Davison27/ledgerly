export interface ListNotificationsQuery {
  page: number;
  size: number;
  status: 'unread' | 'open' | 'resolved' | 'all';
}
