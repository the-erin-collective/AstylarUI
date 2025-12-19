import { Injectable } from '@angular/core';
import { StyleRule } from '../../types/style-rule';
import { BabylonDOM } from './interfaces/dom.types';
import { Color3 } from '@babylonjs/core';
import { DOMElement } from '../../types/dom-element';
import { BabylonRender } from './interfaces/render.types';

@Injectable({
    providedIn: 'root'
})
export class StyleService {
    public parseStyles(dom: BabylonDOM, render: BabylonRender, styles: StyleRule[]): void {
        styles.forEach(style => {
            if (style.selector.includes(':hover')) {
                // This is a hover style
                const baseSelector = style.selector.replace(':hover', '');
                const elementId = baseSelector.replace('#', '');

                if (!dom.context.elementStyles.has(elementId)) {
                    dom.context.elementStyles.set(elementId, { normal: {} as StyleRule });
                }

                dom.context.elementStyles.get(elementId)!.hover = style;
                console.log(`Parsed hover style for ${elementId}:`, style);
            } else if (style.selector.startsWith('#')) {
                // This is a normal element style
                const elementId = style.selector.replace('#', '');

                if (!dom.context.elementStyles.has(elementId)) {
                    dom.context.elementStyles.set(elementId, { normal: style });
                } else {
                    dom.context.elementStyles.get(elementId)!.normal = style;
                }
                console.log(`Parsed normal style for ${elementId}:`, style);
            }
        });
    }

    public getElementTypeDefaults(elementType: string): Partial<StyleRule> {
        const defaults: { [key: string]: Partial<StyleRule> } = {
            div: {
                // No specific defaults - pure container
            },
            section: {
                background: '#34495e',  // Medium blue-gray background (lighter than root background)
                borderWidth: '1px',
                borderColor: '#5d6d7e',
                borderStyle: 'solid',
                padding: '20px'
            },
            article: {
                background: '#27ae60',  // Green background  
                borderWidth: '1px',
                borderColor: '#2ecc71',
                borderStyle: 'solid',
                borderRadius: '8px',
                padding: '16px'
            },
            header: {
                background: '#3498db',  // Blue background
                borderWidth: '0px 0px 2px 0px',
                borderColor: '#2980b9',
                borderStyle: 'solid',
                padding: '16px'
            },
            footer: {
                background: '#95a5a6',  // Gray background
                borderWidth: '2px 0px 0px 0px',
                borderColor: '#7f8c8d',
                borderStyle: 'solid',
                padding: '12px'
            },
            nav: {
                background: '#9b59b6',  // Purple background
                borderWidth: '1px',
                borderColor: '#8e44ad',
                borderStyle: 'solid',
                borderRadius: '4px',
                padding: '8px'
            },
            main: {
                background: '#ff6b35',  // Orange background
                borderWidth: '1px',
                borderColor: '#e67e22',
                borderStyle: 'solid',
                borderRadius: '6px',
                padding: '24px'
            },
            ul: {
                background: 'transparent',  // Transparent list container
                padding: '16px',
                listStyleType: 'disc',
                listItemSpacing: '8px'
            },
            ol: {
                background: 'transparent',  // Transparent list container  
                padding: '16px',
                listStyleType: 'decimal',
                listItemSpacing: '8px'
            },
            li: {
                background: '#ecf0f1',  // Light gray background for list items
                borderWidth: '1px',
                borderColor: '#bdc3c7',
                borderStyle: 'solid',
                borderRadius: '4px',
                padding: '8px',
                marginBottom: '4px'
            },
            img: {
                // Image-specific defaults
                objectFit: 'cover', // How the image should fit within its container
                borderRadius: '0px', // Default to sharp corners
                opacity: '1.0' // Full opacity by default
            },
            a: {
                // Anchor/Link defaults - button-like styling
                background: '#3498db', // Blue background (link color)
                borderWidth: '2px',
                borderColor: '#2980b9', // Darker blue border
                borderStyle: 'solid',
                borderRadius: '6px',
                padding: '12px 16px', // More padding for button-like appearance
                opacity: '1.0',
                target: '_self' // Default to same window
            }
        };

        return defaults[elementType] || {};
    }

    public findStyleForElement(element: DOMElement, styles: StyleRule[]): StyleRule | undefined {
        if (!element.id) return undefined;
        return styles.find(style => style.selector === `#${element.id}`);
    }

    public findStyleBySelector(selector: string, styles: StyleRule[]): StyleRule | undefined {
        return styles.find(style => style.selector === selector);
    }

    public parseBackgroundColor(background?: string): Color3 {
        if (!background) {
            return new Color3(0.2, 0.2, 0.3); // Default color
        }

        const colorLower = background.toLowerCase();

        // Handle hex colors (#ff0000, #f00)
        if (colorLower.startsWith('#')) {
            return this.parseHexColor(colorLower);
        }

        // Handle named colors
        const namedColors: { [key: string]: Color3 } = {
            'red': new Color3(1, 0, 0),
            'green': new Color3(0, 1, 0),
            'blue': new Color3(0, 0, 1),
            'yellow': new Color3(1, 1, 0),
            'purple': new Color3(0.5, 0, 0.5),
            'orange': new Color3(1, 0.5, 0),
            'pink': new Color3(1, 0.75, 0.8),
            'cyan': new Color3(0, 1, 1),
            'magenta': new Color3(1, 0, 1),
            'white': new Color3(1, 1, 1),
            'black': new Color3(0, 0, 0),
            'gray': new Color3(0.5, 0.5, 0.5),
            'grey': new Color3(0.5, 0.5, 0.5),
        };

        if (namedColors[colorLower]) {
            return namedColors[colorLower];
        }

        // Fallback to default
        return new Color3(0.2, 0.2, 0.3);
    }

    private parseHexColor(hex: string): Color3 {
        hex = hex.substring(1); // Remove #

        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }

        if (hex.length !== 6) {
            return new Color3(0.2, 0.2, 0.3);
        }

        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        return new Color3(r, g, b);
    }

    public parseOpacity(opacityValue: string | undefined): number {
        if (!opacityValue) return 1.0;

        const opacity = parseFloat(opacityValue);
        // Clamp opacity between 0.0 and 1.0
        return Math.max(0.0, Math.min(1.0, opacity));
    }
} 