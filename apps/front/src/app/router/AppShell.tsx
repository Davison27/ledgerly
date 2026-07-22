import { AppLayout } from '@/widgets/app-layout';
import { CommandPaletteLauncher } from '@/widgets/command-palette';

export function AppShell() {
  return <AppLayout commandPalette={<CommandPaletteLauncher />} />;
}
