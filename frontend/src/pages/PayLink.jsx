import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import { pageVariants, fadeUp } from '../lib/motion.js';
import toast from '../lib/haptics.js';
import apiClient from '../lib/apiClient.js';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export default function PayLink() {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['paylink', id],
    queryFn: async () => {
      // Use the generic axios instance but unauthenticated if needed, though apiClient uses interceptors
      // Wait, we need an unauthenticated fetch. If we use apiClient, it will attach Authorization header if logged in.
      // That's fine, the backend public route works either way.
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/people/${id}/public`);
      if (!res.ok) throw new Error('Failed to fetch payment details');
      return res.json();
    },
    retry: false
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="spinner w-8 h-8" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6 text-center">
        <div className="card max-w-sm w-full p-8 text-center">
          <div className="text-negative mb-4 flex justify-center"><CheckCircle2 size={48} /></div>
          <h2 className="text-xl font-bold mb-2">Link Invalid</h2>
          <p className="text-muted">This payment link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const { person_name, amount, upi_vpa, display_name, status, note } = data;

  if (status === 'settled') {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6 text-center">
        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="card max-w-sm w-full p-8 text-center bg-surface-2 border border-border shadow-xl">
          <div className="text-primary mb-4 flex justify-center"><CheckCircle2 size={48} /></div>
          <h2 className="text-2xl font-bold mb-2">All Settled!</h2>
          <p className="text-muted">This IOU has already been marked as settled by {display_name || 'the owner'}.</p>
        </motion.div>
      </div>
    );
  }

  const handlePayClick = () => {
    if (!upi_vpa) {
      toast.error('The receiver has not set up their UPI VPA properly.');
      return;
    }
    
    // Generate UPI Deep Link
    // upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR
    const name = encodeURIComponent(display_name || 'Smart Budget User');
    const vpa = encodeURIComponent(upi_vpa);
    const amt = encodeURIComponent(amount);
    const upiLink = `upi://pay?pa=${vpa}&pn=${name}&am=${amt}&cu=INR&tn=${encodeURIComponent(note || 'Settling up')}`;
    
    // Open the link (on mobile this opens GPay, PhonePe, etc.)
    window.location.href = upiLink;
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
      
      <motion.div 
        variants={pageVariants} 
        initial="hidden" 
        animate="visible" 
        className="card max-w-sm w-full p-8 text-center bg-surface border border-border shadow-2xl relative z-10"
      >
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <CreditCard size={32} />
        </div>
        
        <motion.h1 variants={fadeUp} className="text-2xl font-bold mb-2">
          Hi, {person_name}!
        </motion.h1>
        
        <motion.p variants={fadeUp} className="text-muted mb-6">
          {display_name || 'Someone'} has requested a payment to settle up.
        </motion.p>
        
        <motion.div variants={fadeUp} className="bg-surface-2 p-6 rounded-2xl mb-8 border border-border/50">
          <p className="text-sm text-muted mb-1 font-medium uppercase tracking-wider">Amount Due</p>
          <div className="text-4xl font-black text-text mb-2">
            {fmt.format(amount)}
          </div>
          {note && <p className="text-sm text-muted italic">"{note}"</p>}
        </motion.div>
        
        <motion.button 
          variants={fadeUp} 
          className="btn btn-primary w-full py-4 text-lg font-bold shadow-lg shadow-primary/25"
          onClick={handlePayClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Pay via UPI
        </motion.button>
        
        <motion.p variants={fadeUp} className="text-xs text-muted mt-6">
          Secure payment powered by UPI. Opens your default UPI app.
        </motion.p>
      </motion.div>
    </div>
  );
}
