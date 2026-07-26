import { useEffect } from 'react';
import { useCompany } from '@/entities/company';
import { useBrandColor } from '@/shared/lib/brand-color/BrandColorProvider';

export function useSyncBrandColor(): void {
  const { company, isLoading } = useCompany();
  const { setBrandColor } = useBrandColor();

  useEffect(() => {
    if (!isLoading) {
      setBrandColor(company.brandColor);
    }
  }, [company.brandColor, isLoading, setBrandColor]);
}
