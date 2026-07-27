import { Avatar } from 'antd';
import { seedColor } from '@/shared/lib/palette';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { initials } from '../lib/initials';
import styles from './StaffAvatar.module.css';

export interface StaffAvatarProps {
  staffMember: { id: string; firstName: string; lastName: string };
  size?: number;
}

export function StaffAvatar({ staffMember, size = 28 }: StaffAvatarProps) {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  return (
    <Avatar
      size={size}
      className={styles.avatar}
      style={{
        backgroundColor: seedColor(staffMember.id, isDark),
        fontSize: Math.round(size * 0.4),
      }}
    >
      {initials(staffMember.firstName, staffMember.lastName)}
    </Avatar>
  );
}
