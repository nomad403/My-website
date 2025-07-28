import React, { useEffect, useRef, useState } from 'react';

interface CarouselItem {
  id: number;
  name: string;
  images: string[];
  description: string;
}

interface CylinderCarouselProps {
  items: CarouselItem[];
  selectedIndex: number;
  onItemChange?: (index: number) => void;
}

const CylinderCarousel: React.FC<CylinderCarouselProps> = ({ items, selectedIndex, onItemChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerCarrouselRef = useRef<HTMLDivElement>(null);
  const carrouselRef = useRef<HTMLDivElement>(null);
  
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [currentMousePos, setCurrentMousePos] = useState(0);
  const [lastMousePos, setLastMousePos] = useState(0);
  const [lastMoveTo, setLastMoveTo] = useState(0);
  const [moveTo, setMoveTo] = useState(0);
  const [targetRotation, setTargetRotation] = useState(0);
  const [isAnimatingToTarget, setIsAnimatingToTarget] = useState(false);
  const isAnimatingRef = useRef(false);

  // Fonction lerp pour l'animation fluide
  const lerp = (a: number, b: number, n: number) => {
    return n * (a - b) + b;
  };

  // Calcule la distance Z des items
  const distanceZ = (widthElement: number, length: number, gap: number) => {
    return (widthElement / 2) / Math.tan(Math.PI / length) + gap;
  };

  // Calcule la hauteur du conteneur
  const calculateHeight = (z: number) => {
    const t = Math.atan(90 * Math.PI / 180 / 2);
    const height = t * 2 * z;
    return height;
  };

  // Calcule le champ de vision
  const calculateFov = (carrouselProps: { w: number; h: number }) => {
    if (!containerCarrouselRef.current) return 0;
    
    const perspective = window
      .getComputedStyle(containerCarrouselRef.current)
      .perspective.split("px")[0];

    const length =
      Math.sqrt(carrouselProps.w * carrouselProps.w) +
      Math.sqrt(carrouselProps.h * carrouselProps.h);
    const fov = 2 * Math.atan(length / (2 * parseInt(perspective))) * (180 / Math.PI);
    return fov;
  };

  // Obtient les propriétés de taille
  const onResize = () => {
    if (!containerCarrouselRef.current) return { w: 0, h: 0 };
    
    const boundingCarrousel = containerCarrouselRef.current.getBoundingClientRect();
    return {
      w: boundingCarrousel.width,
      h: boundingCarrousel.height
    };
  };

  // Crée le carrousel
  const createCarrousel = () => {
    if (!containerRef.current || !carrouselRef.current) return;
    
    const carrouselProps = onResize();
    const length = items.length;
    const degress = 360 / length;
    const gap = 20;
    const tz = distanceZ(carrouselProps.w, length, gap);
    
    const height = calculateHeight(tz);

    containerRef.current.style.width = tz * 2 + gap * length + "px";
    containerRef.current.style.height = height + "px";

    const carrouselItems = carrouselRef.current.querySelectorAll('.carrousel-item');
    carrouselItems.forEach((item: Element, i: number) => {
      const degressByItem = degress * i + "deg";
      (item as HTMLElement).style.setProperty("--rotatey", degressByItem);
      (item as HTMLElement).style.setProperty("--tz", tz + "px");
    });
  };

  // Calcule l'angle de rotation pour afficher un projet spécifique
  const calculateTargetRotation = (index: number) => {
    const degreesPerItem = 360 / items.length;
    return -degreesPerItem * index;
  };

  // Anime vers le projet sélectionné
  const animateToProject = (index: number) => {
    if (!carrouselRef.current) return;
    
    const targetAngle = calculateTargetRotation(index);
    setTargetRotation(targetAngle);
    setIsAnimatingToTarget(true);
    isAnimatingRef.current = true;
    
    let currentAngle = lastMoveTo;
    
    // Animation progressive vers l'angle cible
    const animate = () => {
      const diff = targetAngle - currentAngle;
      
      // Si on est proche de la cible, on s'arrête
      if (Math.abs(diff) < 0.5) {
        setIsAnimatingToTarget(false);
        isAnimatingRef.current = false;
        setLastMoveTo(targetAngle);
        setMoveTo(targetAngle);
        if (carrouselRef.current) {
          carrouselRef.current.style.setProperty("--rotatey", targetAngle + "deg");
        }
        return;
      }
      
      // Sinon on continue l'animation
      currentAngle += diff * 0.15;
      setLastMoveTo(currentAngle);
      
      if (carrouselRef.current) {
        carrouselRef.current.style.setProperty("--rotatey", currentAngle + "deg");
      }
      
      if (isAnimatingRef.current) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  };

  // Gestion de la position X
  const getPosX = (x: number) => {
    // Annule l'animation automatique si l'utilisateur interagit
    setIsAnimatingToTarget(false);
    isAnimatingRef.current = false;
    
    setCurrentMousePos(x);
    setMoveTo(prev => currentMousePos < lastMousePos ? prev - 2 : prev + 2);
    setLastMousePos(currentMousePos);
  };

  // Animation continue
  const update = () => {
    if (!carrouselRef.current || isAnimatingRef.current) return;
    
    setLastMoveTo(prev => {
      const newValue = lerp(moveTo, prev, 0.05);
      carrouselRef.current!.style.setProperty("--rotatey", newValue + "deg");
      return newValue;
    });
    
    requestAnimationFrame(update);
  };

  // Événements de souris
  const handleMouseDown = () => {
    setIsMouseDown(true);
    if (carrouselRef.current) {
      carrouselRef.current.style.cursor = "grabbing";
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    if (carrouselRef.current) {
      carrouselRef.current.style.cursor = "grab";
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMouseDown) {
      getPosX(e.clientX);
    }
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
  };

  // Événements tactiles
  const handleTouchStart = () => {
    setIsMouseDown(true);
    if (carrouselRef.current) {
      carrouselRef.current.style.cursor = "grabbing";
    }
  };

  const handleTouchEnd = () => {
    setIsMouseDown(false);
    if (carrouselRef.current) {
      carrouselRef.current.style.cursor = "grab";
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isMouseDown) {
      getPosX(e.touches[0].clientX);
    }
  };

  // Initialisation
  useEffect(() => {
    const timer = setTimeout(() => {
      createCarrousel();
      update();
    }, 100);

    const handleResize = () => {
      createCarrousel();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [items]);

  useEffect(() => {
    update();
  }, [moveTo]);

  // Animation vers le projet sélectionné
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < items.length) {
      // Petit délai pour laisser le carrousel se créer
      setTimeout(() => {
        animateToProject(selectedIndex);
      }, 200);
    }
  }, [selectedIndex, items.length]);

  return (
    <div 
      ref={containerRef}
      className="cylinder-container"
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
    >
      <div ref={containerCarrouselRef} className="container-carrousel">
        <div 
          ref={carrouselRef}
          className="carrousel"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {items.map((item, index) => (
            <div 
              key={item.id}
              className="carrousel-item"
              onClick={() => onItemChange?.(index)}
            >
              <img src={item.images[0]} alt={item.name} />
              <div className="item-overlay">
                <h3>{item.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CylinderCarousel; 