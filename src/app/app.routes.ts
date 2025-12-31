import { Routes } from '@angular/router';
import { ExamplesComponent } from './components/examples.component';
import { HomeComponent } from './components/home.component';

export const routes: Routes = [
  { path: '', component: ExamplesComponent, title: 'AstylarUI - Demo Gallery' },
  { path: 'demo/:siteId', component: HomeComponent, title: 'AstylarUI Demo' },
  { path: '**', redirectTo: '' }
];
