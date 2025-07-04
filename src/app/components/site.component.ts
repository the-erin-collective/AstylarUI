import { Component, signal, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-site',
  imports: [CommonModule],
  template: `
    <div class="site-container">
      <h1>Site Component</h1>
      <div class="site-content">
        <h2>Site ID: {{ siteId() }}</h2>
        <p>This is the site component for site: <strong>{{ siteId() }}</strong></p>
        <div class="site-info">
          <p>URL: {{ currentUrl() }}</p>
          <p>Timestamp: {{ timestamp() }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .site-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .site-content {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    
    .site-info {
      margin-top: 15px;
      padding: 10px;
      background: white;
      border-radius: 4px;
      border-left: 4px solid #007bff;
    }
    
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    
    h2 {
      color: #007bff;
      margin-bottom: 15px;
    }
    
    p {
      margin: 8px 0;
    }
    
    strong {
      color: #d63384;
    }
  `]
})
export class SiteComponent {
  private route = inject(ActivatedRoute);
  
  // Signal for site ID from route parameters
  protected siteId = signal<string>('');
  
  // Computed signals
  protected currentUrl = computed(() => `/site/${this.siteId()}`);
  protected timestamp = computed(() => new Date().toLocaleString());
  
  constructor() {
    // Subscribe to route parameter changes
    this.route.paramMap.subscribe(params => {
      const id = params.get('site-id');
      this.siteId.set(id || 'unknown');
    });
  }
}
