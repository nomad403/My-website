'use client';
import { useEffect } from 'react';
import { useBackground } from '@/app/contexts/BackgroundContext';

type Mode = 'day' | 'night';

export default function DynamicFavicon() {
  const { mode } = useBackground() as { mode: Mode };

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Sélection typée
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

    // Crée si absent
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
    }

    // Choix des fichiers (ATTENTION: favicon-black.ico = icône blanche, favicon-white.ico = icône noire)
    // Mode day = icône noire = favicon-white.ico, Mode night = icône blanche = favicon-black.ico
    const expectedFile = mode === 'day' ? '/favicon-white.ico' : '/favicon-black.ico';
    const newHref = `${expectedFile}?v=${Date.now()}`;

    // Évite les changements inutiles
    if (link.href !== newHref) {
      link.href = newHref;                 // <-- OK car HTMLLinkElement
      document.head.appendChild(link);
      console.log('DynamicFavicon: set', link.href);
    }

    // (Optionnel) Synchroniser l'apple-touch-icon
    const apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (apple) {
      const png = expectedFile.replace('.ico', '.png');
      apple.href = `${png}?v=${Date.now()}`;
      console.log('DynamicFavicon: Updated apple-touch-icon to', apple.href);
    }

    // Exposer une fonction de test globale pour debug
    if (typeof window !== 'undefined') {
      (window as any).testFavicon = () => {
        console.log('Testing favicon change...');
        const testLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (testLink) {
          testLink.href = newHref;
          document.head.appendChild(testLink);
          console.log('Favicon changed to:', testLink.href);
        }
      };
    }
  }, [mode]);

  return null;
}
