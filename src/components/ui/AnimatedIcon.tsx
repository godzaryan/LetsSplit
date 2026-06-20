'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import React from 'react';

interface AnimatedIconProps {
  icon?: LucideIcon;
  children?: React.ReactNode;
  size?: number;
  className?: string;
  animationType?: 'hover-bounce' | 'hover-pulse' | 'rotate' | 'scale' | 'none';
  strokeWidth?: number;
  color?: string;
}

export default function AnimatedIcon({
  icon: Icon,
  children,
  size = 24,
  className = '',
  animationType = 'hover-bounce',
  strokeWidth = 2,
  color = 'currentColor'
}: AnimatedIconProps) {
  
  const content = Icon ? <Icon size={size} strokeWidth={strokeWidth} color={color} /> : children;

  if (animationType === 'none') {
    if (Icon) {
      return <Icon size={size} className={className} strokeWidth={strokeWidth} color={color} />;
    }
    return <span className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{content}</span>;
  }

  // Define animation variants based on type
  const getVariants = () => {
    switch (animationType) {
      case 'hover-bounce':
        return {
          hover: { scale: 1.15, y: -2, transition: { type: 'spring' as const, stiffness: 400, damping: 10 } },
          tap: { scale: 0.95 }
        };
      case 'hover-pulse':
        return {
          hover: { scale: 1.1, opacity: 0.8, transition: { repeat: Infinity, repeatType: "reverse" as const, duration: 0.4 } },
          tap: { scale: 0.9 }
        };
      case 'rotate':
        return {
          hover: { rotate: 15, scale: 1.1 },
          tap: { scale: 0.9 }
        };
      case 'scale':
        return {
          hover: { scale: 1.1 },
          tap: { scale: 0.95 }
        };
      default:
        return {
          hover: { scale: 1.1 },
          tap: { scale: 0.95 }
        };
    }
  };

  return (
    <motion.div
      whileHover="hover"
      whileTap="tap"
      variants={getVariants()}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      className={className}
    >
      {content}
    </motion.div>
  );
}
