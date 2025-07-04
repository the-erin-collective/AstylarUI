import { Routes } from '@angular/router';
import { SiteComponent } from './components/site.component';
import { HomeComponent } from './components/home.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Angular 20 Signals App'
  },
  {
    path: 'site/:site-id',
    component: SiteComponent,
    title: 'Site'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
