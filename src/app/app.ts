import { Component, signal, computed, inject, effect } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private router = inject(Router);
  
  // Local signals for app-level state
  protected name = signal('Angular 20 Signals App');
  protected isSiteRoute = signal(false);
  
  // Computed signals
  protected greeting = computed(() => `Hello from ${this.name()}!`);
  
  constructor() {
    // Track route changes to determine if we're on a site route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isSiteRoute.set(event.url.startsWith('/site/'));
      });
      
    // Check initial route
    this.isSiteRoute.set(this.router.url.startsWith('/site/'));
  }
}
