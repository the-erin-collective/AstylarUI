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
    /**
     * Parses the align-content property for flex containers
     * @param value The align-content value to parse
     * @returns The normalized align-content value
     */
    public parseAlignContent(value: string | undefined): string {
        if (!value) {
            return 'stretch'; // Default value per CSS spec
        }

        const validValues = [
            'flex-start',
            'flex-end',
            'center',
            'space-between',
            'space-around',
            'space-evenly',
            'stretch'
        ];

        const normalizedValue = value.trim().toLowerCase();
        
        // Check if the value is valid
        if (validValues.includes(normalizedValue)) {
            return normalizedValue;
        }

        console.warn(`Invalid align-content value: "${value}". Using default "stretch" instead.`);
        return 'stretch'; // Default to stretch for invalid values
    }
    
    /**
     * Parses the flex-grow property for flex items
     * @param value The flex-grow value to parse
     * @returns The normalized flex-grow value
     */
    public parseFlexGrow(value: string | undefined): number {
        if (!value) {
            return 0; // Default value per CSS spec
        }

        const parsedValue = parseFloat(value.trim());
        
        // Check if the value is a valid number
        if (!isNaN(parsedValue) && parsedValue >= 0) {
            return parsedValue;
        }

        console.warn(`Invalid flex-grow value: "${value}". Using default "0" instead.`);
        return 0; // Default to 0 for invalid values
    }

    /**
     * Parses the flex-shrink property for flex items
     * @param value The flex-shrink value to parse
     * @returns The normalized flex-shrink value
     */
    public parseFlexShrink(value: string | undefined): number {
        if (!value) {
            return 1; // Default value per CSS spec
        }

        const parsedValue = parseFloat(value.trim());
        
        // Check if the value is a valid number
        if (!isNaN(parsedValue) && parsedValue >= 0) {
            return parsedValue;
        }

        console.warn(`Invalid flex-shrink value: "${value}". Using default "1" instead.`);
        return 1; // Default to 1 for invalid values
    }

    /**
     * Parses the flex-basis property for flex items
     * @param value The flex-basis value to parse
     * @returns The normalized flex-basis value
     */
    public parseFlexBasis(value: string | undefined): string {
        if (!value) {
            return 'auto'; // Default value per CSS spec
        }

        const normalizedValue = value.trim().toLowerCase();
        
        // Check if the value is 'auto' or 'content'
        if (normalizedValue === 'auto' || normalizedValue === 'content') {
            return normalizedValue;
        }
        
        // Check if the value is a valid CSS dimension (e.g., 10px, 50%, 2em)
        const dimensionRegex = /^(0|[1-9]\d*)(px|%|em|rem|vh|vw)$/;
        if (dimensionRegex.test(normalizedValue)) {
            return normalizedValue;
        }
        
        // Check if the value is just a number (interpreted as pixels)
        const numberRegex = /^(0|[1-9]\d*)$/;
        if (numberRegex.test(normalizedValue)) {
            return `${normalizedValue}px`;
        }

        console.warn(`Invalid flex-basis value: "${value}". Using default "auto" instead.`);
        return 'auto'; // Default to auto for invalid values
    }
    
    /**
     * Parses the flex shorthand property for flex items
     * @param value The flex shorthand value to parse
     * @returns An object containing the parsed flex-grow, flex-shrink, and flex-basis values
     */
    public parseFlexShorthand(value: string | undefined): { flexGrow: number; flexShrink: number; flexBasis: string } {
        if (!value) {
            return { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' }; // Default values per CSS spec
        }

        const normalizedValue = value.trim().toLowerCase();
        
        // Handle keyword values
        if (normalizedValue === 'initial') {
            return { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' };
        }
        
        if (normalizedValue === 'auto') {
            return { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' };
        }
        
        if (normalizedValue === 'none') {
            return { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' };
        }
        
        // Split the value by spaces to handle different syntaxes
        const parts = normalizedValue.split(/\s+/).filter(part => part.length > 0);
        
        // Handle single-value syntax (flex: 1)
        if (parts.length === 1) {
            const flexGrow = parseFloat(parts[0]);
            if (!isNaN(flexGrow) && flexGrow >= 0) {
                return { flexGrow, flexShrink: 1, flexBasis: '0%' };
            }
        }
        
        // Handle two-value syntax (flex: 1 2)
        if (parts.length === 2) {
            const flexGrow = parseFloat(parts[0]);
            
            // Check if the second part is a number (flex-shrink) or a dimension (flex-basis)
            if (!isNaN(parseFloat(parts[1]))) {
                const flexShrink = parseFloat(parts[1]);
                if (!isNaN(flexGrow) && !isNaN(flexShrink) && flexGrow >= 0 && flexShrink >= 0) {
                    return { flexGrow, flexShrink, flexBasis: '0%' };
                }
            } else {
                // Second part is a flex-basis value
                const flexBasis = this.parseFlexBasis(parts[1]);
                if (!isNaN(flexGrow) && flexGrow >= 0) {
                    return { flexGrow, flexShrink: 1, flexBasis };
                }
            }
        }
        
        // Handle three-value syntax (flex: 1 2 10px)
        if (parts.length === 3) {
            const flexGrow = parseFloat(parts[0]);
            const flexShrink = parseFloat(parts[1]);
            const flexBasis = this.parseFlexBasis(parts[2]);
            
            if (!isNaN(flexGrow) && !isNaN(flexShrink) && flexGrow >= 0 && flexShrink >= 0) {
                return { flexGrow, flexShrink, flexBasis };
            }
        }
        
        console.warn(`Invalid flex shorthand value: "${value}". Using default values instead.`);
        return { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' }; // Default to initial values for invalid input
    }
    
    /**
     * Parses the align-self property for flex items
     * @param value The align-self value to parse
     * @returns The normalized align-self value
     */
    public parseAlignSelf(value: string | undefined): string {
        if (!value) {
            return 'auto'; // Default value per CSS spec
        }

        const validValues = [
            'auto',
            'flex-start',
            'flex-end',
            'center',
            'baseline',
            'stretch'
        ];

        const normalizedValue = value.trim().toLowerCase();
        
        // Check if the value is valid
        if (validValues.includes(normalizedValue)) {
            return normalizedValue;
        }

        console.warn(`Invalid align-self value: "${value}". Using default "auto" instead.`);
        return 'auto'; // Default to auto for invalid values
    }
    
    /**
     * Parses the order property for flex items
     * @param value The order value to parse
     * @returns The normalized order value
     */
    public parseOrder(value: string | undefined): number {
        if (!value) {
            return 0; // Default value per CSS spec
        }

        const parsedValue = parseInt(value.trim(), 10);
        
        // Check if the value is a valid integer
        if (!isNaN(parsedValue)) {
            return parsedValue;
        }

        console.warn(`Invalid order value: "${value}". Using default "0" instead.`);
        return 0; // Default to 0 for invalid values
    }

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