import { Injectable } from '@angular/core';
import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh } from '@babylonjs/core';

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
  private sceneWidth: number = 1920; // Default viewport width
  private sceneHeight: number = 1080; // Default viewport height
  private elements: Map<string, Mesh> = new Map();

  constructor() {}

  initialize(scene: Scene, viewportWidth: number, viewportHeight: number): void {
    this.scene = scene;
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

    // Clear existing elements
    this.clearElements();

    // Create root body element that represents the full viewport/document
    const rootBodyMesh = this.createRootBodyElement();
    
    // Process children recursively - these will be positioned relative to the body
    if (siteData.root.children) {
      console.log('Processing children:', siteData.root.children);
      this.processChildren(siteData.root.children, rootBodyMesh, siteData.styles);
    }

    console.log('Site creation complete. Elements:', this.elements.size);
  }

  private createRootBodyElement(): Mesh {
    if (!this.scene) throw new Error('Scene not initialized');

    // Get the active camera to calculate proper viewport size
    const camera = this.scene.activeCamera;
    if (!camera) throw new Error('No active camera found');

    // For a camera at Z=+30 looking at origin, calculate the visible area at Z=0
    // Using camera's field of view and distance to calculate world space dimensions
    const cameraDistance = 30; // Camera is at Z=+30
    const fov = (camera as any).fov || Math.PI / 3; // Default FOV is about 60 degrees
    
    // Calculate height based on FOV: height = 2 * distance * tan(fov/2)
    const visibleHeight = 2 * cameraDistance * Math.tan(fov / 2);
    
    // Calculate width based on canvas aspect ratio
    const canvas = this.scene.getEngine().getRenderingCanvas();
    const aspectRatio = canvas ? canvas.width / canvas.height : 16/9;
    const visibleWidth = visibleHeight * aspectRatio;
    
    console.log('Calculated viewport dimensions:', { 
      visibleWidth, 
      visibleHeight, 
      aspectRatio, 
      fov, 
      cameraDistance 
    });
    
    const rootBody = MeshBuilder.CreatePlane('root-body', { 
      width: visibleWidth,
      height: visibleHeight 
    }, this.scene);

    // Position at origin in the XY plane
    rootBody.position = new Vector3(0, 0, 0);
    
    // No rotation needed since camera is now at positive Z looking toward origin
    
    // Create material - this should be fully visible as it represents the document body
    const material = new StandardMaterial('root-body-material', this.scene);
    material.diffuseColor = new Color3(0.8, 0.1, 0.1); // Red background for testing
    material.emissiveColor = new Color3(0.1, 0.1, 0.15); // Slight glow
    material.backFaceCulling = false;
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
    if (!this.scene) throw new Error('Scene not initialized');

    // Find styles for this element
    const style = this.findStyleForElement(element, styles);
    
    // Calculate dimensions and position relative to parent
    const dimensions = this.calculateDimensions(style, parent);
    
    // Create the mesh
    const mesh = MeshBuilder.CreatePlane(element.id || `element-${Date.now()}`, {
      width: dimensions.width,
      height: dimensions.height
    }, this.scene);

    // Position relative to parent (parent's coordinate system)
    mesh.position = new Vector3(
      dimensions.x,
      dimensions.y,
      0.1 // More forward to clearly appear on top of parent
    );

    // Parent the mesh so it inherits parent's transformations
    mesh.parent = parent;

    // Create material with distinct colors for visibility
    const material = new StandardMaterial(`${element.id}-material`, this.scene);
    material.diffuseColor = this.getColorForElement(element);
    material.emissiveColor = new Color3(0.1, 0.1, 0.1); // Slight glow
    material.backFaceCulling = false; // Visible from both sides
    mesh.material = material;

    console.log(`Created element ${element.id}:`, {
      position: mesh.position,
      dimensions,
      parentId: parent.name,
      style
    });

    // Store reference
    if (element.id) {
      this.elements.set(element.id, mesh);
    }

    return mesh;
  }

  private findStyleForElement(element: DOMElement, styles: StyleRule[]): StyleRule | undefined {
    if (!element.id) return undefined;
    return styles.find(style => style.selector === `#${element.id}`);
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
  }

  cleanup(): void {
    this.clearElements();
    this.scene = undefined;
  }
}
