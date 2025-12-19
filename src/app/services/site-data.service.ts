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
          selector: '#container',
          top: '10%',
          left: '10%',
          height: '80%',
          width: '80%',
          background: 'lightgray',
          padding: '20px'
        },
        {
          selector: '#box1',
          top: '0%',
          left: '0%',
          height: '30%',
          width: '45%',
          background: 'blue',
          margin: '10px',
          borderWidth: '2px',
          borderColor: 'yellow',
          borderStyle: 'solid'
        },
        {
          selector: '#box1:hover',
          background: 'lightblue',
          borderColor: 'navy'
        },
        {
          selector: '#box2',
          top: '0%',
          left: '50%',
          height: '30%',
          width: '45%',
          background: 'red',
          margin: '10px',
          padding: '15px'
        },
        {
          selector: '#box3',
          top: '40%',
          left: '0%',
          height: '25%',
          width: '100%',
          background: 'orange',
          margin: '5px 0px',
          padding: '10px 20px'
        },
        {
          selector: '#nested',
          top: '0%',
          left: '0%',
          height: '50%',
          width: '50%',
          background: 'yellow',
          margin: '5px'
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'container',
            children: [
              {
                type: 'div',
                id: 'box1'
              },
              {
                type: 'div',
                id: 'box2',
                children: [
                  {
                    type: 'div',
                    id: 'nested'
                  }
                ]
              },
              {
                type: 'div',
                id: 'box3'
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
