import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing.component';
import { HomeComponent } from './components/home.component';
import { TodoComponent } from './components/todo.component';

export const routes: Routes = [
  { path: '', component: LandingComponent, title: 'AstylarUI - Demo Gallery' },
  { path: 'site/:siteId', component: HomeComponent, title: 'AstylarUI Demo' },
  { path: 'todo', component: TodoComponent, title: 'Todo List' },
  { path: '**', redirectTo: '' }
];
