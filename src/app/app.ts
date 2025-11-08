import { Component, signal, computed, inject, effect } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { SiteDataService } from './services/site-data.service';
import { TextSelectionKeyboardService } from './services/dom/interaction/text-selection-keyboard.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private router = inject(Router);
  private siteDataService = inject(SiteDataService);
  // Instantiate keyboard service to enable global text selection shortcuts
  private readonly textSelectionKeyboard = inject(TextSelectionKeyboardService);
  
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

  // Hover event handlers
  protected onSiteHover(siteName: string): void {
    this.hoveredSite.set(siteName);
  }
  
  protected onSiteLeave(): void {
    this.hoveredSite.set(null);
  }

  // Helper method to generate display names for sites
  protected getSiteDisplayName(siteName: string): string {
    const siteDisplayNames: { [key: string]: string } = {
      'dashboard': '📊 Dashboard Site',
      'lists': '📋 Lists Site',
      'settings': '⚙️ Settings Site',
      'images': '🖼️ Images Site',
      'links': '🔗 Links Site',
      'about': 'ℹ️ About Site',
      'flexbox-advanced': '🔧 Advanced Flexbox Site',
      'flexbox': '📐 Flexbox Site',
      'flexwrap': '🔄 Flex Wrap Site',
      'flexgrowshrink': '📏 Flex Grow/Shrink Site',
      'flexgap': '📊 Flex Gap Site',
      'flexbox-align-content': '📋 Align Content Site',
      'flexbox-flex-item-sizing': '📐 Flex Item Sizing Site',
      'flexbox-align-self': '🎯 Align Self Site'
    };
    
    return siteDisplayNames[siteName] || `🌐 ${siteName.charAt(0).toUpperCase() + siteName.slice(1)} Site`;
  }
}
