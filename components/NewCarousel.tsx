import React, { useEffect, useRef, useState } from 'react';

interface CarouselItem {
  id: number;
  name: string;
  images: string[];
  description: string;
}

interface NewCarouselProps {
  items: CarouselItem[];
  selectedIndex: number;
  onItemChange?: (index: number) => void;
}

const NewCarousel: React.FC<NewCarouselProps> = ({ items, selectedIndex, onItemChange }) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  useEffect(() => {
    setCurrentIndex(selectedIndex);
  }, [selectedIndex]);

  const updateCarousel = () => {
    if (!carouselRef.current) return;
    
    const carousel = carouselRef.current;
    const carouselItems = carousel.querySelectorAll('.carousel-item') as NodeListOf<HTMLElement>;
    
    carouselItems.forEach((item, index) => {
      const offset = index - currentIndex;
      const absOffset = Math.abs(offset);
      
      // Calculer les propriétés CSS custom
      const active = absOffset === 0 ? 1 : 0;
      const zIndex = items.length - absOffset;
      
      // Calculer la position relative par rapport à l'élément actif
      let relativePosition = offset;
      if (offset > items.length / 2) {
        relativePosition = offset - items.length;
      } else if (offset < -items.length / 2) {
        relativePosition = offset + items.length;
      }
      
      item.style.setProperty('--active', active.toString());
      item.style.setProperty('--offset', relativePosition.toString());
      item.style.setProperty('--zIndex', zIndex.toString());
      item.style.setProperty('--items', items.length.toString());
    });
  };

  useEffect(() => {
    updateCarousel();
  }, [currentIndex, items.length]);

  const handleNext = () => {
    const newIndex = (currentIndex + 1) % items.length;
    setCurrentIndex(newIndex);
    onItemChange?.(newIndex);
  };

  const handlePrev = () => {
    const newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    onItemChange?.(newIndex);
  };

  const handleItemClick = (index: number) => {
    if (index !== currentIndex) {
      setCurrentIndex(index);
      onItemChange?.(index);
    }
  };

  // Gestion du drag pour navigation
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) return;
    setIsDragging(true);
    startXRef.current = e.clientX;
    currentXRef.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    currentXRef.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    const diff = startXRef.current - currentXRef.current;
    const threshold = 50;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    
    setIsDragging(false);
  };

  return (
    <div 
      ref={carouselRef}
      className="carousel"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsDragging(false)}
    >
      {items.map((item, index) => (
        <div 
          key={item.id}
          className="carousel-item"
          onClick={() => handleItemClick(index)}
          style={{
            '--active': index === currentIndex ? '1' : '0',
            '--offset': '0', // Sera mis à jour par updateCarousel
            '--zIndex': items.length - Math.abs(index - currentIndex),
            '--items': items.length,
          } as React.CSSProperties}
        >
          <div className="carousel-box">
            <img src={item.images[0]} alt={item.name} />
            <div className="carousel-title">{item.name}</div>
            <div className="carousel-num">{String(index + 1).padStart(2, '0')}</div>
          </div>
        </div>
      ))}
      
      <div className="carousel-layout">
        <div className="carousel-layout-box">
          {String(currentIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
};

export default NewCarousel; 