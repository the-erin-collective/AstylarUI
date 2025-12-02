import { Routes } from '@angular/router';
import { HomeComponent } from './components/home.component';
import { TodoComponent } from './components/todo.component';
import { SiteComponent } from './components/site.component';
import { TextTestComponent } from './components/text-test.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Home' },
  { path: 'todo', component: TodoComponent, title: 'Todo List' },
  { path: 'site/:siteId', component: SiteComponent, title: 'Site Details' },
  { path: 'text-test', component: TextTestComponent, title: 'Text Selection Test' },
  { path: '**', redirectTo: '' }
];
