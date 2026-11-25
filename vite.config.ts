import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The dev handoff pages are plain static pages in public/ (spec/, motion/). nginx serves their folder
 * index in production; the dev server would hand /spec/ to the app instead, so point it at the file.
 */
const staticPageIndexes = (dirs: string[]): Plugin => {
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    const [path, query] = (req.url ?? '').split('?');
    const dir = dirs.find((d) => path === `/${d}` || path === `/${d}/`);
    if (dir) req.url = `/${dir}/index.html${query ? `?${query}` : ''}`;
    next();
  };
  return {
    name: 'static-page-indexes',
    configureServer: (server) => { server.middlewares.use(rewrite); },
    configurePreviewServer: (server) => { server.middlewares.use(rewrite); },
  };
};

export default defineConfig({ plugins: [react(), staticPageIndexes(['spec', 'motion'])] });
