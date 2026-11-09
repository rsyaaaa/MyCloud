import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint = 768) {
  const checkIsMobile = () => {
    if (typeof window === 'undefined') return false;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      navigator.userAgent || navigator.vendor || window.opera
    );
    return isMobileUA || window.innerWidth < breakpoint;
  };

  const [isMobile, setIsMobile] = useState(checkIsMobile);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [breakpoint]);

  return isMobile;
}

