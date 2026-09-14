import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // If it's a chunk load error from Vercel deployments
    if (error?.name === 'ChunkLoadError' || error?.message?.includes('Failed to fetch dynamically imported module')) {
      // Force a hard reload to fetch the new chunks
      window.location.reload(true);
      return { hasError: true };
    }
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: '16px' }}>
          <h2>Something went wrong.</h2>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}
