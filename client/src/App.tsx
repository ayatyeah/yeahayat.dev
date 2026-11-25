import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { TransitionProvider } from './lib/transition';
import { routeModules } from './lib/routeModules';

function Page({ module }: { module: typeof routeModules['/'] }) {
  const Component = module.read();
  return <Component />;
}

export default function App() {
  return (
    <Suspense fallback={<main aria-busy="true" style={{ minHeight: '100svh' }} />}>
      <TransitionProvider>
        <Layout>
          <Routes>
            {Object.entries(routeModules).map(([path, module]) =>
              <Route key={path} path={path} element={<Page module={module} />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </TransitionProvider>
    </Suspense>
  );
}
