import { Routes } from '@angular/router';
import { HomeComponent } from './components/home.component';
import { TodoComponent } from './components/todo.component';
import { SiteComponent } from './components/site.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Home' },
  { path: 'site', component: SiteComponent, title: 'Site' },
  { path: 'site/:siteId', component: SiteComponent, title: 'Site Details' },
  { path: 'todo', component: TodoComponent, title: 'Todo List' },
  { path: '**', redirectTo: '' }
];
