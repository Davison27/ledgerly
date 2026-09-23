import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companyQueries } from '@/entities/company';
import { useBrandColor } from '@/shared/lib/brand-color/BrandColorProvider';

export function useSyncBrandColor(): void {
  const { data: company, isPending } = useQuery(companyQueries.branding());
  const { setBrandColor } = useBrandColor();

  useEffect(() => {
    if (!isPending && company) {
      setBrandColor(company.brandColor ?? undefined);
    }
  }, [company, isPending, setBrandColor]);
}
