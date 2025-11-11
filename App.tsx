import * as React from 'react';
import { AppContent } from './components/AppContent';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  // DataOrchestrator has been removed. Data hydration and persistence are now
  // handled by the Zustand stores via the persist middleware and a custom storage engine.
  // The useUserStore's init() method, which is called on import, sets up the auth listener
  // that kicks off the entire data flow.
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;