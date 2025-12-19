import { Injectable } from '@angular/core';
import { StyleRule } from '../types/style-rule';
import { DOMElement } from '../types/dom-element';
import { Color3, Mesh } from '@babylonjs/core';
import { TransformData } from '../types/transform-data';

@Injectable({
  providedIn: 'root'
})
export class StyleService {
  /**
   * Get an element style entry by id.
   */
  public getElementStyle(id: string): { normal: StyleRule, hover?: StyleRule } | undefined {
    return this.elementStyles.get(id);
  }
  private elementStyles: Map<string, { normal: StyleRule, hover?: StyleRule }> = new Map();

  /**
   * Add or update an element style entry.
   */
  public setElementStyle(id: string, style: { normal: StyleRule, hover?: StyleRule }): void {
    this.elementStyles.set(id, style);
  }

  /**
   * Clear all element styles.
   */
  public clearElementStyles(): void {
    this.elementStyles.clear();
  }


  public parsePercentageValue(value: string): number {
    return parseFloat(value.replace('%', ''));
  }

  public parseOpacity(opacityValue: string | undefined): number {
    if (!opacityValue) return 1.0;

    const opacity = parseFloat(opacityValue);
    // Clamp opacity between 0.0 and 1.0
    return Math.max(0.0, Math.min(1.0, opacity));
  }

  public parseZIndex(zIndexValue: string | undefined): number {
    if (!zIndexValue) return 0;

    const zIndex = parseInt(zIndexValue, 10);
    // Return parsed integer, allow negative values for behind elements
    return isNaN(zIndex) ? 0 : zIndex;
  }

  public parseBorderRadius(borderRadiusValue: string | undefined): number {
    console.log(`🔄 parseBorderRadius called with: "${borderRadiusValue}"`);

    if (!borderRadiusValue) {
      console.log(`⚠️ No border radius value provided, returning 0`);
      return 0;
    }

    // Parse border radius value (support px units and unitless numbers)
    const trimmed = borderRadiusValue.trim();
    const numericValue = parseFloat(trimmed.replace('px', ''));

    // Ensure non-negative value
    const radius = isNaN(numericValue) ? 0 : Math.max(0, numericValue);

    console.log(`🔄 Parsed border-radius: "${borderRadiusValue}" → ${radius}`);
    return radius;
  }

  public parseBoxShadow(boxShadowValue: string | undefined): { offsetX: number, offsetY: number, blur: number, color: string } | null {
    if (!boxShadowValue || boxShadowValue === 'none') return null;

    // Parse box-shadow: offset-x offset-y blur-radius color
    // Example: "2px 2px 4px rgba(0,0,0,0.5)" or "1px 1px 2px #000000"
    const trimmed = boxShadowValue.trim();

    // Simple regex to match common box-shadow patterns
    const boxShadowRegex = /^(-?\d+(?:\.\d+)?(?:px)?)\s+(-?\d+(?:\.\d+)?(?:px)?)\s+(\d+(?:\.\d+)?(?:px)?)\s+(.+)$/;
    const match = trimmed.match(boxShadowRegex);

    if (!match) {
      console.warn(`⚠️ Unable to parse box-shadow: "${boxShadowValue}"`);
      return null;
    }

    const offsetX = parseFloat(match[1].replace('px', ''));
    const offsetY = parseFloat(match[2].replace('px', ''));
    const blur = parseFloat(match[3].replace('px', ''));
    const color = match[4].trim();

    console.log(`🎯 Parsed box shadow: offsetX=${offsetX}, offsetY=${offsetY}, blur=${blur}, color="${color}"`);
    return { offsetX, offsetY, blur, color };
  }

  public parsePolygonType(polygonTypeValue: string | undefined): string {
    if (!polygonTypeValue) return 'rectangle';

    const trimmed = polygonTypeValue.trim().toLowerCase();
    const validTypes = ['rectangle', 'triangle', 'pentagon', 'hexagon', 'octagon'];

    if (validTypes.includes(trimmed)) {
      console.log(`🔄 Parsed polygon-type: "${polygonTypeValue}" → ${trimmed}`);
      return trimmed;
    }

    console.warn(`⚠️ Invalid polygon type "${polygonTypeValue}", defaulting to rectangle`);
    return 'rectangle';
  }

