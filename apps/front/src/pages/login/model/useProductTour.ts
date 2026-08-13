import { useCallback, useEffect, useState } from 'react';

export const PRODUCT_TOUR_SLIDES = ['dashboard', 'projects', 'documents', 'calendar'] as const;

export type ProductTourSlide = (typeof PRODUCT_TOUR_SLIDES)[number];

const AUTO_ADVANCE_DELAY = 7_000;

function useReducedMotionPreference() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

export interface UseProductTourResult {
  activeSlide: ProductTourSlide;
  activeSlideIndex: number;
  isPaused: boolean;
  isUserPaused: boolean;
  prefersReducedMotion: boolean;
  selectSlide: (slide: ProductTourSlide) => void;
  setInteractionPaused: (paused: boolean) => void;
  togglePause: () => void;
}

export function useProductTour(): UseProductTourResult {
  const prefersReducedMotion = useReducedMotionPreference();
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);
  const isPaused = prefersReducedMotion || isUserPaused || isInteractionPaused;

  useEffect(() => {
    if (isPaused) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveSlideIndex((currentIndex) => (currentIndex + 1) % PRODUCT_TOUR_SLIDES.length);
    }, AUTO_ADVANCE_DELAY);

    return () => window.clearInterval(intervalId);
  }, [isPaused]);

  const selectSlide = useCallback((slide: ProductTourSlide) => {
    setActiveSlideIndex(PRODUCT_TOUR_SLIDES.indexOf(slide));
  }, []);

  const setInteractionPaused = useCallback((paused: boolean) => {
    setIsInteractionPaused(paused);
  }, []);

  const togglePause = useCallback(() => {
    setIsUserPaused((paused) => !paused);
  }, []);

  return {
    activeSlide: PRODUCT_TOUR_SLIDES[activeSlideIndex],
    activeSlideIndex,
    isPaused,
    isUserPaused,
    prefersReducedMotion,
    selectSlide,
    setInteractionPaused,
    togglePause,
  };
}
