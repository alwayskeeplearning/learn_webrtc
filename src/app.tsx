import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import Router from './routes';

interface FallbackProps {
  error: Error;
  resetErrorBoundary: (...args: unknown[]) => void;
}

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <div role="alert">
    <p>Something went wrong:</p>
    <pre>{error.message}</pre>
    <button onClick={resetErrorBoundary}>Try again</button>
  </div>
);

const App = () => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        console.log('重试');
      }}
    >
      <Suspense fallback={<div>loading....</div>}>
        <Router />
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
