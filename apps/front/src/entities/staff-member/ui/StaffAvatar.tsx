import { Avatar } from 'antd';
import { seedColor } from '@/shared/lib/palette';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { initials } from '../lib/initials';

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
      style={{
        backgroundColor: seedColor(staffMember.id, isDark),
        color: '#fff',
        fontSize: Math.round(size * 0.4),
        fontWeight: 600,
      }}
    >
      {initials(staffMember.firstName, staffMember.lastName)}
    </Avatar>
  );
}
