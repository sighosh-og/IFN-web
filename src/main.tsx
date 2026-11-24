import { createRoot } from 'react-dom/client';
import App from './App';
import { VariantsProvider } from './variants/variants';
import { VariantsWidget } from './variants/VariantsWidget';
import { ViewerProvider } from './viewer/ViewerContext';
import './overrides.css';

createRoot(document.getElementById('root')!).render(
  <VariantsProvider>
    <ViewerProvider>
      <App />
    </ViewerProvider>
    <VariantsWidget />
  </VariantsProvider>,
);