  public parseGradient(backgroundValue: string | undefined): { type: 'solid' | 'linear' | 'radial', color?: string, gradient?: any } | null {
    if (!backgroundValue) return null;

    const trimmed = backgroundValue.trim();

    // Check for linear gradient
    const linearMatch = trimmed.match(/linear-gradient\s*\(\s*(.+)\s*\)/);
    if (linearMatch) {
      return this.parseLinearGradient(linearMatch[1]);
    }

    // Check for radial gradient
    const radialMatch = trimmed.match(/radial-gradient\s*\(\s*(.+)\s*\)/);
    if (radialMatch) {
      return this.parseRadialGradient(radialMatch[1]);
    }

    // Solid color (existing behavior)
    return { type: 'solid', color: trimmed };
  }

  public parseLinearGradient(gradientParams: string): { type: 'linear', gradient: any } {
    // Parse linear gradient parameters
    // Example: "to right, #ff0000, #0000ff" or "45deg, red, blue"
    const parts = gradientParams.split(',').map(p => p.trim());

    let direction = '0deg'; // Default to top to bottom
    let colors: string[] = [];

    // Check if first part is direction
    const firstPart = parts[0];
    if (firstPart.includes('deg') || firstPart.startsWith('to ')) {
      direction = firstPart;
      colors = parts.slice(1);
    } else {
      colors = parts;
    }

    console.log(`🎨 Parsed linear gradient: direction="${direction}", colors=[${colors.join(', ')}]`);

    return {
      type: 'linear',
      gradient: {
        direction,
        colors: colors.map(color => color.trim())
      }
    };
  }

