"use client"

import React, { useRef, useState, useEffect } from 'react';

interface ProjectItem {
  id: number;
  name: string;
  image: string;
  url?: string;
}

interface ProjectsCarouselProps {
  items: ProjectItem[];
}

const ProjectsCarousel: React.FC<ProjectsCarouselProps> = ({ items }) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(true);
  const itemWidthRef = useRef<number>(0);
  const isScrollingRef = useRef(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  
  // États séparés pour touch et mouse pour éviter les conflits
  const touchState = useRef({
    isActive: false,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    lastMoveTime: 0,
    hasMoved: false,
  });
  
  // Détection du type d'appareil
  const isTouchDevice = useRef(false);
  useEffect(() => {
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Gestion du drag (desktop uniquement)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignorer les mouse events sur mobile (ils sont émis après touch)
    if (isTouchDevice.current) return;
    
    dragStartPos.current = { x: e.pageX, y: e.pageY };
    setIsDragging(true);
    if (carouselRef.current) {
      setStartX(e.pageX - carouselRef.current.offsetLeft);
      setScrollLeft(carouselRef.current.scrollLeft);
    }
  };

  const handleMouseLeave = () => {
    if (isTouchDevice.current) return;
    setIsDragging(false);
    dragStartPos.current = null;
  };

  const handleMouseUp = () => {
    if (isTouchDevice.current) return;
    setIsDragging(false);
    dragStartPos.current = null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isTouchDevice.current || !isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  // Gestion du touch (mobile) - avec distinction tap/swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!carouselRef.current) return;
    
    const touch = e.touches[0];
    touchState.current = {
      isActive: true,
      startX: touch.pageX,
      startY: touch.pageY,
      startScrollLeft: carouselRef.current.scrollLeft,
      lastMoveTime: Date.now(),
      hasMoved: false,
    };
    
    // Permettre le scroll natif horizontal sur le conteneur
    if (carouselRef.current) {
      carouselRef.current.style.touchAction = 'pan-x';
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchState.current.isActive || !carouselRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.pageX - touchState.current.startX);
    const deltaY = Math.abs(touch.pageY - touchState.current.startY);
    
    // Si le mouvement horizontal est plus important que vertical, c'est un swipe horizontal
    if (deltaX > deltaY && deltaX > 10) {
      touchState.current.hasMoved = true;
      // Prévenir le scroll vertical de la page seulement si c'est un swipe horizontal
      e.preventDefault();
      
      const x = touch.pageX - carouselRef.current.offsetLeft;
      const walk = (x - touchState.current.startX) * 2;
      carouselRef.current.scrollLeft = touchState.current.startScrollLeft - walk;
    } else if (deltaY > deltaX && deltaY > 10) {
      // Si c'est un swipe vertical, réinitialiser et permettre le scroll vertical
      touchState.current.hasMoved = false;
      if (carouselRef.current) {
        carouselRef.current.style.touchAction = 'pan-y';
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchState.current.isActive) return;
    
    // Réinitialiser touchAction
    if (carouselRef.current) {
      carouselRef.current.style.touchAction = '';
    }
    
    // Si c'était un swipe, ne pas déclencher de clic
    if (touchState.current.hasMoved) {
      // Réinitialiser après un court délai pour éviter les clics accidentels
      setTimeout(() => {
        touchState.current = {
          isActive: false,
          startX: 0,
          startY: 0,
          startScrollLeft: 0,
          lastMoveTime: 0,
          hasMoved: false,
        };
      }, 100);
    } else {
      // C'était un tap, réinitialiser immédiatement
      touchState.current = {
        isActive: false,
        startX: 0,
        startY: 0,
        startScrollLeft: 0,
        lastMoveTime: 0,
        hasMoved: false,
      };
    }
  };

  // Calculer la largeur d'un item (avec gap)
  useEffect(() => {
    if (!containerRef.current || items.length === 0) return;
    const firstItem = containerRef.current.querySelector('.carousel-item') as HTMLElement;
    if (firstItem) {
      const style = window.getComputedStyle(firstItem);
      const width = firstItem.offsetWidth;
      const gap = 24; // gap-6 = 24px
      itemWidthRef.current = width + gap;
    }
  }, [items]);

  // Gestion du scroll avec la molette (convertit le scroll vertical en horizontal)
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Si le scroll est principalement vertical, convertir en horizontal
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        // Multiplier par 2.5 pour augmenter la sensibilité du scroll
        el.scrollBy({
          left: e.deltaY * 2.5,
          behavior: 'smooth',
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Gestion de la boucle infinie
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || items.length === 0) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;
      
      const itemWidth = itemWidthRef.current;
      if (!itemWidth || itemWidth === 0) return;
      
      const { scrollLeft } = carousel;
      const totalItemsWidth = items.length * itemWidth;
      
      // Zone de repositionnement : au début (après les clones de gauche)
      const leftThreshold = totalItemsWidth;
      // Zone de repositionnement : à la fin (avant les clones de droite)
      const rightThreshold = totalItemsWidth * 2;

      // Si on est trop à gauche, repositionner à droite (copie du milieu)
      if (scrollLeft <= leftThreshold - itemWidth * 0.5) {
        isScrollingRef.current = true;
        requestAnimationFrame(() => {
          if (carousel) {
            carousel.scrollLeft = scrollLeft + totalItemsWidth;
            isScrollingRef.current = false;
          }
        });
      }
      // Si on est trop à droite, repositionner à gauche (copie du milieu)
      else if (scrollLeft >= rightThreshold + itemWidth * 0.5) {
        isScrollingRef.current = true;
        requestAnimationFrame(() => {
          if (carousel) {
            carousel.scrollLeft = scrollLeft - totalItemsWidth;
            isScrollingRef.current = false;
          }
        });
      }
    };

    carousel.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initialiser la position au milieu (copie originale) après calcul de la largeur
    const initPosition = () => {
      if (itemWidthRef.current > 0) {
        const totalItemsWidth = items.length * itemWidthRef.current;
        carousel.scrollLeft = totalItemsWidth;
      } else {
        // Réessayer après un court délai si la largeur n'est pas encore calculée
        setTimeout(initPosition, 100);
      }
    };
    
    // Attendre que la largeur soit calculée
    setTimeout(initPosition, 50);

    return () => {
      carousel.removeEventListener('scroll', handleScroll);
    };
  }, [items]);

  if (items.length === 0) return null;

  // Créer 3 copies des items pour la boucle infinie : [clones] [original] [clones]
  const infiniteItems = [...items, ...items, ...items];

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Conteneur scrollable avec overflow-x-auto */}
      <div
        ref={carouselRef}
        className="overflow-x-auto overflow-y-hidden h-full w-full carousel-scrollable"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          scrollBehavior: 'auto', // 'auto' pour repositionnement instantané
          WebkitOverflowScrolling: 'touch',
          // touchAction géré dynamiquement selon la direction du swipe
        }}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {/* Conteneur flex pour les items - 3 copies pour boucle infinie */}
        <div 
          ref={containerRef}
          className="flex gap-6 h-full"
        >
          {infiniteItems.map((item, index) => {
            const handleItemClick = (e: React.MouseEvent) => {
              // Sur mobile, ignorer les clics si c'était un swipe
              if (isTouchDevice.current && touchState.current.hasMoved) {
                return;
              }
              
              // Ne pas déclencher le clic si c'était un drag (desktop)
              if (dragStartPos.current) {
                const deltaX = Math.abs(e.pageX - dragStartPos.current.x);
                const deltaY = Math.abs(e.pageY - dragStartPos.current.y);
                // Si le mouvement est supérieur à 5px, c'est un drag
                if (deltaX > 5 || deltaY > 5) {
                  return;
                }
              }
              
              // Si l'item a une URL, ouvrir le lien
              if (item.url) {
                window.open(item.url, '_blank', 'noopener,noreferrer');
              }
            };
            
            const handleTouchClick = (e: React.TouchEvent) => {
              // Gérer les clics sur mobile séparément
              if (!touchState.current.hasMoved && item.url) {
                window.open(item.url, '_blank', 'noopener,noreferrer');
              }
            };

            return (
            <div
              key={`${item.id}-${index}`}
              className="carousel-item flex-shrink-0 flex flex-col"
              style={{
                width: 'clamp(280px, 70vw, 500px)',
                height: '100%',
                cursor: item.url ? 'pointer' : 'default',
              }}
              onClick={handleItemClick}
              onTouchEnd={handleTouchClick}
            >
              {/* Conteneur unique centré verticalement contenant titre + image */}
              <div className="flex-1 min-h-0 flex items-center justify-center">
                <div className="w-full flex flex-col" style={{ gap: '8px' }}>
                  {/* Titre sticky horizontal - se bloque au bord gauche */}
                  <div className="carousel-title-wrapper flex-shrink-0">
                    <h3 className="carousel-title font-kode text-sm md:text-base lg:text-lg xl:text-xl text-black uppercase tracking-wider font-medium">
                      {item.name}
                    </h3>
                  </div>

                  {/* Image 16:9 - maintient le ratio 16:9 */}
                  <div className="relative w-full overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                    <img
                      src={item.image}
                      alt={item.name}
                      className="absolute inset-0 w-full h-full object-cover shadow-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .carousel-scrollable {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE et Edge */
        }
        .carousel-scrollable::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }

        /* Conteneur du titre avec position relative pour le sticky */
        .carousel-title-wrapper {
          position: relative;
          width: 100%;
        }

        /* Titre sticky horizontal - se bloque au bord gauche du viewport */
        .carousel-title {
          position: sticky;
          left: 0; /* Bord gauche du viewport */
          display: inline-block;
          margin: 0;
          padding: 0;
          line-height: 1.1;
          white-space: nowrap;
          z-index: 10;
          /* Ombre pour la profondeur quand sticky */
          transition: box-shadow 0.2s ease;
        }

        /* Quand le titre est sticky (bloqué au bord), ajouter une ombre */
        .carousel-item:has(.carousel-title[style*="position: sticky"]) .carousel-title {
          box-shadow: 4px 0 12px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default ProjectsCarousel;
