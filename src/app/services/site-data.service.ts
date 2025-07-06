import { Injectable } from '@angular/core';
import { SiteData } from './babylon-dom.service';

@Injectable({
  providedIn: 'root'
})
export class SiteDataService {
  
  private siteData: { [key: string]: SiteData } = {
    dashboard: {
      styles: [
        {
          selector: 'root',
          background: '#ff0000'
        },
        {
          selector: '#outerdiv',
          top: '15%',
          left: '15%',
          height: '70%',
          width: '70%',
          background: 'blue'
        },
        {
          selector: '#innerdiv',
          top: '25%',
          left: '25%',
          height: '50%',
          width: '50%',
          background: 'green'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'outerdiv',
            children: [
              {
                type: 'div',
                id: 'innerdiv'
              }
            ]
          }
        ]
      }
    },
    settings: {
      styles: [
        {
          selector: 'root',
          background: '#00ff00'  // Green for settings
        },
        {
          selector: '#outerdiv',
          top: '15%',
          left: '15%',
          height: '70%',
          width: '70%',
          background: 'blue'
        },
        {
          selector: '#outerdiv:hover',
          background: 'pink'
        },
        {
          selector: '#innerdiv',
          top: '25%',
          left: '25%',
          height: '50%',
          width: '50%',
          background: 'orange'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'outerdiv',
            children: [
              {
                type: 'div',
                id: 'innerdiv'
              }
            ]
          }
        ]
      }
    },
    analytics: {
      styles: [
        {
          selector: 'root',
          background: '#0000ff'  // Blue for analytics
        },
        {
          selector: '#header',
          top: '10%',
          left: '10%',
          height: '20%',
          width: '80%',
          background: 'purple'
        },
        {
          selector: '#sidebar',
          top: '35%',
          left: '10%',
          height: '55%',
          width: '25%',
          background: 'yellow'
        },
        {
          selector: '#content',
          top: '35%',
          left: '40%',
          height: '55%',
          width: '50%',
          background: 'pink'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'header'
          },
          {
            type: 'div',
            id: 'sidebar'
          },
          {
            type: 'div',
            id: 'content'
          }
        ]
      }
    },
    profile: {
      styles: [
        {
          selector: 'root',
          background: '#ff00ff'  // Magenta for profile
        },
        {
          selector: '#avatar',
          top: '15%',
          left: '35%',
          height: '30%',
          width: '30%',
          background: 'cyan'
        },
        {
          selector: '#info',
          top: '50%',
          left: '25%',
          height: '35%',
          width: '50%',
          background: 'orange'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'avatar'
          },
          {
            type: 'div',
            id: 'info'
          }
        ]
      }
    }
  };

  getSiteData(siteId: string): SiteData | undefined {
    return this.siteData[siteId];
  }

  getAllSiteIds(): string[] {
    return Object.keys(this.siteData);
  }

  hasSiteData(siteId: string): boolean {
    return siteId in this.siteData;
  }
}
