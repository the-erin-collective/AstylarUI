import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'site/:site-id',
    renderMode: RenderMode.Server,
    // Dynamic routes should use Server-side rendering, not prerendering
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
