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

  // Gestion du drag
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartPos.current = { x: e.pageX, y: e.pageY };
    setIsDragging(true);
    if (carouselRef.current) {
      setStartX(e.pageX - carouselRef.current.offsetLeft);
      setScrollLeft(carouselRef.current.scrollLeft);
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    dragStartPos.current = null;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartPos.current = null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  // Gestion du touch
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    if (carouselRef.current) {
      setStartX(e.touches[0].pageX - carouselRef.current.offsetLeft);
      setScrollLeft(carouselRef.current.scrollLeft);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !carouselRef.current) return;
    const x = e.touches[0].pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    carouselRef.current.scrollLeft = scrollLeft - walk;
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
              // Ne pas déclencher le clic si c'était un drag
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
