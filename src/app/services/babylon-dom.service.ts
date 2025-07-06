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
      material = this.meshService.createMaterial('root-body-material', backgroundColor);
      console.log('Applied root background color:', rootStyle.background, '-> parsed:', backgroundColor);
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

    // Position relative to parent (parent's coordinate system)
    this.meshService.positionMesh(mesh, dimensions.x, dimensions.y, 0.1);

    // Parent the mesh so it inherits parent's transformations
    this.meshService.parentMesh(mesh, parent);

    // Apply material (start with normal state)
    this.applyElementMaterial(mesh, element, false);

    // Add mouse events if element has hover styles
    if (element.id && elementStyles?.hover) {
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
    }

    return mesh;
  }
  
  private applyElementMaterial(mesh: Mesh, element: DOMElement, isHovered: boolean): void {
    if (!this.meshService || !element.id) return;
    
    const elementStyles = this.elementStyles.get(element.id);
    if (!elementStyles) return;
    
    // Choose the appropriate style based on hover state
    const activeStyle = isHovered && elementStyles.hover ? elementStyles.hover : elementStyles.normal;
    
    let material;
    if (activeStyle?.background) {
      const backgroundColor = this.parseBackgroundColor(activeStyle.background);
      material = this.meshService.createMaterial(`${element.id}-material-${isHovered ? 'hover' : 'normal'}`, backgroundColor);
      console.log(`Applied ${element.id} ${isHovered ? 'hover' : 'normal'} background color:`, activeStyle.background, '-> parsed:', backgroundColor);
    } else {
      const defaultColor = this.getColorForElement(element);
      material = this.meshService.createMaterial(`${element.id}-material-${isHovered ? 'hover' : 'normal'}`, defaultColor);
      console.log(`No background style for ${element.id} ${isHovered ? 'hover' : 'normal'} state, using default color`);
    }
    
    mesh.material = material;
  }
  
  private setupMouseEvents(mesh: Mesh, elementId: string): void {
    if (!this.scene) return;
    
    // Mouse enter (hover start)
    mesh.actionManager = new ActionManager(this.scene);
    
    mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
      console.log(`Mouse enter: ${elementId}`);
      this.hoverStates.set(elementId, true);
      const element = { id: elementId } as DOMElement; // Minimal element object for material application
      this.applyElementMaterial(mesh, element, true);
    }));
    
    mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
      console.log(`Mouse leave: ${elementId}`);
      this.hoverStates.set(elementId, false);
      const element = { id: elementId } as DOMElement; // Minimal element object for material application
      this.applyElementMaterial(mesh, element, false);
    }));
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

  private calculateDimensions(style: StyleRule | undefined, parent: Mesh): { 
    width: number; 
    height: number; 
    x: number; 
    y: number; 
  } {
    // Get parent dimensions from the mesh creation parameters
    // For our standard world space, root body is 20x15
    const parentBounds = parent.getBoundingInfo().boundingBox;
    const parentWidth = Math.abs(parentBounds.maximum.x - parentBounds.minimum.x);
    const parentHeight = Math.abs(parentBounds.maximum.y - parentBounds.minimum.y);

    console.log('Parent dimensions:', { parentWidth, parentHeight });

    // Default to small child elements if no style is provided
    let width = parentWidth * 0.2; // 20% of parent by default
    let height = parentHeight * 0.2;
    let x = 0; // Centered by default
    let y = 0;

    if (style) {
      // Calculate width as percentage of parent
      if (style.width) {
        const widthPercent = this.parsePercentageValue(style.width);
        width = (widthPercent / 100) * parentWidth;
      }
      
      // Calculate height as percentage of parent
      if (style.height) {
        const heightPercent = this.parsePercentageValue(style.height);
        height = (heightPercent / 100) * parentHeight;
      }

      // Calculate position - CSS uses top-left origin, BabylonJS uses center origin
      if (style.left !== undefined) {
        const leftPercent = this.parsePercentageValue(style.left);
        // Convert from CSS left (0% = left edge) to BabylonJS center-based X
        // left edge of parent is at -parentWidth/2
        // element's left edge should be at: -parentWidth/2 + (leftPercent/100 * parentWidth)
        // element's center should be at: element's left edge + width/2
        x = (-parentWidth / 2) + ((leftPercent / 100) * parentWidth) + (width / 2);
      }

      if (style.top !== undefined) {
        const topPercent = this.parsePercentageValue(style.top);
        // Convert from CSS top (0% = top edge) to BabylonJS center-based Y
        // Note: CSS Y grows downward, BabylonJS Y grows upward
        // top edge of parent is at +parentHeight/2
        // element's top edge should be at: +parentHeight/2 - (topPercent/100 * parentHeight)
        // element's center should be at: element's top edge - height/2
        y = (parentHeight / 2) - ((topPercent / 100) * parentHeight) - (height / 2);
      }
    }

    console.log('Calculated dimensions for element:', { 
      width, 
      height, 
      x, 
      y, 
      style,
      parentDimensions: { parentWidth, parentHeight }
    });

    return { width, height, x, y };
  }

  private parsePercentage(value: string, parentSize: number): number {
    const percent = parseFloat(value.replace('%', ''));
    return (percent / 100) * parentSize;
  }

  private parsePercentageValue(value: string): number {
    return parseFloat(value.replace('%', ''));
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
