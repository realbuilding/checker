import { useCallback, useRef } from 'react';

interface SyncScrollOptions {
  enabled?: boolean;
}

export const useSyncScroll = (options: SyncScrollOptions = {}) => {
  const { enabled = true } = options;
  const isScrollingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const createScrollHandler = useCallback((
    targetCallback?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void
  ) => {
    return (scrollTop: number, scrollHeight: number, clientHeight: number) => {
      if (!enabled || isScrollingRef.current) return;

      isScrollingRef.current = true;
      
      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 调用目标滚动回调
      if (targetCallback) {
        const scrollRatio = scrollHeight > clientHeight 
          ? scrollTop / (scrollHeight - clientHeight)
          : 0;
          
        targetCallback(scrollTop, scrollHeight, clientHeight);
      }

      // 重置滚动标志
      timeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 100);
    };
  }, [enabled]);

  const syncScrollToRatio = useCallback((
    element: HTMLElement | null, 
    scrollRatio: number
  ) => {
    if (!element || !enabled) return;

    const maxScroll = element.scrollHeight - element.clientHeight;
    const targetScroll = maxScroll * scrollRatio;
    
    element.scrollTo({
      top: Math.max(0, Math.min(targetScroll, maxScroll)),
      behavior: 'smooth'
    });
  }, [enabled]);

  const syncScrollToPosition = useCallback((
    element: HTMLElement | null,
    scrollTop: number
  ) => {
    if (!element || !enabled) return;

    element.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    });
  }, [enabled]);

  return {
    createScrollHandler,
    syncScrollToRatio,
    syncScrollToPosition,
    isScrolling: isScrollingRef.current
  };
};


