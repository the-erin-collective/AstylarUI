import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'examples',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'site/:siteId',
    renderMode: RenderMode.Server
  },
  {
    path: 'demo/:siteId',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
