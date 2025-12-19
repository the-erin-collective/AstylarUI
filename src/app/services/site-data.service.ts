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
          background: '#2a2a2a'  // Dark background to show transparency effects
        },
        
        // Main container - testing padding and basic styling
        {
          selector: '#container',
          top: '5%',
          left: '5%',
          height: '90%',
          width: '90%',
          background: '#f0f0f0',
          padding: '20px',
          opacity: '1.0',
          zIndex: '1'
        },
        
        // Top row: Testing different z-index values with overlapping elements
        {
          selector: '#overlap-test-1',
          top: '5%',
          left: '10%',
          height: '20%',
          width: '30%',
          background: '#FF0000',  // Bright red
          borderWidth: '3px',
          borderColor: '#8B0000',  // Dark red
          borderStyle: 'solid',
          margin: '5px',
          zIndex: '10'  // Should be behind overlap-test-2
        },
        
        {
          selector: '#overlap-test-2',
          top: '15%',  // Overlaps with overlap-test-1
          left: '25%',  // Overlaps with overlap-test-1
          height: '20%',
          width: '30%',
          background: '#00FF00',  // Bright green
          borderWidth: '2px',
          borderColor: '#006400',  // Dark green
          borderStyle: 'solid',
          margin: '5px',
          opacity: '0.7',  // Make semi-transparent to see red/blue behind it
          zIndex: '20'  // Should be in front of overlap-test-1
        },
        
        {
          selector: '#overlap-test-3',
          top: '10%',  // Overlaps with both above
          left: '40%',  // Overlaps with overlap-test-2
          height: '20%',
          width: '30%',
          background: '#0000FF',  // Bright blue
          borderWidth: '4px',
          borderColor: '#000080',  // Navy blue
          borderStyle: 'solid',
          margin: '5px',
          opacity: '1.0',  // Make fully opaque for now
          zIndex: '15'  // Should be between the other two
        },
        
        // Middle row: Testing margin, padding, and different opacity levels
        {
          selector: '#margin-test',
          top: '35%',
          left: '5%',
          height: '25%',
          width: '25%',
          background: '#800080',  // Purple
          margin: '15px 20px 10px 25px',  // Different margins on each side
          padding: '10px',
          borderWidth: '2px',
          borderColor: '#FF00FF',  // Magenta border
          borderStyle: 'solid',
          opacity: '1.0',  // Fully opaque
          zIndex: '5'
        },
        
        {
          selector: '#padding-test',
          top: '35%',
          left: '35%',
          height: '25%',
          width: '25%',
          background: '#FFA500',  // Orange
          margin: '10px',
          padding: '20px 15px 25px 30px',  // Different padding on each side
          borderWidth: '1px',
          borderColor: '#FF4500',  // Red-orange border
          borderStyle: 'solid',
          opacity: '1.0',  // Make fully opaque for now
          zIndex: '8'
        },
        
        {
          selector: '#transparency-test',
          top: '35%',
          left: '65%',
          height: '25%',
          width: '25%',
          background: '#00FFFF',  // Cyan
          margin: '5px',
          padding: '5px',
          borderWidth: '3px',
          borderColor: '#008B8B',  // Dark cyan border
          borderStyle: 'solid',
          opacity: '1.0',  // Make fully opaque since it's not overlapping
          zIndex: '12'
        },
        
        // Bottom row: Testing hover states and negative z-index
        {
          selector: '#hover-test',
          top: '70%',
          left: '10%',
          height: '20%',
          width: '35%',
          background: '#FFFF00',  // Bright yellow
          margin: '8px',
          padding: '12px',
          borderWidth: '2px',
          borderColor: '#FFD700',  // Gold border
          borderStyle: 'solid',
          opacity: '1.0',  // Make fully opaque for now
          zIndex: '6'
        },
        
        {
          selector: '#hover-test:hover',
          background: '#32CD32',  // Lime green on hover - very different from yellow
          borderColor: '#228B22',  // Forest green border
          borderWidth: '4px',  // Thicker border on hover
          opacity: '1.0',  // Make fully opaque for hover
          zIndex: '25'  // Jump to front on hover
        },
        
        {
          selector: '#negative-z-test',
          top: '70%',
          left: '55%',
          height: '20%',
          width: '35%',
          background: '#FF1493',  // Deep pink
          margin: '10px',
          padding: '8px',
          borderWidth: '5px',
          borderColor: '#8B008B',  // Dark magenta border
          borderStyle: 'solid',
          opacity: '0.9',  // More moderate transparency
          zIndex: '30'  // Temporarily put in front to verify it exists
        },
        
        // Nested element to test inheritance and layering within containers
        {
          selector: '#nested-in-margin',
          top: '20%',
          left: '20%',
          height: '40%',
          width: '60%',
          background: '#87CEEB',  // Sky blue
          margin: '5px',
          borderWidth: '1px',
          borderColor: '#4169E1',  // Royal blue border
          borderStyle: 'solid',
          opacity: '1.0',  // Make fully opaque for now
          zIndex: '2'  // Should respect parent's coordinate system
        }
      ],
      root: {
        children: [
          {
            type: 'div',
            id: 'container',
            children: [
              // Top row - Z-index overlap testing
              {
                type: 'div',
                id: 'overlap-test-1'
              },
              {
                type: 'div',
                id: 'overlap-test-2'
              },
              {
                type: 'div',
                id: 'overlap-test-3'
              },
              
              // Middle row - Margin, padding, transparency testing
              {
                type: 'div',
                id: 'margin-test',
                children: [
                  {
                    type: 'div',
                    id: 'nested-in-margin'
                  }
                ]
              },
              {
                type: 'div',
                id: 'padding-test'
              },
              {
                type: 'div',
                id: 'transparency-test'
              },
              
              // Bottom row - Hover and negative z-index testing
              {
                type: 'div',
                id: 'hover-test'
              },
              {
                type: 'div',
                id: 'negative-z-test'
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
