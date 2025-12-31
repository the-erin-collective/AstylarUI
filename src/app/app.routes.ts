import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing.component';
import { HomeComponent } from './components/home.component';
import { SiteComponent } from './components/site.component';
import { ExamplesComponent } from './components/examples.component';
import { TodoComponent } from './components/todo.component';

export const routes: Routes = [
  { path: '', component: LandingComponent, title: 'AstylarUI - Demo Gallery' },
  { path: 'examples', component: ExamplesComponent, title: 'AstylarUI - Functional Demo Gallery' },
  { path: 'site/:siteId', component: HomeComponent, title: 'AstylarUI Demo' },
  { path: 'demo/:siteId', component: SiteComponent, title: 'AstylarUI Functional Demo' },
  { path: 'todo', component: TodoComponent, title: 'Todo List' },
  { path: '**', redirectTo: '' }
];