  public parseRadialGradient(gradientParams: string): { type: 'radial', gradient: any } {
    // Parse radial gradient parameters  
    // Example: "circle, #ff0000, #0000ff" or "ellipse at center, red, blue"
    const parts = gradientParams.split(',').map(p => p.trim());

    let shape = 'circle'; // Default shape
    let colors: string[] = [];

    // Simple parsing - assume first part might be shape, rest are colors
    if (parts[0].includes('circle') || parts[0].includes('ellipse')) {
      shape = parts[0];
      colors = parts.slice(1);
    } else {
      colors = parts;
    }

    console.log(`🎨 Parsed radial gradient: shape="${shape}", colors=[${colors.join(', ')}]`);

    return {
      type: 'radial',
      gradient: {
        shape,
        colors: colors.map(color => color.trim())
      }
    };
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

  public parseHexColor(hex: string): Color3 {
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

  public parseBorderProperties(style: StyleRule | undefined) {
    if (!style) {
      return { width: 0, color: new Color3(0, 0, 0), style: 'solid' };
    }

    // Only use camelCase properties
    const borderWidth = style.borderWidth;
    const borderColor = style.borderColor;
    const borderStyle = style.borderStyle;

    return {
      width: this.parseBorderWidth(borderWidth),
      color: this.parseBackgroundColor(borderColor),
      style: borderStyle || 'solid'
    };
  }

  public parseBorderWidth(scaleFactor: any, width?: string): number {
    if (!width) return 0;
    // Handle "2px", "0.1", etc. - convert to world units
    const numericValue = parseFloat(width.replace('px', ''));

    // Apply a slight reduction to compensate for 3D perspective effects that make borders appear thicker
    const perspectiveAdjustment = 0.8; // Reduce border width by 20% to account for 3D perspective
    return numericValue * scaleFactor * perspectiveAdjustment;
  }

  public parsePadding(scaleFacor: any, style: StyleRule | undefined) {
    if (!style) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    // Check for individual padding properties first
    const paddingTop = this.parsePaddingValue(scaleFacor, style.paddingTop);
    const paddingRight = this.parsePaddingValue(scaleFacor, style.paddingRight);
    const paddingBottom = this.parsePaddingValue(scaleFacor, style.paddingBottom);
    const paddingLeft = this.parsePaddingValue(scaleFacor, style.paddingLeft);

    // If individual properties are set, use them
    if (paddingTop !== null || paddingRight !== null || paddingBottom !== null || paddingLeft !== null) {
      return {
        top: paddingTop ?? 0,
        right: paddingRight ?? 0,
        bottom: paddingBottom ?? 0,
        left: paddingLeft ?? 0
      };
    }

    // Otherwise, parse the shorthand padding property
    return this.parseBoxValues(style.padding, scaleFacor);
  }

  public parseMargin(style: StyleRule | undefined) {
    return this.parseMarginWithScale(style);
  }

  public parseMarginWithScale(style: StyleRule | undefined, scaleFactor: number = 1) {
    if (!style) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    // Check for individual margin properties first
    const marginTop = this.parseMarginValueWithScale(style.marginTop, scaleFactor);
    const marginRight = this.parseMarginValueWithScale(style.marginRight, scaleFactor);
    const marginBottom = this.parseMarginValueWithScale(style.marginBottom, scaleFactor);
    const marginLeft = this.parseMarginValueWithScale(style.marginLeft, scaleFactor);

    // If individual properties are set, use them
    if (marginTop !== null || marginRight !== null || marginBottom !== null || marginLeft !== null) {
      return {
        top: marginTop ?? 0,
        right: marginRight ?? 0,
        bottom: marginBottom ?? 0,
        left: marginLeft ?? 0
      };
    }

    // Otherwise, parse the shorthand margin property
    return this.parseMarginBoxValuesWithScale(style.margin, scaleFactor);

  }

  private _parseMarginWithScale(style: StyleRule | undefined, scaleFactor: number = 1) {
    if (!style) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    // Check for individual margin properties first
    const marginTop = this.parseMarginValueWithScale(style.marginTop, scaleFactor);
    const marginRight = this.parseMarginValueWithScale(style.marginRight, scaleFactor);
    const marginBottom = this.parseMarginValueWithScale(style.marginBottom, scaleFactor);
    const marginLeft = this.parseMarginValueWithScale(style.marginLeft, scaleFactor);

    // If individual properties are set, use them
    if (marginTop !== null || marginRight !== null || marginBottom !== null || marginLeft !== null) {
      return {
        top: marginTop ?? 0,
        right: marginRight ?? 0,
        bottom: marginBottom ?? 0,
        left: marginLeft ?? 0
      };
    }

    // Otherwise, parse the shorthand margin property
    return this.parseMarginBoxValuesWithScale(style.margin, scaleFactor);
  }

  public parseBoxValues(value?: string, scaleFactor?: any) {
    if (!value) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const values = value.split(/\s+/).map(v => this.parsePaddingValue(scaleFactor, v) ?? 0);

    switch (values.length) {
      case 1:
        // padding: 10px (all sides)
        return { top: values[0], right: values[0], bottom: values[0], left: values[0] };
      case 2:
        // padding: 10px 20px (vertical horizontal)
        return { top: values[0], right: values[1], bottom: values[0], left: values[1] };
      case 4:
        // padding: 10px 20px 30px 40px (top right bottom left)
        return { top: values[0], right: values[1], bottom: values[2], left: values[3] };
      default:
        return { top: 0, right: 0, bottom: 0, left: 0 };
    }
  }

  public parsePaddingValue(scaleFactor: any, value?: string): number | null {
    if (!value) return null;
    // Handle "10px", "0.5", etc. - convert to world units
    const numericValue = parseFloat(value.replace('px', ''));

    return isNaN(numericValue) ? null : numericValue * scaleFactor;
  }

  public parseMarginValue(value?: string): number | null {
    return this.parseMarginValueWithScale(value);
  }

  public parseMarginValueWithScale(value?: string, scaleFactor: number = 1): number | null {
    if (!value) return null;
    // Handle "10px", "0.5", etc. - convert to world units using scaleFactor
    const numericValue = parseFloat(value.replace('px', ''));
    return isNaN(numericValue) ? null : numericValue * scaleFactor;

  }

  private _parseMarginValueWithScale(value?: string, scaleFactor: number = 1): number | null {
    if (!value) return null;
    // Handle "10px", "0.5", etc. - convert to world units using scaleFactor
    const numericValue = parseFloat(value.replace('px', ''));
    return isNaN(numericValue) ? null : numericValue * scaleFactor;
  }

  public parseMarginBoxValues(value?: string) {
    return this.parseMarginBoxValuesWithScale(value);
  }

  public parseMarginBoxValuesWithScale(value?: string, scaleFactor: number = 1) {
    if (!value) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const values = value.split(/\s+/).map(v => this.parseMarginValueWithScale(v, scaleFactor) ?? 0);

    switch (values.length) {
      case 1:
        // margin: 10px (all sides)
        return { top: values[0], right: values[0], bottom: values[0], left: values[0] };
      case 2:
        // margin: 10px 20px (vertical horizontal)
        return { top: values[0], right: values[1], bottom: values[0], left: values[1] };
      case 4:
        // margin: 10px 20px 30px 40px (top right bottom left)
        return { top: values[0], right: values[1], bottom: values[2], left: values[3] };
      default:
        return { top: 0, right: 0, bottom: 0, left: 0 };
    }

  }

  private _parseMarginBoxValuesWithScale(value?: string, scaleFactor: number = 1) {
    if (!value) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const values = value.split(/\s+/).map(v => this._parseMarginValueWithScale(v, scaleFactor) ?? 0);

    switch (values.length) {
      case 1:
        // margin: 10px (all sides)
        return { top: values[0], right: values[0], bottom: values[0], left: values[0] };
      case 2:
        // margin: 10px 20px (vertical horizontal)
        return { top: values[0], right: values[1], bottom: values[0], left: values[1] };
      case 4:
        // margin: 10px 20px 30px 40px (top right bottom left)
        return { top: values[0], right: values[1], bottom: values[2], left: values[3] };
      default:
        return { top: 0, right: 0, bottom: 0, left: 0 };
    }
  }


  public parseStyles(styles: StyleRule[]): void {
    styles.forEach(style => {
      if (style.selector.includes(':hover')) {
        // This is a hover style
        const baseSelector = style.selector.replace(':hover', '');
        const elementId = baseSelector.replace('#', '');

        if (!this.elementStyles.has(elementId)) {
          this.elementStyles.set(elementId, { normal: {} as StyleRule });
        }

        this.elementStyles.get(elementId)!.hover = style;
        console.log(`Parsed hover style for ${elementId}:`, style);
      } else if (style.selector.startsWith('#')) {
        // This is a normal element style
        const elementId = style.selector.replace('#', '');

        if (!this.elementStyles.has(elementId)) {
          this.elementStyles.set(elementId, { normal: style });
        } else {
          this.elementStyles.get(elementId)!.normal = style;
        }
        console.log(`Parsed normal style for ${elementId}:`, style);
      }
    });
  }


  // Element type default styles
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

  // Transform parsing methods
  public parseTransform(transformValue?: string): TransformData | null {
    if (!transformValue || transformValue === 'none') {
      return null;
    }

    const transforms: TransformData = {
      translate: { x: 0, y: 0, z: 0 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    };

    // Parse translate functions
    const translateRegex = /translate(?:3d)?\s*\(\s*([^)]+)\s*\)/gi;
    let translateMatch;
    while ((translateMatch = translateRegex.exec(transformValue)) !== null) {
      const values = translateMatch[1].split(',').map(v => v.trim());
      if (values.length >= 2) {
        transforms.translate.x = this.parseLength(values[0]);
        transforms.translate.y = this.parseLength(values[1]);
        if (values.length >= 3) {
          transforms.translate.z = this.parseLength(values[2]);
        }
      }
    }

    // Parse translateX, translateY, translateZ
    const translateXMatch = /translateX\s*\(\s*([^)]+)\s*\)/i.exec(transformValue);
    if (translateXMatch) {
      transforms.translate.x = this.parseLength(translateXMatch[1]);
    }
    const translateYMatch = /translateY\s*\(\s*([^)]+)\s*\)/i.exec(transformValue);
    if (translateYMatch) {
      transforms.translate.y = this.parseLength(translateYMatch[1]);
    }
    const translateZMatch = /translateZ\s*\(\s*([^)]+)\s*\)/i.exec(transformValue);
    if (translateZMatch) {
      transforms.translate.z = this.parseLength(translateZMatch[1]);
    }

