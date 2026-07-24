import { AppLayout } from '@/widgets/app-layout';
import { CommandPaletteSearch } from '@/widgets/command-palette';

export function AppShell() {
  return <AppLayout search={<CommandPaletteSearch />} />;
}
