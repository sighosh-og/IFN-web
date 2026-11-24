import { createRoot } from 'react-dom/client';
import App from './App';
import './overrides.css';

createRoot(document.getElementById('root')!).render(<App />);
