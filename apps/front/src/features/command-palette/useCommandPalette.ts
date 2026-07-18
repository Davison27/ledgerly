import { useCallback, useEffect, useState } from 'react';

/**
 * Manages the open/close state of the global command palette and registers
 * the Cmd+K (mac) / Ctrl+K (win/linux) global hotkey to toggle it.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCommandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isCommandK) return;

      event.preventDefault();
      setOpen((prev) => !prev);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { open, close, toggle };
}
