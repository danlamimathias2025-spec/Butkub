import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NavScrollContextType {
  isNavVisible: boolean;
}

const NavScrollContext = createContext<NavScrollContextType>({ isNavVisible: true });

export const NavScrollProvider = ({ children }: { children: ReactNode }) => {
  const [isNavVisible, setIsNavVisible] = useState(true);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      // Hide navigation header & bottom bar when user starts scrolling
      setIsNavVisible(false);

      if (timer) {
        clearTimeout(timer);
      }

      // Show navigation header & bottom bar 300ms after user stops scrolling
      timer = setTimeout(() => {
        setIsNavVisible(true);
      }, 300);
    };

    // Add scroll event listener in capture mode to catch all scrolling containers
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  return (
    <NavScrollContext.Provider value={{ isNavVisible }}>
      {children}
    </NavScrollContext.Provider>
  );
};

export const useNavScroll = () => useContext(NavScrollContext);
