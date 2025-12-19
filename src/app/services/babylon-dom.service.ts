import { Injectable } from '@angular/core';
import { Scene, Color3, Vector3, Mesh, ActionManager, ExecuteCodeAction } from '@babylonjs/core';
import { BabylonCameraService } from './babylon-camera.service';
import { BabylonMeshService } from './babylon-mesh.service';

export interface DOMElement {
  type: 'div';
  id?: string;
  children?: DOMElement[];
}

export interface DOMRoot {
  root: {
    children: DOMElement[];
  };
}

export interface StyleRule {
  selector: string;
  top?: string;
  left?: string;
  width?: string;
  height?: string;
  background?: string;
  // Support both hyphenated and camelCase for border properties
  'border-width'?: string;
  borderWidth?: string;
  'border-color'?: string;
  borderColor?: string;
  'border-style'?: string;
  borderStyle?: string;
  // Padding and margin support
  padding?: string;
  margin?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  // Transparency support
  opacity?: string;
  // Z-index/layering support
  zIndex?: string;
  'z-index'?: string;
}

export interface SiteData {
  styles: StyleRule[];
  root: {
    children: DOMElement[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class BabylonDOMService {
  private scene?: Scene;
  private cameraService?: BabylonCameraService;
  private meshService?: BabylonMeshService;
  private sceneWidth: number = 1920; // Default viewport width
  private sceneHeight: number = 1080; // Default viewport height
  private elements: Map<string, Mesh> = new Map();
  private hoverStates: Map<string, boolean> = new Map();
  private elementStyles: Map<string, { normal: StyleRule, hover?: StyleRule }> = new Map();
  private elementDimensions: Map<string, { width: number, height: number, padding: { top: number; right: number; bottom: number; left: number } }> = new Map();

  constructor() {}

  initialize(scene: Scene, cameraService: BabylonCameraService, meshService: BabylonMeshService, viewportWidth: number, viewportHeight: number): void {
    this.scene = scene;
    this.cameraService = cameraService;
    this.meshService = meshService;
    this.sceneWidth = viewportWidth;
    this.sceneHeight = viewportHeight;
    this.elements.clear();
  }

  createSiteFromData(siteData: SiteData): void {
    if (!this.scene) {
      console.error('BabylonDOMService: Scene not initialized');
      return;
    }

    console.log('Creating site from data:', siteData);

    // Clear existing elements and state
    this.clearElements();
    this.hoverStates.clear();
    this.elementStyles.clear();
    
    // Parse and organize styles
    this.parseStyles(siteData.styles);

    // Create root body element that represents the full viewport/document
    const rootBodyMesh = this.createRootBodyElement(siteData.styles);
    
    // Process children recursively - these will be positioned relative to the body
    if (siteData.root.children) {
      console.log('Processing children:', siteData.root.children);
      this.processChildren(siteData.root.children, rootBodyMesh, siteData.styles);
    }

    console.log('Site creation complete. Elements:', this.elements.size);
  }
  
  private parseStyles(styles: StyleRule[]): void {
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

  private createRootBodyElement(styles: StyleRule[]): Mesh {
    if (!this.scene || !this.meshService || !this.cameraService) throw new Error('Services not initialized');

    // Get viewport dimensions from camera service
    const { width: visibleWidth, height: visibleHeight } = this.cameraService.calculateViewportDimensions();
    
    const rootBody = this.meshService.createPlane('root-body', visibleWidth, visibleHeight);

    // Position at origin in the XY plane
    this.meshService.positionMesh(rootBody, 0, 0, 0);
    
    // No rotation needed since camera is now at positive Z looking toward origin
    
    // Create material - this should be fully visible as it represents the document body
    let material;
    
    // Find root style and apply background color
    const rootStyle = this.findStyleBySelector('root', styles);
    if (rootStyle?.background) {
      const backgroundColor = this.parseBackgroundColor(rootStyle.background);
      const opacity = this.parseOpacity(rootStyle.opacity);
      material = this.meshService.createMaterial('root-body-material', backgroundColor, undefined, opacity);
      console.log('Applied root background color:', rootStyle.background, '-> parsed:', backgroundColor, 'opacity:', opacity);
    } else {
      material = this.meshService.createMaterial('root-body-material', new Color3(0.8, 0.1, 0.1));
      console.log('No root background style found, using test red color');
    }
    
    rootBody.material = material;

    console.log('Created root body element (calculated full screen):', { 
      position: rootBody.position, 
      width: visibleWidth, 
      height: visibleHeight 
    });
    
    this.elements.set('root-body', rootBody);
    return rootBody;
  }

  private processChildren(children: DOMElement[], parent: Mesh, styles: StyleRule[]): void {
    children.forEach(child => {
      const childMesh = this.createElement(child, parent, styles);
      
      if (child.children && child.children.length > 0) {
        this.processChildren(child.children, childMesh, styles);
      }
    });
  }

  private createElement(element: DOMElement, parent: Mesh, styles: StyleRule[]): Mesh {
    if (!this.scene || !this.meshService) throw new Error('Services not initialized');

    // Get element styles (normal and hover)
    const elementStyles = element.id ? this.elementStyles.get(element.id) : undefined;
    const style = elementStyles?.normal;
    
    // Calculate dimensions and position relative to parent
    const dimensions = this.calculateDimensions(style, parent);
    
    // Create the mesh
    const mesh = this.meshService.createPlane(element.id || `element-${Date.now()}`, dimensions.width, dimensions.height);

    // Calculate Z position based on z-index
    const zIndex = this.parseZIndex(style?.zIndex || style?.['z-index']);
    const zPosition = this.calculateZPosition(zIndex);
    
    console.log(`🎯 Z-positioning for ${element.id}:`, {
      zIndex: zIndex,
      zPosition: zPosition,
      hasZIndexStyle: !!(style?.zIndex || style?.['z-index'])
    });
    
    // Position relative to parent (parent's coordinate system)
    this.meshService.positionMesh(mesh, dimensions.x, dimensions.y, zPosition);

    // Parent the mesh so it inherits parent's transformations
    this.meshService.parentMesh(mesh, parent);

    // Apply material (start with normal state)
    this.applyElementMaterial(mesh, element, false);

    // Add borders if specified
    const borderElementStyles = element.id ? this.elementStyles.get(element.id) : undefined;
    const borderProperties = this.parseBorderProperties(borderElementStyles?.normal);
    
    if (borderProperties.width > 0) {
      console.log(`Creating border for ${element.id} with width ${borderProperties.width}`);
      
      // Create border frame (4 rectangles)
      const borderMeshes = this.meshService.createBorderMesh(
        `${element.id}-border`,
        dimensions.width,
        dimensions.height,
        borderProperties.width
      );
      
      // Calculate Z position for borders (slightly above element for visibility)
      const borderZPosition = zPosition + 0.0001; // Borders slightly in front of element
      
      // Position border frames around the element
      this.meshService.positionBorderFrames(
        borderMeshes,
        dimensions.x,
        dimensions.y,
        borderZPosition,
        dimensions.width,
        dimensions.height,
        borderProperties.width
      );
      
      // Parent all border frames (skip if parent is undefined)
      // borderMeshes.forEach(borderMesh => {
      //   if (parent) this.meshService.parentMesh(borderMesh, parent);
      // });
      
      // Apply border material to all frames with consistent rendering
      const borderOpacity = this.parseOpacity(elementStyles?.normal?.opacity);
      const borderMaterial = this.meshService.createMaterial(
        `${element.id}-border-material`,
        borderProperties.color,
        undefined,
        borderOpacity
      );
      
      // DO NOT override emissive color - keep materials consistent
      // The createSharpEdgeMaterial already sets optimal values
      
      borderMeshes.forEach(borderMesh => {
        borderMesh.material = borderMaterial;
        
        // Apply same parenting as main element for consistent coordinate system
        if (parent && this.meshService) {
          this.meshService.parentMesh(borderMesh, parent);
        }
      });
      
      // Store border references for cleanup
      if (element.id) {
        borderMeshes.forEach((borderMesh, index) => {
          this.elements.set(`${element.id}-border-${index}`, borderMesh);
          
          // Add hover events to border frames if element has hover styles
          if (borderElementStyles?.hover && element.id) {
            this.setupMouseEvents(borderMesh, element.id);
          }
        });
        console.log(`Applied border - width: ${borderProperties.width}, color:`, borderProperties.color);
      }
    }

    // Add mouse events if element has hover styles
    if (element.id && borderElementStyles?.hover) {
      this.setupMouseEvents(mesh, element.id);
    }

    console.log(`Created element ${element.id}:`, {
      position: mesh.position,
      dimensions,
      parentId: parent.name,
      style
    });

    // Store reference
    if (element.id) {
      this.elements.set(element.id, mesh);
      this.hoverStates.set(element.id, false); // Start in normal state
      
      // Store element dimensions and padding info for child calculations
      this.elementDimensions.set(element.id, {
        width: dimensions.width,
        height: dimensions.height,
        padding: dimensions.padding
      });
    }

    return mesh;
  }
  
  private applyElementMaterial(mesh: Mesh, element: DOMElement, isHovered: boolean): void {
    if (!this.meshService || !element.id) return;
    
    const elementStyles = this.elementStyles.get(element.id);
    if (!elementStyles) return;
    
    // Choose the appropriate style based on hover state
    const activeStyle = isHovered && elementStyles.hover ? elementStyles.hover : elementStyles.normal;
    
    // Parse opacity from the active style
    const opacity = this.parseOpacity(activeStyle?.opacity);
    
    let material;
    if (activeStyle?.background) {
      const backgroundColor = this.parseBackgroundColor(activeStyle.background);
      material = this.meshService.createMaterial(`${element.id}-material-${isHovered ? 'hover' : 'normal'}`, backgroundColor, undefined, opacity);
      console.log(`Applied ${element.id} ${isHovered ? 'hover' : 'normal'} background color:`, activeStyle.background, '-> parsed:', backgroundColor, 'opacity:', opacity);
    } else {
      const defaultColor = this.getColorForElement(element);
      material = this.meshService.createMaterial(`${element.id}-material-${isHovered ? 'hover' : 'normal'}`, defaultColor, undefined, opacity);
      console.log(`No background style for ${element.id} ${isHovered ? 'hover' : 'normal'} state, using default color, opacity:`, opacity);
    }
    
    mesh.material = material;
  }
  
  private setupMouseEvents(mesh: Mesh, elementId: string): void {
    if (!this.scene) return;
    
    // Mouse enter (hover start)
    mesh.actionManager = new ActionManager(this.scene);
    
    mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
      console.log(`Mouse enter: ${elementId} via ${mesh.name}`);
      this.hoverStates.set(elementId, true);
      
      // Update main element
      const mainMesh = this.elements.get(elementId);
      if (mainMesh) {
        const element = { id: elementId } as DOMElement;
        this.applyElementMaterial(mainMesh, element, true);
      }
      
      // Update all border frames
      for (let i = 0; i < 4; i++) {
        const borderMesh = this.elements.get(`${elementId}-border-${i}`);
        if (borderMesh) {
          this.applyBorderMaterial(borderMesh, elementId, true);
        }
      }
    }));
    
    mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
      console.log(`Mouse leave: ${elementId} via ${mesh.name}`);
      this.hoverStates.set(elementId, false);
      
      // Update main element
      const mainMesh = this.elements.get(elementId);
      if (mainMesh) {
        const element = { id: elementId } as DOMElement;
        this.applyElementMaterial(mainMesh, element, false);
      }
      
      // Update all border frames
      for (let i = 0; i < 4; i++) {
        const borderMesh = this.elements.get(`${elementId}-border-${i}`);
        if (borderMesh) {
          this.applyBorderMaterial(borderMesh, elementId, false);
        }
      }
    }));
  }
  
  private applyBorderMaterial(borderMesh: Mesh, elementId: string, isHovered: boolean): void {
    if (!this.meshService) return;
    
    const elementStyles = this.elementStyles.get(elementId);
    if (!elementStyles) {
      console.log(`No element styles found for ${elementId}`);
      return;
    }
    
    // Get normal style for base properties
    const normalStyle = elementStyles.normal;
    const hoverStyle = elementStyles.hover;
    
    // For border properties, use hover values if available, otherwise fall back to normal
    const borderWidth = isHovered && hoverStyle?.borderWidth ? hoverStyle.borderWidth :
                       isHovered && hoverStyle?.['border-width'] ? hoverStyle['border-width'] :
                       normalStyle?.borderWidth || normalStyle?.['border-width'];
    
    const borderColor = isHovered && hoverStyle?.borderColor ? hoverStyle.borderColor :
                       isHovered && hoverStyle?.['border-color'] ? hoverStyle['border-color'] :
                       normalStyle?.borderColor || normalStyle?.['border-color'];
    
    const borderStyle = isHovered && hoverStyle?.borderStyle ? hoverStyle.borderStyle :
                       isHovered && hoverStyle?.['border-style'] ? hoverStyle['border-style'] :
                       normalStyle?.borderStyle || normalStyle?.['border-style'];

    // Parse opacity from the active style
    const activeStyle = isHovered && hoverStyle ? hoverStyle : normalStyle;
    const opacity = this.parseOpacity(activeStyle?.opacity);
    
    const borderProperties = {
      width: this.parseBorderWidth(borderWidth),
      color: this.parseBackgroundColor(borderColor),
      style: borderStyle || 'solid'
    };
    
    console.log(`Applying border material for ${elementId}, isHovered: ${isHovered}, borderWidth: ${borderProperties.width}, borderColor:`, borderProperties.color, 'opacity:', opacity);
    
    if (borderProperties.width > 0) {
      const borderMaterial = this.meshService.createMaterial(
        `${elementId}-border-material-${isHovered ? 'hover' : 'normal'}`,
        borderProperties.color,
        undefined,
        opacity
      );
      borderMesh.material = borderMaterial;
      console.log(`Applied ${elementId} border ${isHovered ? 'hover' : 'normal'} color:`, borderProperties.color, 'opacity:', opacity);
    } else {
      console.log(`Border width is 0 for ${elementId}, skipping material application`);
    }
  }

  private findStyleForElement(element: DOMElement, styles: StyleRule[]): StyleRule | undefined {
    if (!element.id) return undefined;
    return styles.find(style => style.selector === `#${element.id}`);
  }

  private findStyleBySelector(selector: string, styles: StyleRule[]): StyleRule | undefined {
    return styles.find(style => style.selector === selector);
  }

  private parseBackgroundColor(background?: string): Color3 {
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
  
  private parseBorderProperties(style: StyleRule | undefined) {
    if (!style) {
      return { width: 0, color: new Color3(0, 0, 0), style: 'solid' };
    }
    
    // Support both camelCase and hyphenated properties (prefer camelCase)
    const borderWidth = style.borderWidth || style['border-width'];
    const borderColor = style.borderColor || style['border-color'];
    const borderStyle = style.borderStyle || style['border-style'];
    
    return {
      width: this.parseBorderWidth(borderWidth),
      color: this.parseBackgroundColor(borderColor),
      style: borderStyle || 'solid'
    };
  }

  private parseBorderWidth(width?: string): number {
    if (!width) return 0;
    // Handle "2px", "0.1", etc. - convert to world units
    const numericValue = parseFloat(width.replace('px', ''));
    // Use camera-calculated scaling factor for accurate conversion
    if(!this.cameraService){
      throw new Error('Services not initialized');
    }
    const scaleFactor = this.cameraService.getPixelToWorldScale();
    return numericValue * scaleFactor;
  }

  private parsePadding(style: StyleRule | undefined) {
    if (!style) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    // Check for individual padding properties first
    const paddingTop = this.parsePaddingValue(style.paddingTop);
    const paddingRight = this.parsePaddingValue(style.paddingRight);
    const paddingBottom = this.parsePaddingValue(style.paddingBottom);
    const paddingLeft = this.parsePaddingValue(style.paddingLeft);

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
    return this.parseBoxValues(style.padding);
  }

  private parseMargin(style: StyleRule | undefined) {
    if (!style) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    // Check for individual margin properties first
    const marginTop = this.parseMarginValue(style.marginTop);
    const marginRight = this.parseMarginValue(style.marginRight);
    const marginBottom = this.parseMarginValue(style.marginBottom);
    const marginLeft = this.parseMarginValue(style.marginLeft);

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
    return this.parseMarginBoxValues(style.margin);
  }

  private parseBoxValues(value?: string) {
    if (!value) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const values = value.split(/\s+/).map(v => this.parsePaddingValue(v) ?? 0);
    
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

  private parsePaddingValue(value?: string): number | null {
    if (!value) return null;
    // Handle "10px", "0.5", etc. - convert to world units
    const numericValue = parseFloat(value.replace('px', ''));
    // Use camera-calculated scaling factor for accurate conversion
    if(!this.cameraService){
      throw new Error('Services not initialized');
    }
    const scaleFactor = this.cameraService?.getPixelToWorldScale();
    return isNaN(numericValue) ? null : numericValue * scaleFactor;
  }

  private parseMarginValue(value?: string): number | null {
    if (!value) return null;
    // Handle "10px", "0.5", etc. - return raw pixel values without scaling
    // Scaling will be applied later in positioning calculations
    const numericValue = parseFloat(value.replace('px', ''));
    return isNaN(numericValue) ? null : numericValue; // Return raw pixel value
  }

  private parseMarginBoxValues(value?: string) {
    if (!value) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const values = value.split(/\s+/).map(v => this.parseMarginValue(v) ?? 0);
    
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

  private calculateDimensions(style: StyleRule | undefined, parent: Mesh): { 
    width: number; 
    height: number; 
    x: number; 
    y: number;
    padding: { top: number; right: number; bottom: number; left: number };
    margin: { top: number; right: number; bottom: number; left: number };
  } {
    // Get parent dimensions from the mesh creation parameters
    // For our standard world space, root body is 20x15
    const parentBounds = parent.getBoundingInfo().boundingBox;
    let parentWidth = Math.abs(parentBounds.maximum.x - parentBounds.minimum.x);
    let parentHeight = Math.abs(parentBounds.maximum.y - parentBounds.minimum.y);

    // If parent has padding, reduce available space for this child
    const parentInfo = this.getElementInfo(parent.name);
    if (parentInfo && parentInfo.padding) {
      parentWidth -= (parentInfo.padding.left + parentInfo.padding.right);
      parentHeight -= (parentInfo.padding.top + parentInfo.padding.bottom);
      console.log(`Applied parent padding - reduced dimensions from ${Math.abs(parentBounds.maximum.x - parentBounds.minimum.x)}x${Math.abs(parentBounds.maximum.y - parentBounds.minimum.y)} to ${parentWidth}x${parentHeight}`);
    }

    console.log('Parent dimensions:', { parentWidth, parentHeight });

    // Parse padding and margin
    const padding = this.parsePadding(style);
    const margin = this.parseMargin(style);

    // Available space after accounting for parent's padding
    // (This assumes the parent has padding that affects this child's available space)
    const availableWidth = parentWidth;
    const availableHeight = parentHeight;

    // Default to small child elements if no style is provided
    let width = availableWidth * 0.2; // 20% of available space by default
    let height = availableHeight * 0.2;
    let x = 0; // Centered by default
    let y = 0;

    if (style) {
      console.log(`STYLE CHECK - Element: ${style.selector || 'unknown'}, left: ${style.left}, top: ${style.top}`);
      
      // Calculate width as percentage of available space (after margins)
      if (style.width) {
        const widthPercent = this.parsePercentageValue(style.width);
        width = (widthPercent / 100) * availableWidth;
      }
      
      // Calculate height as percentage of available space (after margins)
      if (style.height) {
        const heightPercent = this.parsePercentageValue(style.height);
        height = (heightPercent / 100) * availableHeight;
      }

      // Calculate position - CSS uses top-left origin, BabylonJS uses center origin
      if (style.left !== undefined) {
        const leftPercent = this.parsePercentageValue(style.left);
        // Convert from CSS left (0% = left edge) to BabylonJS center-based X
        // Account for margin-left in positioning - apply scaling factor here
        // left edge of parent is at -parentWidth/2
        // element's left edge should be at: -parentWidth/2 + (margin.left * scale) + (leftPercent/100 * availableWidth)
        // element's center should be at: element's left edge + width/2
        if(!this.cameraService){
          throw new Error('Services not initialized');
        }
        const scaledMarginLeft = margin.left * (this.cameraService?.getPixelToWorldScale()); // Use camera-calculated scale factor
        
        x = (-parentWidth / 2) + scaledMarginLeft + ((leftPercent / 100) * availableWidth) + (width / 2);
      }

      if (style.top !== undefined) {
        const topPercent = this.parsePercentageValue(style.top);
        // Convert from CSS top (0% = top edge) to BabylonJS center-based Y
        // Account for margin-top in positioning - apply scaling factor here
        // Note: CSS Y grows downward, BabylonJS Y grows upward
        // top edge of parent is at +parentHeight/2
        // element's top edge should be at: +parentHeight/2 - (margin.top * scale) - (topPercent/100 * availableHeight)
        // element's center should be at: element's top edge - height/2
        if(!this.cameraService){
          throw new Error('Services not initialized');
        }
        const scaledMarginTop = margin.top * (this.cameraService?.getPixelToWorldScale()); // Use camera-calculated scale factor
        
        y = (parentHeight / 2) - scaledMarginTop - ((topPercent / 100) * availableHeight) - (height / 2);
      }
    }

    console.log('Calculated dimensions for element:', { 
      width, 
      height, 
      x, 
      y, 
      style,
      padding,
      margin,
      parentDimensions: { parentWidth, parentHeight }
    });

    return { width, height, x, y, padding, margin };
  }

  private calculateZPosition(zIndex: number): number {
    // Base Z position for elements (slightly in front of the root background)
    const baseZ = 0.01;
    
    // Z-index scale factor - increase to 0.01 for much larger separation
    const zScale = 0.01;
    
    // Calculate final Z position: base + (zIndex * scale)
    // Positive z-index moves toward camera, negative moves away from camera
    return baseZ + (zIndex * zScale);
  }

  private getElementInfo(elementId: string): { padding?: { top: number; right: number; bottom: number; left: number } } | null {
    // Get element dimension info for padding calculations
    const elementDimensions = this.elementDimensions.get(elementId);
    if (!elementDimensions) return null;
    
    return { padding: elementDimensions.padding };
  }

  private parsePercentage(value: string, parentSize: number): number {
    const percent = parseFloat(value.replace('%', ''));
    return (percent / 100) * parentSize;
  }

  private parsePercentageValue(value: string): number {
    return parseFloat(value.replace('%', ''));
  }

  private parseOpacity(opacityValue: string | undefined): number {
    if (!opacityValue) return 1.0;
    
    const opacity = parseFloat(opacityValue);
    // Clamp opacity between 0.0 and 1.0
    return Math.max(0.0, Math.min(1.0, opacity));
  }

  private parseZIndex(zIndexValue: string | undefined): number {
    if (!zIndexValue) return 0;
    
    const zIndex = parseInt(zIndexValue, 10);
    // Return parsed integer, allow negative values for behind elements
    return isNaN(zIndex) ? 0 : zIndex;
  }

  private getColorForElement(element: DOMElement): Color3 {
    // Assign specific colors based on element IDs for better visualization
    const colorMap: { [key: string]: Color3 } = {
      'outerdiv': new Color3(0.6, 0.3, 0.8), // Purple
      'innerdiv': new Color3(0.3, 0.8, 0.3), // Green
      'header': new Color3(0.8, 0.4, 0.2), // Orange
      'sidebar': new Color3(0.2, 0.6, 0.8), // Blue
      'content': new Color3(0.8, 0.8, 0.2), // Yellow
      'avatar': new Color3(0.8, 0.2, 0.4), // Pink
      'info': new Color3(0.4, 0.8, 0.6), // Cyan
    };
    
    // Use specific color if available, otherwise use a default bright color
    if (element.id && colorMap[element.id]) {
      return colorMap[element.id];
    }
    
    // Fallback to a bright default color
    return new Color3(0.7, 0.5, 0.9); // Light purple
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  private clearElements(): void {
    this.elements.forEach(mesh => {
      mesh.dispose();
    });
    this.elements.clear();
    this.hoverStates.clear();
    this.elementStyles.clear();
  }

  cleanup(): void {
    this.clearElements();
    this.scene = undefined;
  }
}
