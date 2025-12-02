import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SiteDataService } from '../services/site-data.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home-container">
      <header class="hero">
        <h1>{{ greeting() }}</h1>
        <p class="subtitle">A modern Angular 20 application with signals, zoneless change detection, and SSR</p>
      </header>

      <nav class="navigation">
        <a routerLink="/todo" class="nav-link">
          <div class="nav-card">
            <h3>Todo App</h3>
            <p>Interactive todo list with signals</p>
          </div>
        </a>
        
        <a routerLink="/text-test" class="nav-link">
          <div class="nav-card">
            <h3>Text Selection Test</h3>
            <p>Test text selection and clipboard functionality</p>
          </div>
        </a>

        <div class="nav-section">
          <h3>Sites</h3>
          <div class="sites-grid">
            @for(site of availableSites(); track site) {
              <a 
                [routerLink]="'/site/' + site" 
                class="nav-link"
                (mouseenter)="onSiteHover(site)"
                (mouseleave)="onSiteHover(null)"
              >
                <div class="nav-card">
                  <h3>{{ site }}</h3>
                  @if(hoveredSite() === site && hoveredSiteDescription()) {
                    <p class="site-description">{{ hoveredSiteDescription() }}</p>
                  }
                </div>
              </a>
            }
          </div>
        </div>
      </nav>
    </div>
  `,
  styles: [`
    .home-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .hero {
      text-align: center;
      margin-bottom: 3rem;
    }

    .hero h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      font-size: 1.25rem;
      color: #6b7280;
      max-width: 600px;
      margin: 0 auto;
    }

    .navigation {
      display: grid;
      gap: 2rem;
    }

    .nav-link {
      text-decoration: none;
      color: inherit;
    }

    .nav-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      border: 1px solid #e5e7eb;
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }

    .nav-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      border-color: #667eea;
    }

    .nav-card h3 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
      color: #1f2937;
    }

    .nav-card p {
      color: #6b7280;
      margin: 0;
      line-height: 1.5;
    }

    .nav-section h3 {
      font-size: 1.75rem;
      font-weight: 600;
      margin: 0 0 1.5rem 0;
      color: #1f2937;
    }

    .sites-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .site-description {
      font-size: 0.9rem;
      color: #4b5563;
      margin-top: 0.5rem;
    }
  `]
})
export class HomeComponent {
  private router = inject(Router);
  private siteDataService = inject(SiteDataService);
  
  // Local signals for app-level state
  protected name = signal('Angular 20 Signals App');
  protected isSiteRoute = signal(false);
  protected hoveredSite = signal<string | null>(null);
  
  // Computed signals
  protected greeting = computed(() => `Hello from ${this.name()}!`);
  protected availableSites = computed(() => this.siteDataService.getAllSiteNames());
  protected hoveredSiteDescription = computed(() => {
    const siteName = this.hoveredSite();
    if (!siteName) return null;
    return this.siteDataService.getSiteMeta(siteName)?.description || null;
  });
  
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
  
  onSiteHover(siteName: string | null): void {
    this.hoveredSite.set(siteName);
  }
}