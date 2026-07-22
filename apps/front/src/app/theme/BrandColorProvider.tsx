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
