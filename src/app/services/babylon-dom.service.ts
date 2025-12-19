import { Injectable } from '@angular/core';
import { Scene, Mesh } from '@babylonjs/core';
import { BabylonCameraService } from './babylon-camera.service';
import { BabylonMeshService } from './babylon-mesh.service';
import { TextureService } from './texture.service';
import { StyleService } from './style.service';
import { ElementService } from './element.service';
import { ListService } from './list.service';
import { FlexService } from './flex.service';
import { RootService } from './root.service';
import { MaterialService } from './material.service';
import { InteractionService } from './interaction.service';
import { StyleRule } from '../types/style-rule';
import { SiteData } from '../types/site-data';
import { DOMElement } from '../types/dom-element';

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
  private elementTypes: Map<string, string> = new Map(); // Store element types for hover handling
  private elementDimensions: Map<string, { width: number; height: number; padding: { top: number; right: number; bottom: number; left: number } }> = new Map();

  constructor(
    private textureService: TextureService,
    private styleService: StyleService,
    private elementService: ElementService,
    private listService: ListService,
    private flexService: FlexService,
    private rootService: RootService,
    private materialService: MaterialService,
    private interactionService: InteractionService
  ) {}

  initialize(scene: Scene, cameraService: BabylonCameraService, meshService: BabylonMeshService, viewportWidth: number, viewportHeight: number): void {
    this.scene = scene;
    this.cameraService = cameraService;
    this.meshService = meshService;
    this.sceneWidth = viewportWidth;
    this.sceneHeight = viewportHeight;
    this.elements.clear();
    
    // Initialize all new services
    this.elementService.initialize(scene, meshService, cameraService, this.styleService, this.textureService, this.materialService, this.interactionService, this.getElementInfo.bind(this));
    this.listService.initialize(meshService, cameraService, this.styleService, this.elementService, this.storeElement.bind(this));
    this.flexService.initialize(meshService, cameraService, this.styleService, this.elementService, this.storeElement.bind(this));
    this.rootService.initialize(scene, meshService, cameraService, this.styleService);
    this.materialService.initialize(scene, meshService, this.styleService);
    this.interactionService.initialize(scene, this.materialService, this.styleService);
  }

  createSiteFromData(siteData: SiteData): void {
    if (!this.scene) {
      console.error('BabylonDOMService: Scene not initialized');
      return;
    }

    console.log('🏗️ Creating site from data:', siteData);

    // Clear existing elements and state
    this.clearElements();
    this.hoverStates.clear();
    this.styleService.clearElementStyles();
    
    // Parse and organize styles
    console.log('📝 Parsing styles...');
    this.parseStyles(siteData.styles);
    console.log('📝 Parsed styles.');

    // Create root body element that represents the full viewport/document
    const rootBodyMesh = this.createRootBodyElement(siteData.styles);
    
    // Process children recursively - these will be positioned relative to the body
    if (siteData.root.children) {
      console.log('👨‍👩‍👧‍👦 Processing root children:', siteData.root.children);
      console.log('👨‍👩‍👧‍👦 Root children count:', siteData.root.children.length);
      console.log('👨‍👩‍👧‍👦 Root children details:', siteData.root.children.map(c => `${c.type}#${c.id}`));
      this.processChildren(siteData.root.children, rootBodyMesh, siteData.styles, { type: 'div' as const });
    } else {
      console.log('⚠️ No root children found in siteData');
    }

    console.log('✅ Site creation complete. Elements:', this.elements.size);
    console.log('🗺️ All elements created:', Array.from(this.elements.keys()));
  }
  
  private parseStyles(styles: StyleRule[]): void {
    this.styleService.parseStyles(styles);
  }

  private createRootBodyElement(styles: StyleRule[]): Mesh {
    const rootBody = this.rootService.createRootBodyElement(styles);
    this.elements.set('root-body', rootBody);
    return rootBody;
  }

  private processChildren(children: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement?: DOMElement): void {
    console.log(`🔄 Processing ${children.length} children for parent:`, parent.name);
    console.log(`🔍 Children details:`, children.map(c => `${c.type}#${c.id}`));
    
    // Check if parent is a list container (ul or ol) - then apply automatic stacking
    const isListContainer = parentElement?.type === 'ul' || parentElement?.type === 'ol';
    
    // Check if parent is a flex container
    const isFlexContainer = parentElement ? this.flexService.isFlexContainer(parentElement, styles) : false;
    
    console.log(`🔍 Parent element type: ${parentElement?.type}, isListContainer: ${isListContainer}, isFlexContainer: ${isFlexContainer}`);
    
    if (isListContainer) {
      console.log(`📋 Parent is list container (${parentElement?.type}), applying automatic stacking to ${children.length} items`);
      try {
        // Get container dimensions for list processing
        if (parentElement?.id) {
          const containerDimensions = this.elementDimensions.get(parentElement.id);
          if (containerDimensions) {
            this.listService.setElementDimensions(parentElement.id, containerDimensions);
          }
        }
        
        this.listService.processListChildren(children, parent, styles, parentElement.type as 'ul' | 'ol');
        console.log(`✅ Completed list processing for ${parentElement?.type}`);
      } catch (error) {
        console.error(`❌ Error in processListChildren for ${parentElement?.type}:`, error);
        throw error;
      }
    } else if (isFlexContainer && parentElement) {
      console.log(`🔀 Parent is flex container, applying flexbox layout to ${children.length} items`);
      try {
        // Get container dimensions for flex processing
        if (parentElement?.id) {
          const containerDimensions = this.elementDimensions.get(parentElement.id);
          if (containerDimensions) {
            this.flexService.setElementDimensions(parentElement.id, containerDimensions);
          }
        }
        
        this.flexService.processFlexChildren(children, parent, styles, parentElement);
        console.log(`✅ Completed flex processing for ${parentElement?.id}`);
      } catch (error) {
        console.error(`❌ Error in processFlexChildren for ${parentElement?.id}:`, error);
        throw error;
      }
    } else {
      console.log(`📄 Parent is NOT a list or flex container, using standard processing`);
      // Standard processing for non-list, non-flex elements
      children.forEach((child, index) => {
        console.log(`👶 Processing child ${index + 1}/${children.length}: ${child.type}#${child.id}`);
        
        try {
          const childMesh = this.elementService.createElement(child, parent, styles);
          console.log(`✅ Created child mesh:`, childMesh.name, `Position:`, childMesh.position);
          
          // Store element in maps (matching original service behavior)
          if (child.id) {
            this.elements.set(child.id, childMesh);
            this.hoverStates.set(child.id, false); // Start in normal state
            this.elementTypes.set(child.id, child.type); // Store element type for hover handling
            
            // Register with interaction service for hover handling
            this.interactionService.setElement(child.id, childMesh, child.type);
            
            // Store element dimensions and padding info for child calculations
            // Note: We need to get dimensions from the element service or calculate them
            const dimensions = this.elementService.getCalculatedDimensions(child, parent, styles);
            if (dimensions) {
              this.elementDimensions.set(child.id, {
                width: dimensions.width,
                height: dimensions.height,
                padding: dimensions.padding
              });
            }
          }
          
          if (child.children && child.children.length > 0) {
            console.log(`🔄 Child ${child.id} has ${child.children.length} sub-children`);
            this.processChildren(child.children, childMesh, styles, child);
            console.log(`✅ Completed sub-children processing for ${child.id}`);
          }
        } catch (error) {
          console.error(`❌ Error processing child ${child.type}#${child.id}:`, error);
          console.error(`❌ Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
          throw error; // Re-throw to stop processing
        }
      });
    }
    console.log(`✅ Finished processing all children for parent:`, parent.name);
  }

  private clearElements(): void {
    this.elements.forEach(mesh => {
      mesh.dispose();
    });
    this.elements.clear();
  }

  storeElement(element: DOMElement, mesh: Mesh, dimensions?: { width: number; height: number; padding: { top: number; right: number; bottom: number; left: number } }): void {
    if (element.id) {
      this.elements.set(element.id, mesh);
      this.hoverStates.set(element.id, false); // Start in normal state
      this.elementTypes.set(element.id, element.type); // Store element type for hover handling
      
      // Register with interaction service for hover handling
      this.interactionService.setElement(element.id, mesh, element.type);
      
      // Store element dimensions and padding info for child calculations
      if (dimensions) {
        this.elementDimensions.set(element.id, dimensions);
      } else {
        // Get dimensions from element service if not provided
        const calculatedDimensions = this.elementService.getCalculatedDimensions(element, mesh.parent as Mesh, []);
        if (calculatedDimensions) {
          this.elementDimensions.set(element.id, calculatedDimensions);
        }
      }
    }
  }

  private getElementInfo(elementId: string): { padding?: { top: number; right: number; bottom: number; left: number } } | null {
    // Get element dimension info for padding calculations
    const elementDimensions = this.elementDimensions.get(elementId);
    if (!elementDimensions) return null;
    
    return { padding: elementDimensions.padding };
  }

  cleanup(): void {
    this.clearElements();
    this.scene = undefined;
  }
}