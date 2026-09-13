/**
 * Shared Framer Motion animation variants & helpers
 * Import these wherever you need consistent, smooth animations.
 */

// ─── Page / Container ────────────────────────────────────────────────────────
export const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94], when: 'beforeChildren', staggerChildren: 0.07 }
  },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } },
};

// ─── Individual items (cards, rows, etc.) ────────────────────────────────────
export const itemVariants = {
  hidden:  { opacity: 0, y: 18, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, scale: 0.95, y: -8, transition: { duration: 0.18, ease: 'easeIn' } },
};

// ─── Stagger container (wrap lists with this) ────────────────────────────────
export const staggerContainer = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 }
  },
};

// ─── Modal backdrop + panel ──────────────────────────────────────────────────
export const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.2, delay: 0.05 } },
};

export const modalVariants = {
  hidden:  { opacity: 0, scale: 0.93, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: [0.34, 1.26, 0.64, 1] } },
  exit:    { opacity: 0, scale: 0.95, y: 12, transition: { duration: 0.18, ease: 'easeIn' } },
};

// ─── Slide-in from left (sidebar nav items) ──────────────────────────────────
export const slideInLeft = {
  hidden:  { opacity: 0, x: -14 },
  visible: (i = 0) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.28, delay: i * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }
  }),
};

// ─── Fade-up (stat numbers) ──────────────────────────────────────────────────
export const fadeUp = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Scale pop (badges, icons) ───────────────────────────────────────────────
export const scalePop = {
  hidden:  { opacity: 0, scale: 0.5 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] } },
};

// ─── Hover tap helpers for buttons/cards ────────────────────────────────────
export const hoverCard = { scale: 1.015, transition: { duration: 0.18 } };
export const tapCard   = { scale: 0.98  };
export const hoverBtn  = { scale: 1.03,  transition: { duration: 0.15 } };
export const tapBtn    = { scale: 0.96  };
