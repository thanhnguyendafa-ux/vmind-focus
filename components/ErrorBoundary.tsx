import * as React from 'react';
import Icon from './ui/Icon';
import { Button } from './ui/Button';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: The error `Property 'props' does not exist on type 'ErrorBoundary'` suggests a problem with how TypeScript is inferring the component's instance properties. Reverting to a constructor-based state initialization and explicitly calling `super(props)` is a more robust way to ensure `this.props` and `this.state` are correctly typed and available.
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen bg-background dark:bg-secondary-900 flex items-center justify-center text-center p-4">
            <div>
                <Icon name="error-circle" className="w-16 h-16 text-error-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-text-main dark:text-secondary-100 mb-2">Something went wrong.</h1>
                <p className="text-text-subtle mb-6">An unexpected error occurred. Please try reloading the page.</p>
                <Button 
                    onClick={() => window.location.reload()}
                    size="lg"
                >
                    Reload Page
                </Button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
