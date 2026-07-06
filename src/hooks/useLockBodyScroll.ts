import { useEffect } from 'react';

export function useLockBodyScroll(isLocked: boolean = true) {
  useEffect(() => {
    if (!isLocked) return;

    // Get original body overflow
    const originalBodyStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    // Also lock dashboard scroll area if it exists
    let originalScrollAreaStyle = '';
    const scrollArea = document.getElementById('dashboard-scroll-area');
    if (scrollArea) {
      originalScrollAreaStyle = window.getComputedStyle(scrollArea).overflow;
      scrollArea.style.overflow = 'hidden';
    }
    
    // Re-enable scrolling when component unmounts
    return () => {
      document.body.style.overflow = originalBodyStyle;
      if (scrollArea) {
        scrollArea.style.overflow = originalScrollAreaStyle;
      }
    };
  }, [isLocked]);
}
