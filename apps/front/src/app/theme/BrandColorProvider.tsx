import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { BRAND_DEFAULT } from './tokens';

const STORAGE_KEY = 'ledgerly:brandColor';

interface BrandColorContextValue {
  brandColor: string;
  setBrandColor: (c: string | undefined) => void;
}

const BrandColorContext = createContext<BrandColorContextValue | null>(null);

function readStoredBrandColor(): string {
  if (typeof window === 'undefined') return BRAND_DEFAULT;
  return window.localStorage.getItem(STORAGE_KEY) ?? BRAND_DEFAULT;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBrandColor(): BrandColorContextValue {
  const ctx = useContext(BrandColorContext);
  if (!ctx) {
    throw new Error('useBrandColor debe usarse dentro de BrandColorProvider');
  }
  return ctx;
}

/**
 * Sits above `ConfigProvider` (see D3 of the ui-visual-improvements plan):
 * `CompanyProvider` lives below it, so the brand color that feeds
 * `buildThemeConfig` is seeded from `localStorage` for the first paint and
 * then pushed here once `/company` resolves or is saved from Settings.
 */
export function BrandColorProvider({ children }: { children: ReactNode }) {
  const [brandColor, setBrandColorState] = useState<string>(readStoredBrandColor);

  const setBrandColor = useCallback((next: string | undefined) => {
    if (next) {
      setBrandColorState(next);
      window.localStorage.setItem(STORAGE_KEY, next);
    } else {
      setBrandColorState(BRAND_DEFAULT);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo<BrandColorContextValue>(
    () => ({ brandColor, setBrandColor }),
    [brandColor, setBrandColor],
  );

  return <BrandColorContext.Provider value={value}>{children}</BrandColorContext.Provider>;
}
