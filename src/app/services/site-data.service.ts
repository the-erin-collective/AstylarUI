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
          background: '#2c3e50'
        },

        // ADVANCED FEATURES TEST: Evenly spaced element types with overlapping instances

        // === SECTION ELEMENTS (Left Column) ===
        // Background section with borders and box shadow
        {
          selector: '#section-back',
          top: '20%',
          left: '5%',
          height: '40%',
          width: '25%',
          zIndex: '1',
          borderWidth: '3px',
          borderColor: '#e74c3c',
          borderStyle: 'solid',
          boxShadow: '8px 8px 16px rgba(0,0,0,0.4)',
          // section gets dark blue background from type defaults
        },

        // Overlapping front section with opacity and border radius
        {
          selector: '#section-front',
          top: '30%',
          left: '15%',
          height: '35%',
          width: '20%',
          zIndex: '3',
          opacity: '0.9',
          borderRadius: '12px',
          borderWidth: '2px',
          borderColor: '#c0392b',
          borderStyle: 'dashed'
          // section gets dark blue background from type defaults
        },

        // Hover states for sections
        {
          selector: '#section-back:hover',
          background: '#e74c3c',
          borderColor: '#a93226',
          boxShadow: '12px 12px 24px rgba(0,0,0,0.6)'
        },

        {
          selector: '#section-front:hover',
          opacity: '1.0',
          background: '#c0392b',
          borderRadius: '18px',
          borderStyle: 'solid'
        },

        // === ARTICLE ELEMENTS (Center Column) ===
        // Background article with gradient and shadow
        {
          selector: '#article-back',
          top: '20%',      // Consistent with other back elements
          left: '37.5%',
          height: '40%',   // Consistent with other back elements  
          width: '25%',
          zIndex: '2',
          background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
          borderRadius: '8px',
          boxShadow: '6px 6px 12px rgba(39,174,96,0.3)'
        },

        // Overlapping front article with opacity and different styling
        {
          selector: '#article-front',
          top: '30%',      // Consistent 10% offset from back element
          left: '47.5%',   // Consistent 10% offset from back element
          height: '35%',   // Consistent with other front elements
          width: '20%',
          zIndex: '4',
          opacity: '0.8',
          borderRadius: '15px',
          borderWidth: '2px',
          borderColor: '#f39c12',
          borderStyle: 'dotted'
          // article gets green background from type defaults
        },

        // Hover states for articles
        {
          selector: '#article-back:hover',
          background: 'linear-gradient(135deg, #229954, #28b463)',
          boxShadow: '10px 10px 20px rgba(39,174,96,0.5)',
          borderRadius: '12px'
        },

        {
          selector: '#article-front:hover',
          opacity: '1.0',
          background: '#f39c12',
          borderColor: '#e67e22',
          borderStyle: 'solid',
          borderRadius: '20px'
        },

        // === HEADER ELEMENTS (Right Column) ===
        // Background header with borders
        {
          selector: '#header-back',
          top: '20%',
          left: '70%',
          height: '40%',
          width: '25%',
          zIndex: '1',
          borderWidth: '4px',
          borderColor: '#2980b9',
          borderStyle: 'double',
          boxShadow: '5px 5px 15px rgba(52,152,219,0.4)'
          // header gets blue background from type defaults
        },

        // Overlapping front header with gradient and opacity
        {
          selector: '#header-front',
          top: '30%',      // Consistent 10% offset from back element
          left: '80%',     // Consistent 10% offset from back element (70% + 10%)
          height: '35%',   // Consistent with other front elements
          width: '20%',
          zIndex: '5',
          opacity: '0.85',
          background: 'radial-gradient(circle, #3498db, #5dade2)',
          borderRadius: '10px',
          borderWidth: '1px',
          borderColor: '#85c1e9',
          borderStyle: 'solid'
        },

        // Hover states for headers
        {
          selector: '#header-back:hover',
          background: '#3498db',
          borderColor: '#1b4f72',
          boxShadow: '8px 8px 20px rgba(52,152,219,0.6)'
        },

        {
          selector: '#header-front:hover',
          opacity: '1.0',
          background: 'radial-gradient(circle, #2980b9, #3498db)',
          borderRadius: '15px',
          borderColor: '#2980b9'
        }
      ],
      root: {
        children: [
          // Section elements (left column)
          {
            type: 'section',
            id: 'section-back'
          },
          {
            type: 'section',
            id: 'section-front'
          },
          // Article elements (center column)
          {
            type: 'article',
            id: 'article-back'
          },
          {
            type: 'article',
            id: 'article-front'
          },
          // Header elements (right column)
          {
            type: 'header',
            id: 'header-back'
          },
          {
            type: 'header',
            id: 'header-front'
          }
        ]
      }
    },

    // LIST ELEMENTS TEST SITE
    lists: {
      styles: [
        {
          selector: 'root',
          background: '#2c3e50'
        },

        // === UNORDERED LIST (Left Side) ===
        {
          selector: '#unordered-list',
          top: '10%',
          left: '5%',
          width: '40%',
          height: '85%',
          background: 'rgba(52, 73, 94, 0.3)', // Semi-transparent background to see the container
          borderRadius: '8px',
          padding: '20px',
          listItemSpacing: '4px' // Reduced spacing to fit more items
        },

        // List items for unordered list (will be automatically positioned)
        {
          selector: '#ul-item-1',
          // No positioning needed - automatic stacking
        },
        {
          selector: '#ul-item-2',
          background: '#3498db', // Custom background for variety
        },
        {
          selector: '#ul-item-3',
          borderColor: '#e74c3c',
          borderWidth: '2px'
        },

        // === ORDERED LIST (Right Side) ===
        {
          selector: '#ordered-list',
          top: '10%',
          left: '55%',
          width: '40%',
          height: '85%',
          background: 'rgba(142, 68, 173, 0.3)', // Purple semi-transparent background
          borderRadius: '8px',
          padding: '20px',
          listItemSpacing: '4px' // Reduced spacing to fit more items
        },

        // List items for ordered list (will be automatically positioned)
        {
          selector: '#ol-item-1',
          background: '#e67e22', // Orange background
        },
        {
          selector: '#ol-item-2',
          // Default list item styling
        },
        {
          selector: '#ol-item-3',
          background: '#27ae60', // Green background
          opacity: '0.8'
        },
        {
          selector: '#ol-item-4',
          background: '#f39c12', // Yellow background
          borderRadius: '12px'
        }
      ],
      root: {
        children: [
          // Unordered list container
          {
            type: 'ul',
            id: 'unordered-list',
            children: [
              {
                type: 'li',
                id: 'ul-item-1'
              },
              {
                type: 'li',
                id: 'ul-item-2'
              },
              {
                type: 'li',
                id: 'ul-item-3'
              }
            ]
          },
          // Ordered list container
          {
            type: 'ol',
            id: 'ordered-list',
            children: [
              {
                type: 'li',
                id: 'ol-item-1'
              },
              {
                type: 'li',
                id: 'ol-item-2'
              },
              {
                type: 'li',
                id: 'ol-item-3'
              },
              {
                type: 'li',
                id: 'ol-item-4'
              }
            ]
          }
        ]
      }
    },

    // Add other required sites with minimal data
    settings: {
      styles: [
        {
          selector: 'root',
          background: '#34495e'
        }
      ],
      root: {
        children: []
      }
    },

    // IMAGE ELEMENTS TEST SITE
    images: {
      styles: [
        {
          selector: 'root',
          background: '#1a1a2e' // Dark blue background to make images stand out
        },

        // Portrait image (left side)
        {
          selector: '#portrait-image',
          top: '10%',
          left: '10%',
          width: '35%',
          height: '70%',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          opacity: '1.0', // Full opacity initially
          src: '/images/dark-brown-wood-texture-background-with-design-space.jpg'
        },

        {
          selector: '#portrait-image:hover',
          opacity: '0.7', // Reduced opacity on hover
          transform: 'scale(1.02)', // Slight scale effect
          boxShadow: '0 8px 16px rgba(0,0,0,0.5)'
        },

        // Landscape image (right side)
        {
          selector: '#landscape-image',
          top: '20%',
          left: '55%',
          width: '40%',
          height: '50%',
          borderRadius: '12px',
          boxShadow: '0 6px 12px rgba(0,0,0,0.4)',
          opacity: '1.0', // Full opacity initially
          src: '/images/abstract-gray-oil-paint-textured-background.jpg'
        },

        {
          selector: '#landscape-image:hover',
          opacity: '0.7', // Reduced opacity on hover
          transform: 'scale(1.05)', // More pronounced scale effect
          boxShadow: '0 12px 24px rgba(0,0,0,0.6)'
        },

        // Small circular image (bottom center)
        {
          selector: '#circular-image',
          top: '75%',
          left: '42.5%',
          width: '15%',
          height: '20%',
          borderRadius: '50%', // Make it circular
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          opacity: '1.0',
          src: '/images/abstract-gray-oil-paint-textured-background.jpg'
        },

        {
          selector: '#circular-image:hover',
          opacity: '0.6', // More dramatic opacity change
          transform: 'scale(1.1) rotate(5deg)', // Scale and slight rotation
          boxShadow: '0 8px 16px rgba(255,255,255,0.2)'
        }
      ],
      root: {
        children: [
          {
            type: 'img',
            id: 'portrait-image'
          },
          {
            type: 'img',
            id: 'landscape-image'
          },
          {
            type: 'img',
            id: 'circular-image'
          }
        ]
      }
    },

    links: {
      styles: [
        {
          selector: 'root',
          background: '#2c3e50' // Dark blue-gray background
        },

        // Relative link (same window) - top-left
        {
          selector: '#relative-link',
          top: '15%',
          left: '10%',
          width: '25%',
          height: '12%',
          href: '/site/about', // Relative URL to another site
          target: '_self'
        },

        {
          selector: '#relative-link:hover',
          background: '#2980b9', // Lighter blue on hover
          borderColor: '#3498db',
          transform: 'scale(1.05)'
        },

        // Absolute link (new window) - top-center
        {
          selector: '#absolute-link',
          top: '15%',
          left: '40%',
          width: '25%',
          height: '12%',
          href: 'https://www.example.com',
          target: '_blank'
        },

        {
          selector: '#absolute-link:hover',
          background: '#27ae60', // Green on hover
          borderColor: '#2ecc71',
          transform: 'scale(1.05)'
        },

        // OnClick handler (no navigation) - top-right
        {
          selector: '#onclick-link',
          top: '15%',
          left: '70%',
          width: '25%',
          height: '12%',
          onclick: 'console.log("Custom button clicked!")',
          background: '#e67e22', // Orange background
          borderColor: '#d35400'
        },

        {
          selector: '#onclick-link:hover',
          background: '#f39c12', // Lighter orange on hover
          borderColor: '#e67e22',
          transform: 'scale(1.05)'
        },

        // Combined href + onclick - middle-left
        {
          selector: '#combined-link',
          top: '40%',
          left: '10%',
          width: '25%',
          height: '12%',
          href: '/site/images',
          target: '_self',
          onclick: 'console.log("Combined link clicked before navigation")',
          background: '#9b59b6', // Purple background
          borderColor: '#8e44ad'
        },

        {
          selector: '#combined-link:hover',
          background: '#be7bd9', // Lighter purple on hover
          borderColor: '#9b59b6',
          transform: 'scale(1.05)'
        },

        // External site (new window) - middle-center
        {
          selector: '#external-link',
          top: '40%',
          left: '40%',
          width: '25%',
          height: '12%',
          href: 'https://babylonjs.com',
          target: '_blank',
          background: '#e74c3c', // Red background
          borderColor: '#c0392b'
        },

        {
          selector: '#external-link:hover',
          background: '#ec7063', // Lighter red on hover
          borderColor: '#e74c3c',
          transform: 'scale(1.05)'
        },

        // Same window absolute - middle-right
        {
          selector: '#same-window-absolute',
          top: '40%',
          left: '70%',
          width: '25%',
          height: '12%',
          href: 'https://developer.mozilla.org',
          target: '_self', // Same window even for absolute URL
          background: '#34495e', // Dark gray background
          borderColor: '#2c3e50'
        },

        {
          selector: '#same-window-absolute:hover',
          background: '#5d6d7e', // Lighter gray on hover
          borderColor: '#34495e',
          transform: 'scale(1.05)'
        }
      ],
      root: {
        children: [
          {
            type: 'a',
            id: 'relative-link'
          },
          {
            type: 'a',
            id: 'absolute-link'
          },
          {
            type: 'a',
            id: 'onclick-link'
          },
          {
            type: 'a',
            id: 'combined-link'
          },
          {
            type: 'a',
            id: 'external-link'
          },
          {
            type: 'a',
            id: 'same-window-absolute'
          }
        ]
      }
    },

    about: {
      styles: [
        {
          selector: 'root',
          background: '#2c3e50'
        }
      ],
      root: {
        children: []
      }
    },

    flexbox: {
      styles: [
        {
          selector: 'root',
          background: '#2c3e50'
        },

        // === ROW 1: SPACE-BETWEEN LAYOUTS ===

        // Flex container - horizontal space-between (small items)
        {
          selector: '#flex-container-sb-small',
          top: '5%',
          left: '5%',
          width: '40%',
          height: '18%',
          background: '#34495e',
          borderWidth: '2px',
          borderColor: '#5d6d7e',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        },

        // Small flex items
        {
          selector: '#flex-sb-small-1',
          background: '#e74c3c', // Red
          borderWidth: '2px',
          borderColor: '#c0392b',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '15%'
        },
        {
          selector: '#flex-sb-small-2',
          background: '#f39c12', // Orange
          borderWidth: '2px',
          borderColor: '#e67e22',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '20%'
        },
        {
          selector: '#flex-sb-small-3',
          background: '#27ae60', // Green
          borderWidth: '2px',
          borderColor: '#2ecc71',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '12%'
        },
        {
          selector: '#flex-sb-small-4',
          background: '#3498db', // Blue
          borderWidth: '2px',
          borderColor: '#2980b9',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '18%'
        },

        // Flex container - horizontal space-between (large items)
        {
          selector: '#flex-container-sb-large',
          top: '5%',
          left: '55%',
          width: '40%',
          height: '18%',
          background: '#8e44ad',
          borderWidth: '2px',
          borderColor: '#9b59b6',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        },

        // Large flex items
        {
          selector: '#flex-sb-large-1',
          background: '#e91e63', // Pink
          borderWidth: '2px',
          borderColor: '#c2185b',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '25%'
        },
        {
          selector: '#flex-sb-large-2',
          background: '#ff9800', // Deep Orange
          borderWidth: '2px',
          borderColor: '#f57c00',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '35%'
        },
        {
          selector: '#flex-sb-large-3',
          background: '#9c27b0', // Purple
          borderWidth: '2px',
          borderColor: '#7b1fa2',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '20%'
        },

        // === ROW 2: JUSTIFY-CONTENT VARIATIONS ===

        // Flex container - flex-start alignment
        {
          selector: '#flex-container-start',
          top: '28%',
          left: '5%',
          width: '28%',
          height: '18%',
          background: '#16a085',
          borderWidth: '2px',
          borderColor: '#1abc9c',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center'
        },

        // Flex-start items
        {
          selector: '#flex-start-1',
          background: '#f1c40f', // Yellow
          borderWidth: '2px',
          borderColor: '#f39c12',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '25%'
        },
        {
          selector: '#flex-start-2',
          background: '#e67e22', // Orange
          borderWidth: '2px',
          borderColor: '#d35400',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '20%'
        },

        // Flex container - center alignment
        {
          selector: '#flex-container-center',
          top: '28%',
          left: '36%',
          width: '28%',
          height: '18%',
          background: '#2c3e50',
          borderWidth: '2px',
          borderColor: '#34495e',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center'
        },

        // Centered flex items
        {
          selector: '#flex-center-1',
          background: '#95a5a6', // Gray
          borderWidth: '2px',
          borderColor: '#7f8c8d',
          borderStyle: 'solid',
          borderRadius: '50%', // Circular
          flexBasis: '30%'
        },
        {
          selector: '#flex-center-2',
          background: '#e74c3c', // Red
          borderWidth: '2px',
          borderColor: '#c0392b',
          borderStyle: 'solid',
          borderRadius: '50%', // Circular
          flexBasis: '25%'
        },

        // Flex container - flex-end alignment
        {
          selector: '#flex-container-end',
          top: '28%',
          left: '67%',
          width: '28%',
          height: '18%',
          background: '#c0392b',
          borderWidth: '2px',
          borderColor: '#e74c3c',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center'
        },

        // Flex-end items
        {
          selector: '#flex-end-1',
          background: '#3498db', // Blue
          borderWidth: '2px',
          borderColor: '#2980b9',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '22%'
        },
        {
          selector: '#flex-end-2',
          background: '#27ae60', // Green
          borderWidth: '2px',
          borderColor: '#2ecc71',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '28%'
        },

        // === ROW 3: VERTICAL LAYOUTS ===

        // Vertical flex container - space-between
        {
          selector: '#flex-container-v-sb',
          top: '51%',
          left: '5%',
          width: '18%',
          height: '44%',
          background: '#8e44ad',
          borderWidth: '2px',
          borderColor: '#9b59b6',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'stretch'
        },

        // Vertical space-between items
        {
          selector: '#flex-v-sb-1',
          background: '#e74c3c', // Red
          borderWidth: '2px',
          borderColor: '#c0392b',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '20%'
        },
        {
          selector: '#flex-v-sb-2',
          background: '#f39c12', // Orange
          borderWidth: '2px',
          borderColor: '#e67e22',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '15%'
        },
        {
          selector: '#flex-v-sb-3',
          background: '#27ae60', // Green
          borderWidth: '2px',
          borderColor: '#2ecc71',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '25%'
        },

        // Vertical flex container - center
        {
          selector: '#flex-container-v-center',
          top: '51%',
          left: '26%',
          width: '18%',
          height: '44%',
          background: '#16a085',
          borderWidth: '2px',
          borderColor: '#1abc9c',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        },

        // Vertical centered items
        {
          selector: '#flex-v-center-1',
          background: '#3498db', // Blue
          borderWidth: '2px',
          borderColor: '#2980b9',
          borderStyle: 'solid',
          borderRadius: '50%', // Circular
          flexBasis: '25%'
        },
        {
          selector: '#flex-v-center-2',
          background: '#e91e63', // Pink
          borderWidth: '2px',
          borderColor: '#c2185b',
          borderStyle: 'solid',
          borderRadius: '50%', // Circular
          flexBasis: '20%'
        },

        // === ROW 3: COMPLEX NESTED LAYOUT ===

        // Outer flex container - horizontal
        {
          selector: '#flex-container-nested',
          top: '51%',
          left: '47%',
          width: '48%',
          height: '44%',
          background: '#2c3e50',
          borderWidth: '3px',
          borderColor: '#34495e',
          borderStyle: 'solid',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'stretch'
        },

        // Left column in nested container
        {
          selector: '#flex-nested-left',
          background: '#7f8c8d',
          borderWidth: '2px',
          borderColor: '#95a5a6',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '45%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        },

        // Right column in nested container
        {
          selector: '#flex-nested-right',
          background: '#d35400',
          borderWidth: '2px',
          borderColor: '#e67e22',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '45%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'stretch'
        },

        // Items inside left nested column
        {
          selector: '#flex-nested-left-1',
          background: '#f1c40f', // Yellow
          borderWidth: '1px',
          borderColor: '#f39c12',
          borderStyle: 'solid',
          borderRadius: '50%',
          flexBasis: '30%'
        },
        {
          selector: '#flex-nested-left-2',
          background: '#9b59b6', // Purple
          borderWidth: '1px',
          borderColor: '#8e44ad',
          borderStyle: 'solid',
          borderRadius: '50%',
          flexBasis: '25%'
        },

        // Items inside right nested column
        {
          selector: '#flex-nested-right-1',
          background: '#e74c3c', // Red
          borderWidth: '1px',
          borderColor: '#c0392b',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '20%'
        },
        {
          selector: '#flex-nested-right-2',
          background: '#27ae60', // Green
          borderWidth: '1px',
          borderColor: '#2ecc71',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '25%'
        },
        {
          selector: '#flex-nested-right-3',
          background: '#3498db', // Blue
          borderWidth: '1px',
          borderColor: '#2980b9',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '15%'
        }
      ],
      root: {
        children: [
          // === ROW 1: SPACE-BETWEEN LAYOUTS ===

          // Horizontal space-between (small items)
          {
            type: 'div',
            id: 'flex-container-sb-small',
            children: [
              {
                type: 'div',
                id: 'flex-sb-small-1'
              },
              {
                type: 'div',
                id: 'flex-sb-small-2'
              },
              {
                type: 'div',
                id: 'flex-sb-small-3'
              },
              {
                type: 'div',
                id: 'flex-sb-small-4'
              }
            ]
          },

          // Horizontal space-between (large items)
          {
            type: 'div',
            id: 'flex-container-sb-large',
            children: [
              {
                type: 'div',
                id: 'flex-sb-large-1'
              },
              {
                type: 'div',
                id: 'flex-sb-large-2'
              },
              {
                type: 'div',
                id: 'flex-sb-large-3'
              }
            ]
          },

          // === ROW 2: JUSTIFY-CONTENT VARIATIONS ===

          // Flex-start alignment
          {
            type: 'div',
            id: 'flex-container-start',
            children: [
              {
                type: 'div',
                id: 'flex-start-1'
              },
              {
                type: 'div',
                id: 'flex-start-2'
              }
            ]
          },

          // Center alignment
          {
            type: 'div',
            id: 'flex-container-center',
            children: [
              {
                type: 'div',
                id: 'flex-center-1'
              },
              {
                type: 'div',
                id: 'flex-center-2'
              }
            ]
          },

          // Flex-end alignment
          {
            type: 'div',
            id: 'flex-container-end',
            children: [
              {
                type: 'div',
                id: 'flex-end-1'
              },
              {
                type: 'div',
                id: 'flex-end-2'
              }
            ]
          },

          // === ROW 3: VERTICAL LAYOUTS ===

          // Vertical space-between
          {
            type: 'div',
            id: 'flex-container-v-sb',
            children: [
              {
                type: 'div',
                id: 'flex-v-sb-1'
              },
              {
                type: 'div',
                id: 'flex-v-sb-2'
              },
              {
                type: 'div',
                id: 'flex-v-sb-3'
              }
            ]
          },

          // Vertical centered
          {
            type: 'div',
            id: 'flex-container-v-center',
            children: [
              {
                type: 'div',
                id: 'flex-v-center-1'
              },
              {
                type: 'div',
                id: 'flex-v-center-2'
              }
            ]
          },

          // === COMPLEX NESTED LAYOUT ===

          // Nested flex container
          {
            type: 'div',
            id: 'flex-container-nested',
            children: [
              // Left column (nested flex container)
              {
                type: 'div',
                id: 'flex-nested-left',
                children: [
                  {
                    type: 'div',
                    id: 'flex-nested-left-1'
                  },
                  {
                    type: 'div',
                    id: 'flex-nested-left-2'
                  }
                ]
              },
              // Right column (nested flex container)
              {
                type: 'div',
                id: 'flex-nested-right',
                children: [
                  {
                    type: 'div',
                    id: 'flex-nested-right-1'
                  },
                  {
                    type: 'div',
                    id: 'flex-nested-right-2'
                  },
                  {
                    type: 'div',
                    id: 'flex-nested-right-3'
                  }
                ]
              }
            ]
          }
        ]
      }
    },

    // FLEX-WRAP TEST SITE
    flexwrap: {
      styles: [
        {
          selector: 'root',
          background: '#2c3e50'
        },

        // === TEST 1: Wrap with many items ===
        {
          selector: '#flex-wrap-container',
          top: '5%',
          left: '5%',
          width: '40%',
          height: '40%',
          background: '#34495e',
          borderWidth: '2px',
          borderColor: '#5d6d7e',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '10px' // Test gap between items
        },

        // Items that will wrap
        {
          selector: '#wrap-item-1',
          background: '#e74c3c',
          borderWidth: '2px',
          borderColor: '#c0392b',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '30%'
        },
        {
          selector: '#wrap-item-2',
          background: '#f39c12',
          borderWidth: '2px',
          borderColor: '#e67e22',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '35%'
        },
        {
          selector: '#wrap-item-3',
          background: '#27ae60',
          borderWidth: '2px',
          borderColor: '#2ecc71',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '40%'
        },
        {
          selector: '#wrap-item-4',
          background: '#3498db',
          borderWidth: '2px',
          borderColor: '#2980b9',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '25%'
        },
        {
          selector: '#wrap-item-5',
          background: '#9b59b6',
          borderWidth: '2px',
          borderColor: '#8e44ad',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '30%'
        },
        {
          selector: '#wrap-item-6',
          background: '#e91e63',
          borderWidth: '2px',
          borderColor: '#c2185b',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '45%'
        },

        // === TEST 2: Wrap-reverse ===
        {
          selector: '#flex-wrap-reverse-container',
          top: '5%',
          left: '55%',
          width: '40%',
          height: '40%',
          background: '#8e44ad',
          borderWidth: '2px',
          borderColor: '#9b59b6',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap-reverse',
          rowGap: '15px',
          columnGap: '8px' // Test separate row and column gaps
        },

        // Items for wrap-reverse
        {
          selector: '#wrap-rev-item-1',
          background: '#f1c40f',
          borderWidth: '2px',
          borderColor: '#f39c12',
          borderStyle: 'solid',
          borderRadius: '50%',
          flexBasis: '25%'
        },
        {
          selector: '#wrap-rev-item-2',
          background: '#e67e22',
          borderWidth: '2px',
          borderColor: '#d35400',
          borderStyle: 'solid',
          borderRadius: '50%',
          flexBasis: '30%'
        },
        {
          selector: '#wrap-rev-item-3',
          background: '#95a5a6',
          borderWidth: '2px',
          borderColor: '#7f8c8d',
          borderStyle: 'solid',
          borderRadius: '50%',
          flexBasis: '35%'
        },
        {
          selector: '#wrap-rev-item-4',
          background: '#16a085',
          borderWidth: '2px',
          borderColor: '#1abc9c',
          borderStyle: 'solid',
          borderRadius: '50%',
          flexBasis: '40%'
        },

        // === TEST 3: Column wrap ===
        {
          selector: '#flex-column-wrap-container',
          top: '55%',
          left: '5%',
          width: '40%',
          height: '40%',
          background: '#c0392b',
          borderWidth: '2px',
          borderColor: '#e74c3c',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          flexWrap: 'wrap',
          gap: '12px' // Test gap in column layout
        },

        // Items for column wrap
        {
          selector: '#col-wrap-item-1',
          background: '#3498db',
          borderWidth: '1px',
          borderColor: '#2980b9',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '20%'
        },
        {
          selector: '#col-wrap-item-2',
          background: '#27ae60',
          borderWidth: '1px',
          borderColor: '#2ecc71',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '25%'
        },
        {
          selector: '#col-wrap-item-3',
          background: '#f39c12',
          borderWidth: '1px',
          borderColor: '#e67e22',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '30%'
        },
        {
          selector: '#col-wrap-item-4',
          background: '#9b59b6',
          borderWidth: '1px',
          borderColor: '#8e44ad',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '35%'
        },
        {
          selector: '#col-wrap-item-5',
          background: '#e74c3c',
          borderWidth: '1px',
          borderColor: '#c0392b',
          borderStyle: 'solid',
          borderRadius: '3px',
          flexBasis: '25%'
        },

        // === TEST 4: Nowrap with overflow (comparison) ===
        {
          selector: '#flex-nowrap-container',
          top: '55%',
          left: '55%',
          width: '40%',
          height: '40%',
          background: '#16a085',
          borderWidth: '2px',
          borderColor: '#1abc9c',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'nowrap'
        },

        // Items that would overflow without wrapping
        {
          selector: '#nowrap-item-1',
          background: '#f1c40f',
          borderWidth: '2px',
          borderColor: '#f39c12',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '30%'
        },
        {
          selector: '#nowrap-item-2',
          background: '#e91e63',
          borderWidth: '2px',
          borderColor: '#c2185b',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '35%'
        },
        {
          selector: '#nowrap-item-3',
          background: '#9c27b0',
          borderWidth: '2px',
          borderColor: '#7b1fa2',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '40%'
        }
      ],
      root: {
        children: [
          // === TEST 1: Basic wrap ===
          {
            type: 'div',
            id: 'flex-wrap-container',
            children: [
              { type: 'div', id: 'wrap-item-1' },
              { type: 'div', id: 'wrap-item-2' },
              { type: 'div', id: 'wrap-item-3' },
              { type: 'div', id: 'wrap-item-4' },
              { type: 'div', id: 'wrap-item-5' },
              { type: 'div', id: 'wrap-item-6' }
            ]
          },

          // === TEST 2: Wrap-reverse ===
          {
            type: 'div',
            id: 'flex-wrap-reverse-container',
            children: [
              { type: 'div', id: 'wrap-rev-item-1' },
              { type: 'div', id: 'wrap-rev-item-2' },
              { type: 'div', id: 'wrap-rev-item-3' },
              { type: 'div', id: 'wrap-rev-item-4' }
            ]
          },

          // === TEST 3: Column wrap ===
          {
            type: 'div',
            id: 'flex-column-wrap-container',
            children: [
              { type: 'div', id: 'col-wrap-item-1' },
              { type: 'div', id: 'col-wrap-item-2' },
              { type: 'div', id: 'col-wrap-item-3' },
              { type: 'div', id: 'col-wrap-item-4' },
              { type: 'div', id: 'col-wrap-item-5' }
            ]
          },

          // === TEST 4: Nowrap comparison ===
          {
            type: 'div',
            id: 'flex-nowrap-container',
            children: [
              { type: 'div', id: 'nowrap-item-1' },
              { type: 'div', id: 'nowrap-item-2' },
              { type: 'div', id: 'nowrap-item-3' }
            ]
          }
        ]
      }
    },

    
    flexgrowshrink:
    {
      root: {
        children: [
          {
            type: 'div',
            id: 'page-container',
            children: [
              // Grow Test
              {
                type: 'div',
                id: 'grow-container',
                children: [
                  { type: 'div', id: 'g-item-1' },
                  { type: 'div', id: 'g-item-2' },
                  { type: 'div', id: 'g-item-3' },
                ],
              },
              // Shrink Test
              {
                type: 'div',
                id: 'shrink-container',
                children: [
                  { type: 'div', id: 's-item-1' },
                  { type: 'div', id: 's-item-2' },
                  { type: 'div', id: 's-item-3' },
                ],
              },
              // Mixed Test
              {
                type: 'div',
                id: 'mixed-container',
                children: [
                  { type: 'div', id: 'm-item-1' },
                  { type: 'div', id: 'm-item-2' },
                  { type: 'div', id: 'm-item-3' },
                  { type: 'div', id: 'm-item-4' },
                ],
              },
            ],
          },
        ]
      },
      styles: [
        // Page container
        {
          selector: '#page-container',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '20px',
          background: '#1a1a2e',
        },
        // General container styles
        {
          selector: '#grow-container, #shrink-container, #mixed-container',
          height: '100px',
          background: '#22223b',
          borderWidth: '2px',
          borderColor: '#4a5568',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          padding: '10px',
          gap: '10px',
        },
        // General item styles
        {
          selector:
            '#grow-container > div, #shrink-container > div, #mixed-container > div',
          borderWidth: '1px',
          borderColor: '#c1121f',
          borderStyle: 'solid',
          borderRadius: '4px',
        },
        // --- Grow Test ---
        {
          selector: '#grow-container',
          width: '600px',
        },
        {
          selector: '#g-item-1',
          background: '#f94144',
          flexGrow: '1',
          flexBasis: '80px',
        },
        {
          selector: '#g-item-2',
          background: '#f3722c',
          flexGrow: '2',
          flexBasis: '80px',
        },
        {
          selector: '#g-item-3',
          background: '#f8961e',
          flexGrow: '1',
          flexBasis: '80px',
        },
        // --- Shrink Test ---
        {
          selector: '#shrink-container',
          width: '400px',
        },
        {
          selector: '#s-item-1',
          background: '#90be6d',
          flexShrink: '1',
          flexBasis: '200px',
        },
        {
          selector: '#s-item-2',
          background: '#43aa8b',
          flexShrink: '2',
          flexBasis: '200px',
        },
        {
          selector: '#s-item-3',
          background: '#4d908e',
          flexShrink: '0', // Should not shrink
          flexBasis: '100px',
        },
        // --- Mixed Test ---
        {
          selector: '#mixed-container',
          width: '600px',
        },
        { selector: '#m-item-1', background: '#577590', flex: '1 1 100px' },
        { selector: '#m-item-2', background: '#277da1', flex: '2 1 100px' },
        { selector: '#m-item-3', background: '#f9c74f', flex: '0 0 250px' },
        { selector: '#m-item-4', background: '#f9844a', flexBasis: '100px' },
      ]
    },

    // FLEXBOX GAP FEATURES TEST SITE
    flexgap: {
      styles: [
        {
          selector: 'root',
          background: '#1a202c'
        },

        // === TEST 1: Basic Gap Property ===
        {
          selector: '#basic-gap-container',
          top: '2%',
          left: '2%',
          width: '46%',
          height: '22%',
          background: '#2d3748',
          borderWidth: '2px',
          borderColor: '#4a5568',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: '15px' // Basic gap between items
        },
        {
          selector: '#basic-item-1',
          background: '#3182ce',
          borderWidth: '1px',
          borderColor: '#2c5282',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '80px'
        },
        {
          selector: '#basic-item-2',
          background: '#38a169',
          borderWidth: '1px',
          borderColor: '#2f855a',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '100px'
        },
        {
          selector: '#basic-item-3',
          background: '#d69e2e',
          borderWidth: '1px',
          borderColor: '#b7791f',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '90px'
        },

        // === TEST 2: Row-Gap vs Column-Gap ===
        {
          selector: '#separate-gaps-container',
          top: '2%',
          left: '52%',
          width: '46%',
          height: '22%',
          background: '#744210',
          borderWidth: '2px',
          borderColor: '#975a16',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          rowGap: '20px',    // Large gap between rows
          columnGap: '8px'   // Small gap between columns
        },
        {
          selector: '#sep-item-1',
          background: '#f56565',
          borderWidth: '1px',
          borderColor: '#e53e3e',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '45%'
        },
        {
          selector: '#sep-item-2',
          background: '#ed8936',
          borderWidth: '1px',
          borderColor: '#dd6b20',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '45%'
        },
        {
          selector: '#sep-item-3',
          background: '#9f7aea',
          borderWidth: '1px',
          borderColor: '#805ad5',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '45%'
        },
        {
          selector: '#sep-item-4',
          background: '#4fd1c7',
          borderWidth: '1px',
          borderColor: '#38b2ac',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '45%'
        },

        // === TEST 3: Column Layout with Gap ===
        {
          selector: '#column-gap-container',
          top: '28%',
          left: '2%',
          width: '22%',
          height: '46%',
          background: '#553c9a',
          borderWidth: '2px',
          borderColor: '#6b46c1',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          flexWrap: 'nowrap',
          gap: '12px' // Gap between column items
        },
        {
          selector: '#col-item-1',
          background: '#ec4899',
          borderWidth: '1px',
          borderColor: '#db2777',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '60px'
        },
        {
          selector: '#col-item-2',
          background: '#06b6d4',
          borderWidth: '1px',
          borderColor: '#0891b2',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '80px'
        },
        {
          selector: '#col-item-3',
          background: '#10b981',
          borderWidth: '1px',
          borderColor: '#059669',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '70px'
        },
        {
          selector: '#col-item-4',
          background: '#f59e0b',
          borderWidth: '1px',
          borderColor: '#d97706',
          borderStyle: 'solid',
          borderRadius: '6px',
          flexBasis: '50px'
        },

        // === TEST 4: Gap with Different Justify-Content Values ===
        {
          selector: '#justify-gap-container',
          top: '28%',
          left: '28%',
          width: '70%',
          height: '22%',
          background: '#92400e',
          borderWidth: '2px',
          borderColor: '#a16207',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: '10px' // Gap with space-between
        },
        {
          selector: '#just-item-1',
          background: '#7c3aed',
          borderWidth: '2px',
          borderColor: '#5b21b6',
          borderStyle: 'solid',
          borderRadius: '8px',
          flexBasis: '80px'
        },
        {
          selector: '#just-item-2',
          background: '#dc2626',
          borderWidth: '2px',
          borderColor: '#991b1b',
          borderStyle: 'solid',
          borderRadius: '8px',
          flexBasis: '80px'
        },
        {
          selector: '#just-item-3',
          background: '#059669',
          borderWidth: '2px',
          borderColor: '#047857',
          borderStyle: 'solid',
          borderRadius: '8px',
          flexBasis: '80px'
        },

        // === TEST 5: Large Gap with Wrap ===
        {
          selector: '#large-gap-container',
          top: '54%',
          left: '28%',
          width: '70%',
          height: '22%',
          background: '#134e4a',
          borderWidth: '2px',
          borderColor: '#0f766e',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '25px' // Large gap to test spacing
        },
        {
          selector: '#large-item-1',
          background: '#fbbf24',
          borderWidth: '2px',
          borderColor: '#f59e0b',
          borderStyle: 'solid',
          borderRadius: '12px',
          flexBasis: '100px'
        },
        {
          selector: '#large-item-2',
          background: '#f472b6',
          borderWidth: '2px',
          borderColor: '#ec4899',
          borderStyle: 'solid',
          borderRadius: '12px',
          flexBasis: '120px'
        },
        {
          selector: '#large-item-3',
          background: '#34d399',
          borderWidth: '2px',
          borderColor: '#10b981',
          borderStyle: 'solid',
          borderRadius: '12px',
          flexBasis: '110px'
        },
        {
          selector: '#large-item-4',
          background: '#60a5fa',
          borderWidth: '2px',
          borderColor: '#3b82f6',
          borderStyle: 'solid',
          borderRadius: '12px',
          flexBasis: '90px'
        },

        // === TEST 6: No Gap Comparison ===
        {
          selector: '#no-gap-container',
          top: '80%',
          left: '2%',
          width: '96%',
          height: '18%',
          background: '#7f1d1d',
          borderWidth: '2px',
          borderColor: '#991b1b',
          borderStyle: 'solid',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          flexWrap: 'wrap'
          // No gap property - items will be tightly packed
        },
        {
          selector: '#nogap-item-1',
          background: '#1e40af',
          borderWidth: '1px',
          borderColor: '#1d4ed8',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '120px'
        },
        {
          selector: '#nogap-item-2',
          background: '#be185d',
          borderWidth: '1px',
          borderColor: '#c2185b',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '100px'
        },
        {
          selector: '#nogap-item-3',
          background: '#166534',
          borderWidth: '1px',
          borderColor: '#15803d',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '140px'
        },
        {
          selector: '#nogap-item-4',
          background: '#a16207',
          borderWidth: '1px',
          borderColor: '#ca8a04',
          borderStyle: 'solid',
          borderRadius: '4px',
          flexBasis: '110px'
        }
      ],

      root: {
        children: [
          // === TEST 1: Basic Gap ===
          {
            type: 'div',
            id: 'basic-gap-container',
            children: [
              { type: 'div', id: 'basic-item-1' },
              { type: 'div', id: 'basic-item-2' },
              { type: 'div', id: 'basic-item-3' }
            ]
          },

          // === TEST 2: Separate Row/Column Gaps ===
          {
            type: 'div',
            id: 'separate-gaps-container',
            children: [
              { type: 'div', id: 'sep-item-1' },
              { type: 'div', id: 'sep-item-2' },
              { type: 'div', id: 'sep-item-3' },
              { type: 'div', id: 'sep-item-4' }
            ]
          },

          // === TEST 3: Column Layout ===
          {
            type: 'div',
            id: 'column-gap-container',
            children: [
              { type: 'div', id: 'col-item-1' },
              { type: 'div', id: 'col-item-2' },
              { type: 'div', id: 'col-item-3' },
              { type: 'div', id: 'col-item-4' }
            ]
          },

          // === TEST 4: Gap with Justify-Content ===
          {
            type: 'div',
            id: 'justify-gap-container',
            children: [
              { type: 'div', id: 'just-item-1' },
              { type: 'div', id: 'just-item-2' },
              { type: 'div', id: 'just-item-3' }
            ]
          },

          // === TEST 5: Large Gap with Wrap ===
          {
            type: 'div',
            id: 'large-gap-container',
            children: [
              { type: 'div', id: 'large-item-1' },
              { type: 'div', id: 'large-item-2' },
              { type: 'div', id: 'large-item-3' },
              { type: 'div', id: 'large-item-4' }
            ]
          },

          // === TEST 6: No Gap Comparison ===
          {
            type: 'div',
            id: 'no-gap-container',
            children: [
              { type: 'div', id: 'nogap-item-1' },
              { type: 'div', id: 'nogap-item-2' },
              { type: 'div', id: 'nogap-item-3' },
              { type: 'div', id: 'nogap-item-4' }
            ]
          }
        ]
      }
    }
  };

  getSiteData(siteName: string): SiteData | undefined {
    return this.siteData[siteName];
  }

  hasSiteData(siteName: string): boolean {
    return siteName in this.siteData;
  }

  getAllSiteNames(): string[] {
    return Object.keys(this.siteData);
  }
}
