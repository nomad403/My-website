'use client';
import { useEffect } from 'react';
import { useBackground } from '@/app/contexts/BackgroundContext';

type Mode = 'day' | 'night';

export default function DynamicFavicon() {
  const { mode } = useBackground() as { mode: Mode };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Log du mode pour debug (les favicons sont gérés par les media queries CSS)
    console.log('DynamicFavicon: Mode changed to', mode);
    
    // Vérifier que les media queries fonctionnent
    const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    console.log('DynamicFavicon: System prefers', isDark ? 'dark' : 'light', 'mode');
    console.log('DynamicFavicon: App mode is', mode);

    // Exposer une fonction de test globale pour debug
    if (typeof window !== 'undefined') {
      (window as any).testFavicon = () => {
        console.log('Testing favicon setup...');
        const staticFavicon = document.querySelector<HTMLLinkElement>('link[rel="icon"][href="/favicon.ico"]');
        const lightFavicon = document.querySelector<HTMLLinkElement>('link[rel="icon"][media="(prefers-color-scheme: light)"]');
        const darkFavicon = document.querySelector<HTMLLinkElement>('link[rel="icon"][media="(prefers-color-scheme: dark)"]');
        
        console.log('Static favicon:', staticFavicon?.href);
        console.log('Light favicon:', lightFavicon?.href);
        console.log('Dark favicon:', darkFavicon?.href);
        console.log('System prefers dark:', isDark);
      };
    }
  }, [mode]);

  return null;
}
