'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDrops } from '@/lib/api';

export function useDrops() {
  return useQuery({
    queryKey: ['drops'],
    queryFn: fetchDrops,
    staleTime: 30_000,
  });
}
