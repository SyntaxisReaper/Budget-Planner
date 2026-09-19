import { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { impactLight, impactMedium } from '../lib/haptics.js';

export default function PullToRefresh({ onRefresh, children }) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const controls = useAnimation();

  const maxPull = 100;
  const threshold = 60;

  const handleTouchStart = (e) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || isRefreshing) return;
    
    const y = e.touches[0].clientY;
    const dy = y - startY.current;

    if (dy > 0) {
      // Prevent default scrolling when pulling down
      if (e.cancelable) e.preventDefault();
      
      const newPull = Math.min(dy * 0.4, maxPull);
      if (pullDistance < threshold && newPull >= threshold) {
        impactLight(); // Haptic when passing threshold
      }
      setPullDistance(newPull);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    setIsPulling(false);

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      impactMedium(); // Haptic on release to refresh
      controls.start({ y: 50, transition: { type: 'spring', stiffness: 300, damping: 20 } });
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        controls.start({ y: 0 });
      }
    } else {
      setPullDistance(0);
      controls.start({ y: 0 });
    }
  };

  useEffect(() => {
    if (isPulling) {
      controls.set({ y: pullDistance });
    }
  }, [pullDistance, isPulling, controls]);

  return (
    <div 
      ref={containerRef}
      style={{ height: '100%', overflowY: 'auto', position: 'relative' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Indicator */}
      <motion.div
        style={{
          position: 'absolute',
          top: -40,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 40,
          zIndex: 10
        }}
      >
        <motion.div
          animate={{ rotate: isRefreshing ? 360 : (pullDistance / maxPull) * 360 }}
          transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : { duration: 0 }}
        >
          <RefreshCw 
            size={24} 
            color={pullDistance >= threshold ? 'var(--color-primary)' : 'var(--color-text-3)'} 
          />
        </motion.div>
      </motion.div>

      {/* Content wrapper */}
      <motion.div animate={controls}>
        {children}
      </motion.div>
    </div>
  );
}
