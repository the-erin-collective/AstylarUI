import { Routes } from '@angular/router';
import { ExamplesComponent } from './components/examples.component';
import { SiteComponent } from './components/site.component';
import { TodoComponent } from './components/todo.component';

export const routes: Routes = [
  { path: '', component: ExamplesComponent, title: 'AstylarUI - Demo Gallery' },
  { path: 'demo/:siteId', component: SiteComponent, title: 'AstylarUI Demo' },
  { path: 'todo', component: TodoComponent, title: 'Todo List' },
  { path: '**', redirectTo: '' }
];
