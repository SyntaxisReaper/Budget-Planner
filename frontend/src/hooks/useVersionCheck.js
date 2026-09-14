import { useEffect, useRef } from 'react';

/**
 * Polls the server periodically to check if a new deployment has occurred.
 * If the HTML script tags have changed (e.g., new Vercel build hashes),
 * it seamlessly auto-reloads the page to ensure the user is on the latest version.
 */
export function useVersionCheck(intervalMs = 60000) {
  const currentScriptsRef = useRef(null);

  useEffect(() => {
    // Only run in production builds
    if (import.meta.env.DEV) return;

    let intervalId;

    const checkVersion = async () => {
      try {
        // Cache buster to ensure we get the absolute latest HTML from Vercel
        const res = await fetch('/?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        
        const html = await res.text();
        
        // Extract all <script src="..."> from the HTML
        const scriptRegex = /<script\b[^>]*src="([^"]+)"/ig;
        const scripts = [];
        let match;
        while ((match = scriptRegex.exec(html)) !== null) {
          scripts.push(match[1]);
        }
        
        const currentScripts = scripts.join(',');
        
        // Initialize reference on first check
        if (currentScriptsRef.current === null) {
          currentScriptsRef.current = currentScripts;
        } 
        // If the scripts don't match, a new deployment happened!
        else if (currentScriptsRef.current !== currentScripts) {
          console.log('New version detected! Auto-reloading...');
          window.location.reload(true);
        }
      } catch (err) {
        // Ignore network errors (e.g. offline)
        console.warn('Version check failed:', err);
      }
    };

    // Run periodically
    intervalId = setInterval(checkVersion, intervalMs);
    
    // Run an initial check shortly after mount
    const timeoutId = setTimeout(checkVersion, 5000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [intervalMs]);
}
