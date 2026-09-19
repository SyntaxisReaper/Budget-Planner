import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../lib/apiClient.js';
import toast from '../lib/haptics.js';

export default function Assistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! I am your AI financial assistant. I can log transactions, check your budget, and answer questions. What can I help you with today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Create the history payload to send to the backend (excluding the very first static message if preferred, or include all)
      const history = messages.slice(1).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await apiClient.post('/assistant/chat', { 
        message: userMessage,
        history 
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.data.text }]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to get response from AI.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      <header className="page-header" style={{ marginBottom: 'var(--space-2)' }}>
        <h1 className="page-title">Personal Assistant</h1>
      </header>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        border: '1px solid var(--color-border)',
        marginBottom: 'var(--space-4)'
      }}>
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: msg.role === 'user' ? '#fff' : 'var(--color-text)'
              }}>
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div style={{
                background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface-2)',
                color: msg.role === 'user' ? '#fff' : 'var(--color-text)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                maxWidth: '75%',
                fontSize: 'var(--text-base)',
                lineHeight: 1.5,
                borderTopRightRadius: msg.role === 'user' ? 0 : undefined,
                borderTopLeftRadius: msg.role === 'assistant' ? 0 : undefined,
              }}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={18} />
            </div>
            <div style={{ background: 'var(--color-surface-2)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center' }}>
              <Loader2 size={18} className="spin" />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <input
          type="text"
          className="input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask me to log an expense..."
          disabled={isLoading}
          style={{ flex: 1, borderRadius: 'var(--radius-full)' }}
        />
        <button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          className="btn btn-primary"
          style={{ borderRadius: 'var(--radius-full)', padding: '0 var(--space-4)', height: 48 }}
        >
          <Send size={20} />
        </button>
      </form>

      {/* Basic spin animation for loader */}
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
