import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useOutlet } from 'react-router-dom';

const pageVariants = {
  initial: {
    opacity: 0,
  },
  in: {
    opacity: 1,
  },
  out: {
    opacity: 0,
  },
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.4,
};

export function AnimatedPage({ children }) {
  const location = useLocation();
  const outlet = useOutlet();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="w-full h-full relative"
      >
        {children ? children : outlet}
      </motion.div>
    </AnimatePresence>
  );
}