    // Parse rotate functions
    const rotateRegex = /rotate(?:3d)?\s*\(\s*([^)]+)\s*\)/gi;
    let rotateMatch;
    while ((rotateMatch = rotateRegex.exec(transformValue)) !== null) {
      const values = rotateMatch[1].split(',').map(v => v.trim());
      if (values.length === 1) {
        // rotate(angle) - Z rotation
        transforms.rotate.z = this.parseAngle(values[0]);
      } else if (values.length >= 4) {
        // rotate3d(x, y, z, angle)
        const angle = this.parseAngle(values[3]);
        const x = parseFloat(values[0]);
        const y = parseFloat(values[1]);
        const z = parseFloat(values[2]);
        // For simplicity, apply the angle to the dominant axis
        if (Math.abs(x) > Math.abs(y) && Math.abs(x) > Math.abs(z)) {
          transforms.rotate.x = angle;
        } else if (Math.abs(y) > Math.abs(z)) {
          transforms.rotate.y = angle;
        } else {
          transforms.rotate.z = angle;
        }
      }
    }

    // Parse rotateX, rotateY, rotateZ
    const rotateXMatch = /rotateX\s*\(\s*([^)]+)\s*\)/i.exec(transformValue);
    if (rotateXMatch) {
      transforms.rotate.x = this.parseAngle(rotateXMatch[1]);
    }
    const rotateYMatch = /rotateY\s*\(\s*([^)]+)\s*\)/i.exec(transformValue);
    if (rotateYMatch) {
      transforms.rotate.y = this.parseAngle(rotateYMatch[1]);
    }
    const rotateZMatch = /rotateZ\s*\(\s*([^)]+)\s*\)/i.exec(transformValue);
    if (rotateZMatch) {
      transforms.rotate.z = this.parseAngle(rotateZMatch[1]);
    }

    // Parse scale functions
    const scaleRegex = /scale(?:3d)?\s*\(\s*([^)]+)\s*\)/gi;
    let scaleMatch;
    while ((scaleMatch = scaleRegex.exec(transformValue)) !== null) {
      const values = scaleMatch[1].split(',').map(v => v.trim());
      if (values.length === 1) {
        // scale(value) - uniform scaling
        const scale = parseFloat(values[0]);
        transforms.scale.x = scale;
        transforms.scale.y = scale;
        transforms.scale.z = scale;
      } else if (values.length >= 2) {
        transforms.scale.x = parseFloat(values[0]);
        transforms.scale.y = parseFloat(values[1]);
        if (values.length >= 3) {
          transforms.scale.z = parseFloat(values[2]);
        }
      }
    }

    // Parse scaleX, scaleY, scaleZ
    const scaleXMatch = /scaleX\s*\(\s*([^)]+)\s*\)/i.exec(transformValue);
    if (scaleXMatch) {
      transforms.scale.x = parseFloat(scaleXMatch[1]);
    }
    const scaleYMatch = /scaleY\s*\(\s*([^)]+)\s*\)/i.exec(transformValue);
    if (scaleYMatch) {
      transforms.scale.y = parseFloat(scaleYMatch[1]);
    }
    const scaleZMatch = /scaleZ\s*\(\s*([^)]+)\s*\)/i.exec(transformValue);
    if (scaleZMatch) {
      transforms.scale.z = parseFloat(scaleZMatch[1]);
    }

    return transforms;
  }

  public parseLength(value: string): number {
    // Convert pixel values to world coordinates, others to relative values
    if (value.endsWith('px')) {
      return parseFloat(value) * 0.01; // Convert pixels to world units
    }
    return parseFloat(value) || 0;
  }

  public parseAngle(value: string): number {
    if (value.endsWith('deg')) {
      return (parseFloat(value) * Math.PI) / 180; // Convert degrees to radians
    } else if (value.endsWith('rad')) {
      return parseFloat(value);
    } else if (value.endsWith('turn')) {
      return parseFloat(value) * 2 * Math.PI; // Convert turns to radians
    }
    return parseFloat(value) || 0; // Assume radians if no unit
  }
  public parseFlexBasis(flexBasis: string, containerSize: number): number {
    if (flexBasis.endsWith('%')) {
      return (parseFloat(flexBasis) / 100) * containerSize;
    } else if (flexBasis.endsWith('px')) {
      // Convert pixels to world units
      return parseFloat(flexBasis) * 0.01; // Approximate pixel to world conversion
    } else {
      return parseFloat(flexBasis) || containerSize / 3; // Fallback
    }
  }
  public parseGapProperties(style: StyleRule): { rowGap: number; columnGap: number } {
    let rowGap = 0;
    let columnGap = 0;
    const rowGapValue = style?.rowGap || style?.rowGap;
    if (rowGapValue) {
      rowGap = this.parseGapValue(rowGapValue);
    }
    const columnGapValue = style?.columnGap || style?.columnGap;
    if (columnGapValue) {
      columnGap = this.parseGapValue(columnGapValue);
    }
    const gapValue = style?.gap;
    if (gapValue) {
      const gaps = gapValue.trim().split(/\s+/);
      if (gaps.length === 1) {
        const parsedGap = this.parseGapValue(gaps[0]);
        rowGap = parsedGap;
        columnGap = parsedGap;
      } else if (gaps.length === 2) {
        rowGap = this.parseGapValue(gaps[0]);
        columnGap = this.parseGapValue(gaps[1]);
      }
    }
    return { rowGap, columnGap };
  }
  public parseSinglePadding(padding: string): number {
    // Simple padding parser for single values like "8px"
    return this.parsePixelValue(padding);
  }

  public parsePixelValue(value: string): number {
    // Parse pixel values like "8px", "16px", etc.
    if (typeof value === 'string' && value.endsWith('px')) {
      return parseFloat(value.replace('px', ''));
    }
    // If no unit, assume pixels
    return parseFloat(value) || 0;
  }

  public parseGapValue(gapValue: string): number {
    if (!gapValue || gapValue === '0' || gapValue === 'normal') {
      return 0;
    }
    if (gapValue.endsWith('px')) {
      // Convert pixels to world units using the same scale as other measurements
      return parseFloat(gapValue) * 0.01;
    } else if (gapValue.endsWith('em') || gapValue.endsWith('rem')) {
      // Assume 1em = 16px for now (this could be made configurable)
      const emValue = parseFloat(gapValue);
      return emValue * 16 * 0.01; // 16px per em, converted to world units
    } else if (gapValue.endsWith('%')) {
      // Percentage gaps would need context of container size, return a reasonable default
      console.warn(`Percentage gaps not fully supported yet: ${gapValue}`);
      return parseFloat(gapValue) * 0.001; // Small fallback
    } else {
      // Unitless value, treat as pixels
      return parseFloat(gapValue) * 0.01;
    }
  }

  public parseListItemSpacing(parentMesh: Mesh): number {
    // Try to get spacing from parent's style, fallback to default
    const parentId = this.getElementIdFromMeshName(parentMesh.name);
    if (parentId) {
      const parentStyle = this.getElementStyle(parentId)?.normal;
      const spacing = parentStyle?.listItemSpacing || '4px';
      return this.parsePixelValue(spacing);
    }
    return 4; // Default spacing in pixels
  }


  public getElementIdFromMeshName(meshName: string): string | null {
    // Extract element ID from mesh name patterns
    console.log(`🔍 Extracting ID from mesh name: "${meshName}"`);

    // Handle different mesh naming patterns
    if (meshName.includes('-')) {
      const parts = meshName.split('-');
      console.log(`📝 Split parts:`, parts);

      // For containers like "unordered-list" or "ordered-list", the ID is the full compound name
      if (parts.length === 2 && (parts[1] === 'list')) {
        const id = parts[0] + '-' + parts[1]; // "unordered-list" or "ordered-list"
        console.log(`📋 Container ID extracted: "${id}"`);
        return id;
      }

      // For other elements, last part is usually the ID
      const id = parts[parts.length - 1];
      console.log(`📄 Element ID extracted: "${id}"`);
      return id;
    }

    // Fallback: use the whole name as ID
    console.log(`⚠️ Using full mesh name as ID: "${meshName}"`);
    return meshName;
  }
}