import { Injectable } from '@angular/core';
import { Scene, Mesh, ActionManager, ExecuteCodeAction, PointerEventTypes } from '@babylonjs/core';
import { MaterialService } from './material.service';
import { StyleService } from './style.service';
import { DOMElement } from '../types/dom-element';

@Injectable({
  providedIn: 'root'
})
export class InteractionService {
  private scene?: Scene;
  private materialService?: MaterialService;
  private styleService?: StyleService;
  private hoverStates: Map<string, boolean> = new Map();
  private elementTypes: Map<string, string> = new Map(); // Store element types for hover handling
  private elements: Map<string, Mesh> = new Map();

  initialize(scene: Scene, materialService: MaterialService, styleService: StyleService): void {
    this.scene = scene;
    this.materialService = materialService;
    this.styleService = styleService;
  }

  setupMouseEvents(mesh: Mesh, elementId: string): void {
    if (!this.scene) return;
    
    // Mouse enter (hover start)
    mesh.actionManager = new ActionManager(this.scene);
    
    mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
      console.log(`Mouse enter: ${elementId} via ${mesh.name}`);
      this.hoverStates.set(elementId, true);
      
      // Update main element
      const mainMesh = this.elements.get(elementId);
      if (mainMesh) {
        const elementType = this.elementTypes.get(elementId) || 'div';
        const element = { id: elementId, type: elementType } as DOMElement;
        
        // Get element styles and rebuild merged style with type defaults
        const elementStyles = this.styleService?.getElementStyle(elementId);
        const explicitStyle = elementStyles?.normal;
        const typeDefaults = this.getElementTypeDefaults(element.type);
        const mergedStyle: any = {
          selector: `#${elementId}`,
          ...typeDefaults,
          ...explicitStyle
        };
        
        this.materialService?.applyElementMaterial(mainMesh, element, true, mergedStyle);
      }
      
      // Update all border frames
      for (let i = 0; i < 4; i++) {
        const borderMesh = this.elements.get(`${elementId}-border-${i}`);
        if (borderMesh) {
          this.materialService?.applyBorderMaterial(borderMesh, elementId, true);
        }
      }
    }));
    
    mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
      console.log(`Mouse leave: ${elementId} via ${mesh.name}`);
      this.hoverStates.set(elementId, false);
      
      // Update main element
      const mainMesh = this.elements.get(elementId);
      if (mainMesh) {
        const elementType = this.elementTypes.get(elementId) || 'div';
        const element = { id: elementId, type: elementType } as DOMElement;
        
        // Get element styles and rebuild merged style with type defaults
        const elementStyles = this.styleService?.getElementStyle(elementId);
        const explicitStyle = elementStyles?.normal;
        const typeDefaults = this.getElementTypeDefaults(element.type);
        const mergedStyle: any = {
          selector: `#${elementId}`,
          ...typeDefaults,
          ...explicitStyle
        };
        
        this.materialService?.applyElementMaterial(mainMesh, element, false, mergedStyle);
      }
      
      // Update all border frames
      for (let i = 0; i < 4; i++) {
        const borderMesh = this.elements.get(`${elementId}-border-${i}`);
        if (borderMesh) {
          this.materialService?.applyBorderMaterial(borderMesh, elementId, false);
        }
      }
    }));
  }

  setupAnchorInteraction(mesh: Mesh, elementId: string, style: any): void {
    if (!this.scene) return;
    
    console.log(`🎯 Setting up anchor interaction for ${elementId}`);
    
    // Store the anchor data on the mesh for later retrieval
    mesh.metadata = {
      ...mesh.metadata,
      isAnchor: true,
      elementId: elementId,
      href: style.href,
      target: style.target || '_self',
      onclick: style.onclick
    };
    
    // Ensure the mesh is pickable for click events
    mesh.isPickable = true;
    
    // Set up scene-level pointer event handling (more reliable than ActionManager)
    if (!this.scene.metadata?.anchorHandlerSetup) {
      this.scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === PointerEventTypes.POINTERUP && pointerInfo.pickInfo?.hit) {
          const pickedMesh = pointerInfo.pickInfo.pickedMesh;
          if (pickedMesh?.metadata?.isAnchor) {
            const anchorData = pickedMesh.metadata;
            console.log(`🔗 Anchor clicked: ${anchorData.elementId}`);
            
            // Handle onclick first (if present)
            if (anchorData.onclick) {
              console.log(`🖱️ Executing onclick for ${anchorData.elementId}: ${anchorData.onclick}`);
              this.handleOnClick(anchorData.onclick, anchorData.elementId);
            }
            
            // Handle href navigation (if present and no onclick that prevents it)
            if (anchorData.href && this.isValidUrl(anchorData.href)) {
              console.log(`🌐 Navigating from ${anchorData.elementId} to: ${anchorData.href}`);
              this.handleNavigation(anchorData.href, anchorData.target, anchorData.elementId);
            }
          }
        }
      });
      
      // Mark that we've set up the handler
      this.scene.metadata = { ...this.scene.metadata, anchorHandlerSetup: true };
      console.log(`🔧 Set up scene-level anchor click handler`);
    }
    
    console.log(`✅ Anchor interaction setup complete for ${elementId}`);
  }

  private handleOnClick(onclickValue: string, elementId: string): void {
    console.log(`🖱️ Executing onclick for ${elementId}: ${onclickValue}`);
    
    // For now, just log the onclick value
    // In the future, this could be extended to handle custom callback functions
    console.log(`[ONCLICK] ${elementId}: ${onclickValue}`);
    
    // You could extend this to parse and execute specific actions
    // For example: if (onclickValue.startsWith('console.log')) { ... }
  }

  private isValidUrl(url: string): boolean {
    // Check for valid absolute URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }
    
    // Check for valid relative URL (starts with / or is a simple path)
    if (url.startsWith('/') || /^[a-zA-Z0-9_\-./]+$/.test(url)) {
      return true;
    }
    
    return false;
  }

  private handleNavigation(href: string, target: string, elementId: string): void {
    console.log(`🌐 Navigating from ${elementId} to: ${href} (target: ${target})`);
    
    if (target === '_blank') {
      // Open in new window/tab
      console.log(`🆕 Opening in new window: ${href}`);
      if (typeof window !== 'undefined') {
        window.open(href, '_blank');
      }
    } else {
      // Navigate in current window
      console.log(`🔄 Navigating in current window: ${href}`);
      if (typeof window !== 'undefined') {
        if (href.startsWith('http://') || href.startsWith('https://')) {
          // Absolute URL
          window.location.href = href;
        } else {
          // Relative URL - use Angular router or window.location
          window.location.href = href;
        }
      }
    }
  }

  private getElementTypeDefaults(elementType: string): Partial<any> {
    const defaults: { [key: string]: Partial<any> } = {
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

  setElement(elementId: string, mesh: Mesh, elementType: string): void {
    this.elements.set(elementId, mesh);
    this.hoverStates.set(elementId, false); // Start in normal state
    this.elementTypes.set(elementId, elementType); // Store element type for hover handling
  }

  setBorderElement(elementId: string, index: number, mesh: Mesh): void {
    this.elements.set(`${elementId}-border-${index}`, mesh);
  }

  getHoverState(elementId: string): boolean {
    return this.hoverStates.get(elementId) || false;
  }

  clearElements(): void {
    this.elements.clear();
    this.hoverStates.clear();
    this.elementTypes.clear();
  }
} 