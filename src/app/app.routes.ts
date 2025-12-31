import { Routes } from '@angular/router';
import { ExamplesComponent } from './components/examples.component';
import { SiteComponent } from './components/site.component';

export const routes: Routes = [
  { path: '', component: ExamplesComponent, title: 'AstylarUI - Demo Gallery' },
  { path: 'site/:siteId', component: SiteComponent, title: 'AstylarUI Demo' },
  { path: '**', redirectTo: '' }
];
