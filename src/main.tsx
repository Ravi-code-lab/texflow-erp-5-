import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface EBState { hasError: boolean; error: any; }
interface EBProps { children: React.ReactNode; }

class ErrorBoundary extends React.Component<EBProps, EBState> {
  declare props: EBProps;
  state: EBState = { hasError: false, error: null };
  static getDerivedStateFromError(error: any): EBState { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red' }}>
          <h1>Something went wrong.</h1>
          <pre>{(this.state.error as any)?.stack || (this.state.error as any)?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
