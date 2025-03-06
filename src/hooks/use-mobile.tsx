import * as React from "react";

const MOBILE_BREAKPOINT_DEFAULT = 768;

export function useIsMobile(mobileBreakpoint?: number) {
  const MOBILE_BREAKPOINT = mobileBreakpoint ?? MOBILE_BREAKPOINT_DEFAULT;
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, [MOBILE_BREAKPOINT]);

  return !!isMobile;
}
