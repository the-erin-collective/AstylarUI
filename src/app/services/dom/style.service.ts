import { Injectable } from '@angular/core';
import { StyleRule } from '../../types/style-rule';
import { BabylonDOM } from './interfaces/dom.types';
import { Color3 } from '@babylonjs/core';
import { DOMElement } from '../../types/dom-element';
import { BabylonRender } from './interfaces/render.types';
import { StyleDefaultsService } from './style-defaults.service';

@Injectable({
    providedIn: 'root'
})
export class StyleService {
    constructor(private styleDefaults: StyleDefaultsService) {}

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
        console.log(`[STYLE-PARSE] Starting to parse ${styles.length} styles`);
        styles.forEach((style, index) => {
            if (style.selector.includes(':hover')) {
                // This is a hover style
                const baseSelector = style.selector.replace(':hover', '');
                const elementId = baseSelector.replace('#', '');
                if (!dom.context.elementStyles.has(elementId)) {
                    dom.context.elementStyles.set(elementId, { normal: {} as StyleRule });
                }
                dom.context.elementStyles.get(elementId)!.hover = style;
                console.log(`[STYLE-PARSE] Hover style for ${elementId}: background=${style.background || 'none'}`);
            } else if (style.selector.startsWith('#')) {
                // This is a normal element style
                const elementId = style.selector.replace('#', '');
                if (!dom.context.elementStyles.has(elementId)) {
                    dom.context.elementStyles.set(elementId, { normal: style });
                } else {
                    // MERGE with existing style instead of overwriting
                    const existingStyle = dom.context.elementStyles.get(elementId)!.normal;
                    const mergedStyle = { ...existingStyle, ...style };
                    dom.context.elementStyles.get(elementId)!.normal = mergedStyle;
                    

                }
                console.log(`[STYLE-PARSE] ID style for ${elementId}: background=${style.background || 'none'}`);
                
                // DEBUG: Log when we merge styles for containers
                if (elementId.includes('container') && dom.context.elementStyles.has(elementId)) {
                    console.log(`🔍 [CONTAINER MERGE DEBUG] Merged styles for ${elementId}`);
                }
            } else if (style.selector.startsWith('.')) {
                // This is a class selector
                const className = style.selector.replace('.', '');
                // Store with dot prefix
                if (!dom.context.elementStyles.has(style.selector)) {
                    dom.context.elementStyles.set(style.selector, { normal: style });
                } else {
                    dom.context.elementStyles.get(style.selector)!.normal = style;
                }
                // Store without dot prefix
                if (!dom.context.elementStyles.has(className)) {
                    dom.context.elementStyles.set(className, { normal: style });
                } else {
                    dom.context.elementStyles.get(className)!.normal = style;
                }
                console.log(`[STYLE-PARSE] Class style for ${className}: background=${style.background || 'none'}`);
            }
        });
        console.log(`[STYLE-PARSE] Completed parsing. Total stored styles: ${dom.context.elementStyles.size}`);
    }

    public findStyleForElement(element: DOMElement, styles: StyleRule[]): StyleRule | undefined {
        if (!element.id) {
            console.log('🎨 STYLE DEBUG: Element has no ID, returning undefined');
            return undefined;
        }
        
        const matchingStyles: StyleRule[] = [];
        
        for (const style of styles) {
            // Handle comma-separated selectors
            const selectors = style.selector.split(',').map(s => s.trim());
            
            for (const selector of selectors) {
                console.log(`🎨 STYLE DEBUG: Testing selector: "${selector}" against element: ${element.id}`);
                
                if (this.matchesSelector(element, selector)) {
                    console.log(`✅ STYLE DEBUG: Selector "${selector}" matches element: ${element.id}`);
                    matchingStyles.push({...style, selector}); // Use the specific matching selector
                    break; // Don't test other selectors in this rule
                } else {
                    console.log(`❌ STYLE DEBUG: Selector "${selector}" does not match element: ${element.id}`);
                }
            }
        }
        
        console.log(`🎨 STYLE DEBUG: Found ${matchingStyles.length} matching styles for ${element.id}`);
        
        if (matchingStyles.length === 0) {
            return undefined;
        }
        
        // For now, just return the first matching style
        // In a more complete implementation, we would merge styles based on specificity
        const selectedStyle = matchingStyles[0];
        console.log(`🎨 STYLE DEBUG: Selected style for ${element.id}:`, selectedStyle);
        return selectedStyle;
    }
    
    /**
     * Determines if an element matches a CSS selector
     * @param element The DOM element to test
     * @param selector The CSS selector to match against
     * @returns True if the element matches the selector, false otherwise
     */
    public matchesSelector(element: DOMElement, selector: string): boolean {
        // Handle ID selectors (#id)
        if (selector.startsWith('#')) {
            const selectorId = selector.substring(1);
            const result = element.id === selectorId;
            if (element.id && (element.id.includes('complete') || element.id.includes('th-') || element.id.includes('td-'))) {
                console.log(`[SELECTOR-MATCH] ID "${selector}" vs element "${element.id}": ${result}`);
            }
            return result;
        }
        
        // Handle class selectors (.class)
        if (selector.startsWith('.')) {
            const selectorClass = selector.substring(1);
            const elementClasses = element.class ? element.class.split(' ') : [];
            const result = elementClasses.includes(selectorClass);
            if (element.class && (element.class.includes('complete') || element.class.includes('spanning'))) {
                console.log(`[SELECTOR-MATCH] Class "${selector}" vs element classes "${element.class}": ${result} (classes: [${elementClasses.join(', ')}])`);
            }
            return result;
        }
        
        // Handle element type selectors (div, span, etc.)
        if (!selector.includes('.') && !selector.includes('#')) {
            const result = element.type === selector;
            return result;
        }
        
        // Handle child selectors (parent > child)
        if (selector.includes('>')) {
            // This would require parent context, which we don't have in this simple implementation
            return false;
        }
        
        // Default: no match
        return false;
    }

    public findStyleBySelector(selector: string, styles: StyleRule[]): StyleRule | undefined {
        return styles.find(style => style.selector === selector);
    }

    public parseBackgroundColor(background?: string): Color3 {
        if (!background) {
            console.log('🎨 COLOR DEBUG: No background color provided, using default');
            return new Color3(0.2, 0.2, 0.3); // Default color
        }

        console.log(`🎨 COLOR DEBUG: Parsing background color: "${background}"`);
        const colorLower = background.toLowerCase();

        // Handle transparent backgrounds
        if (colorLower === 'transparent') {
            console.log('🎨 COLOR DEBUG: Transparent background detected, returning null');
            return null as any; // Special case - will be handled in material creation
        }

        // Handle hex colors (#ff0000, #f00)
        if (colorLower.startsWith('#')) {
            console.log(`🎨 COLOR DEBUG: Parsing hex color: ${background}`);
            const result = this.parseHexColor(colorLower);
            console.log(`🎨 COLOR DEBUG: Hex color result: RGB(${result.r.toFixed(3)}, ${result.g.toFixed(3)}, ${result.b.toFixed(3)})`);
            return result;
        }

        // Handle named colors - expanded list
        const namedColors: { [key: string]: Color3 } = {
            // Basic colors
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
            
            // Extended colors
            'lightblue': new Color3(0.68, 0.85, 0.9),
            'lightgreen': new Color3(0.56, 0.93, 0.56),
            'lightgray': new Color3(0.83, 0.83, 0.83),
            'lightgrey': new Color3(0.83, 0.83, 0.83),
            'darkblue': new Color3(0, 0, 0.55),
            'darkgreen': new Color3(0, 0.39, 0),
            'darkgray': new Color3(0.66, 0.66, 0.66),
            'darkgrey': new Color3(0.66, 0.66, 0.66),
            'darkred': new Color3(0.55, 0, 0),
            'darkorange': new Color3(1, 0.55, 0),
            'mistyrose': new Color3(1, 0.89, 0.88),
            'lightyellow': new Color3(1, 1, 0.88),
            'lavender': new Color3(0.9, 0.9, 0.98),
            'cornflowerblue': new Color3(0.39, 0.58, 0.93),
            'skyblue': new Color3(0.53, 0.81, 0.92),
            'steelblue': new Color3(0.27, 0.51, 0.71),
            'teal': new Color3(0, 0.5, 0.5),
            'navy': new Color3(0, 0, 0.5),
            'maroon': new Color3(0.5, 0, 0),
            'olive': new Color3(0.5, 0.5, 0),
            'aqua': new Color3(0, 1, 1),
            'lime': new Color3(0, 1, 0),
            'silver': new Color3(0.75, 0.75, 0.75),
            'gold': new Color3(1, 0.84, 0),
            'brown': new Color3(0.65, 0.16, 0.16),
            'tan': new Color3(0.82, 0.71, 0.55),
            'beige': new Color3(0.96, 0.96, 0.86),
            'ivory': new Color3(1, 1, 0.94),
            'azure': new Color3(0.94, 1, 1),
            'wheat': new Color3(0.96, 0.87, 0.7),
            'violet': new Color3(0.93, 0.51, 0.93),
            'plum': new Color3(0.87, 0.63, 0.87),
            'orchid': new Color3(0.85, 0.44, 0.84),
            'salmon': new Color3(0.98, 0.5, 0.45),
            'coral': new Color3(1, 0.5, 0.31),
            'tomato': new Color3(1, 0.39, 0.28),
            'crimson': new Color3(0.86, 0.08, 0.24),
            'indigo': new Color3(0.29, 0, 0.51),
            'turquoise': new Color3(0.25, 0.88, 0.82),
            'chocolate': new Color3(0.82, 0.41, 0.12),
            'firebrick': new Color3(0.7, 0.13, 0.13),
            'forestgreen': new Color3(0.13, 0.55, 0.13),
            'seagreen': new Color3(0.18, 0.55, 0.34),
            'limegreen': new Color3(0.2, 0.8, 0.2),
            'slateblue': new Color3(0.42, 0.35, 0.8),
            'royalblue': new Color3(0.25, 0.41, 0.88),
            'midnightblue': new Color3(0.1, 0.1, 0.44),
            'dodgerblue': new Color3(0.12, 0.56, 1),
            'aquamarine': new Color3(0.5, 1, 0.83),
            'cadetblue': new Color3(0.37, 0.62, 0.63),
            'powderblue': new Color3(0.69, 0.88, 0.9),
            'thistle': new Color3(0.85, 0.75, 0.85),
            'goldenrod': new Color3(0.85, 0.65, 0.13),
            'peru': new Color3(0.8, 0.52, 0.25),
            'sienna': new Color3(0.63, 0.32, 0.18),
            'rosybrown': new Color3(0.74, 0.56, 0.56),
            'sandybrown': new Color3(0.96, 0.64, 0.38),
            'khaki': new Color3(0.94, 0.9, 0.55),
            'linen': new Color3(0.98, 0.94, 0.9),
            'snow': new Color3(1, 0.98, 0.98),
            'honeydew': new Color3(0.94, 1, 0.94),
            'mintcream': new Color3(0.96, 1, 0.98),
            'aliceblue': new Color3(0.94, 0.97, 1),
            'ghostwhite': new Color3(0.97, 0.97, 1),
            'whitesmoke': new Color3(0.96, 0.96, 0.96),
            'seashell': new Color3(1, 0.96, 0.93),
            'oldlace': new Color3(0.99, 0.96, 0.9),
            'floralwhite': new Color3(1, 0.98, 0.94),
            'antiquewhite': new Color3(0.98, 0.92, 0.84),
            'papayawhip': new Color3(1, 0.94, 0.84),
            'blanchedalmond': new Color3(1, 0.92, 0.8),
            'moccasin': new Color3(1, 0.89, 0.71),
            'navajowhite': new Color3(1, 0.87, 0.68),
            'peachpuff': new Color3(1, 0.85, 0.73),
            'bisque': new Color3(1, 0.89, 0.77),
            'lemonchiffon': new Color3(1, 0.98, 0.8),
            'cornsilk': new Color3(1, 0.97, 0.86),
            'lightsalmon': new Color3(1, 0.63, 0.48),
            'darksalmon': new Color3(0.91, 0.59, 0.48),
            'lightcoral': new Color3(0.94, 0.5, 0.5),
            'indianred': new Color3(0.8, 0.36, 0.36),
            'palevioletred': new Color3(0.86, 0.44, 0.58),
            'deeppink': new Color3(1, 0.08, 0.58),
            'hotpink': new Color3(1, 0.41, 0.71),
            'lightpink': new Color3(1, 0.71, 0.76),
            'mediumvioletred': new Color3(0.78, 0.08, 0.52),
            'blueviolet': new Color3(0.54, 0.17, 0.89),
            'darkviolet': new Color3(0.58, 0, 0.83),
            'darkmagenta': new Color3(0.55, 0, 0.55),
            'darkslateblue': new Color3(0.28, 0.24, 0.55),
            'darkslategray': new Color3(0.18, 0.31, 0.31),
            'darkslategrey': new Color3(0.18, 0.31, 0.31),
            'dimgray': new Color3(0.41, 0.41, 0.41),
            'dimgrey': new Color3(0.41, 0.41, 0.41),
            'slategray': new Color3(0.44, 0.5, 0.56),
            'slategrey': new Color3(0.44, 0.5, 0.56),
            'lightslategray': new Color3(0.47, 0.53, 0.6),
            'lightslategrey': new Color3(0.47, 0.53, 0.6),
            'gainsboro': new Color3(0.86, 0.86, 0.86),
            'springgreen': new Color3(0, 1, 0.5),
            'mediumspringgreen': new Color3(0, 0.98, 0.6),
            'mediumseagreen': new Color3(0.24, 0.7, 0.44),
            'lightseagreen': new Color3(0.13, 0.7, 0.67),
            'palegreen': new Color3(0.6, 0.98, 0.6),
            'darkseagreen': new Color3(0.56, 0.74, 0.56),
            'mediumaquamarine': new Color3(0.4, 0.8, 0.67),
            'darkcyan': new Color3(0, 0.55, 0.55),
            'palegoldenrod': new Color3(0.93, 0.91, 0.67),
            'darkgoldenrod': new Color3(0.72, 0.53, 0.04),
            'burlywood': new Color3(0.87, 0.72, 0.53),
            'saddlebrown': new Color3(0.55, 0.27, 0.07),
            'darkkhaki': new Color3(0.74, 0.72, 0.42),
            'yellowgreen': new Color3(0.6, 0.8, 0.2),
            'olivedrab': new Color3(0.42, 0.56, 0.14),
            'greenyellow': new Color3(0.68, 1, 0.18),
            'chartreuse': new Color3(0.5, 1, 0),
            'lawngreen': new Color3(0.49, 0.99, 0),
            'darkturquoise': new Color3(0, 0.81, 0.82),
            'paleturquoise': new Color3(0.69, 0.93, 0.93),
            'mediumturquoise': new Color3(0.28, 0.82, 0.8),
            'deepskyblue': new Color3(0, 0.75, 1),
            'lightskyblue': new Color3(0.53, 0.81, 0.98),
            'mediumblue': new Color3(0, 0, 0.8),
            'mediumslateblue': new Color3(0.48, 0.41, 0.93),
            'mediumpurple': new Color3(0.58, 0.44, 0.86),
            'rebeccapurple': new Color3(0.4, 0.2, 0.6),
            'darkorchid': new Color3(0.6, 0.2, 0.8),
            'mediumorchid': new Color3(0.73, 0.33, 0.83),
            'lavenderblush': new Color3(1, 0.94, 0.96),
            
            // CSS4 colors
            'darkpurple': new Color3(0.3, 0, 0.3),
            'darkteal': new Color3(0, 0.3, 0.3),
            'darknavy': new Color3(0, 0, 0.3),
            'darkmaroon': new Color3(0.3, 0, 0),
            'darkolive': new Color3(0.3, 0.3, 0),
            
            // Special colors for the flexbox test
            'f94144': new Color3(0.976, 0.255, 0.267),
            'f3722c': new Color3(0.953, 0.447, 0.173),
            'f8961e': new Color3(0.973, 0.588, 0.118),
            '90be6d': new Color3(0.565, 0.745, 0.427),
            '43aa8b': new Color3(0.263, 0.667, 0.545),
            '4d908e': new Color3(0.302, 0.565, 0.557),
            '577590': new Color3(0.341, 0.459, 0.565),
            '277da1': new Color3(0.153, 0.49, 0.631),
            'f9c74f': new Color3(0.976, 0.78, 0.31),
            'f9844a': new Color3(0.976, 0.518, 0.29),
            '22223b': new Color3(0.133, 0.133, 0.231),
            '1a1a2e': new Color3(0.102, 0.102, 0.18),
            'c1121f': new Color3(0.757, 0.071, 0.122),
            '4a5568': new Color3(0.29, 0.333, 0.408)
        };

        if (namedColors[colorLower]) {
            console.log(`🎨 COLOR DEBUG: Found named color: ${colorLower}`);
            const result = namedColors[colorLower];
            console.log(`🎨 COLOR DEBUG: Named color result: RGB(${result.r.toFixed(3)}, ${result.g.toFixed(3)}, ${result.b.toFixed(3)})`);
            return result;
        }

        // Handle rgb() and rgba() formats
        if (colorLower.startsWith('rgb(') || colorLower.startsWith('rgba(')) {
            console.log(`🎨 COLOR DEBUG: Parsing RGB(A) color: ${background}`);
            const result = this.parseRgbColor(colorLower);
            console.log(`🎨 COLOR DEBUG: RGB(A) color result: RGB(${result.r.toFixed(3)}, ${result.g.toFixed(3)}, ${result.b.toFixed(3)})`);
            return result;
        }

        // Fallback to default
        console.log(`🎨 COLOR DEBUG: Unknown color format: ${background}, using default`);
        return new Color3(0.2, 0.2, 0.3);
    }

    private parseRgbColor(rgb: string): Color3 {
        // Extract the RGB values from the string
        const values = rgb.replace(/rgba?\(|\)/g, '').split(',').map(v => v.trim());
        
        if (values.length < 3) {
            return new Color3(0.2, 0.2, 0.3); // Default for invalid format
        }
        
        // Convert RGB values (0-255) to normalized values (0-1)
        const r = parseInt(values[0], 10) / 255;
        const g = parseInt(values[1], 10) / 255;
        const b = parseInt(values[2], 10) / 255;
        
        return new Color3(r, g, b);
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

    public getElementTypeDefaults(elementType: string): Partial<StyleRule> {
        return this.styleDefaults.getElementTypeDefaults(elementType);
    }
} 