import { Injectable } from '@angular/core';
import { Scene, Mesh } from '@babylonjs/core';
import * as BABYLON from '@babylonjs/core';
import { StyleRule } from '../../types/style-rule';
import { SiteData } from '../../types/site-data';
import { FlexService } from './elements/flex.service';
import { BabylonDOM } from './interfaces/dom.types';
import { RootService } from './elements/root.service';
import { ListService } from './elements/list.service';
import { ElementService } from './elements/element.service';
import { StyleService } from './style.service';
import { BabylonRender } from './interfaces/render.types';
import { TableService } from './elements/table.service';
import { DOMElement } from '../../types/dom-element';
import { generateElementId } from './utils/element-id.util';
import { PositioningIntegrationService } from './positioning/positioning-integration.service';
import { TextRenderingService } from '../text/text-rendering.service';

@Injectable({
  providedIn: 'root'
})
export class BabylonDOMService {
  private scene?: Scene;
  private sceneWidth: number = 1920; // Default viewport width
  private sceneHeight: number = 1080; // Default viewport height
  private elements: Map<string, Mesh> = new Map();
  private hoverStates: Map<string, boolean> = new Map();
  private elementStyles: Map<string, { normal: StyleRule, hover?: StyleRule }> = new Map();
  private elementTypes: Map<string, string> = new Map(); // Store element types for hover handling
  private elementDimensions: Map<string, { width: number, height: number, padding: { top: number; right: number; bottom: number; left: number } }> = new Map();
  // Text rendering context
  private textMeshes: Map<string, Mesh> = new Map();
  private textTextures: Map<string, BABYLON.Texture> = new Map();
  private textContent: Map<string, string> = new Map();

  constructor( 
    private flexService: FlexService, 
    private rootService: RootService, 
    private listService: ListService, 
    private elementService: ElementService, 
    private styleService: StyleService, 
    private tableService: TableService,
    private positioningIntegration: PositioningIntegrationService,
    private textRenderingService: TextRenderingService
  ) { }

  public render?: BabylonRender;

  public get dom(): BabylonDOM {
    return {
      actions: {
        processChildren: this.elementService.processChildren.bind(this.elementService),
        createElement: this.elementService.createElement.bind(this.elementService),
        isFlexContainer: this.flexService.isFlexContainer.bind(this.flexService),
        processListChildren: this.listService.processListChildren.bind(this.listService),
        processFlexChildren: this.flexService.processFlexChildren.bind(this.flexService),
        requestElementRecreation: this.elementService.requestElementRecreation.bind(this.elementService),
        processTable: this.tableService.processTable.bind(this.tableService),
        generateElementId,
        // Positioning delegates
        calculateElementPosition: this.positioningIntegration.calculateElementPosition.bind(this.positioningIntegration),
        applyPositioning: this.positioningIntegration.applyPositioning.bind(this.positioningIntegration),
        updateElementPosition: this.updateElementPosition.bind(this),
        // Text rendering delegates
        handleTextContent: this.handleTextContent.bind(this),
        updateTextContent: this.updateTextContent.bind(this),
        validateTextElement: this.validateTextElement.bind(this)
      },
      context: {
        elements: this.elements,
        hoverStates: this.hoverStates,
        elementStyles: this.elementStyles,
        elementTypes: this.elementTypes,
        elementDimensions: this.elementDimensions,
        // Text rendering context
        textMeshes: this.textMeshes,
        textTextures: this.textTextures,
        textContent: this.textContent
      }
    };
  }

  initialize(render: BabylonRender, viewportWidth: number, viewportHeight: number): void {
    this.render = render;
    this.scene = render.scene;
    this.elements.clear();
    
    // Initialize text rendering service with scene
    if (render.scene) {
      this.textRenderingService.initialize(render.scene);
    }
    
    // Update viewport service with actual dimensions
    this.positioningIntegration.updateViewport({
      width: viewportWidth,
      height: viewportHeight
    });
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
    this.elementStyles.clear();

    // Parse and organize styles
    console.log('📝 Parsing styles...');
    this.styleService.parseStyles(this.dom, this.render!, siteData.styles);
    console.log('📝 Parsed styles. ElementStyles map:', this.elementStyles);

    // Create root body element that represents the full viewport/document
    const rootBodyMesh = this.rootService.createRootBodyElement(this.dom, this.render!, siteData.styles);

    // Process children recursively - these will be positioned relative to the body
    if (siteData.root.children) {
      console.log('👨‍👩‍👧‍👦 Processing root children:', siteData.root.children);
      console.log('👨‍👩‍👧‍👦 Root children count:', siteData.root.children.length);
      console.log('👨‍👩‍👧‍👦 Root children details:', siteData.root.children.map(c => `${c.type}#${c.id}`));
      this.elementService.processChildren(this.dom, this.render!, siteData.root.children, rootBodyMesh, siteData.styles, { type: 'div' as const });
    } else {
      console.log('⚠️ No root children found in siteData');
    }

    console.log('✅ Site creation complete. Elements:', this.elements.size);
    console.log('🗺️ All elements created:', Array.from(this.elements.keys()));
  }

  private clearElements(): void {
    this.elements.forEach(mesh => {
      mesh.dispose();
    });
    this.elements.clear();
    this.hoverStates.clear();
    this.elementStyles.clear();
    this.elementTypes.clear();
    
    // Clear text rendering context
    this.textMeshes.forEach(mesh => {
      mesh.dispose();
    });
    this.textMeshes.clear();
    this.textTextures.forEach(texture => {
      texture.dispose();
    });
    this.textTextures.clear();
    this.textContent.clear();
  }

  /**
   * Updates element position using positioning system
   * Integrates with existing mesh management
   */
  private updateElementPosition(elementId: string, newPosition: { x: number; y: number; z: number }): void {
    if (!elementId) {
      throw new Error('Element ID is required for position update');
    }

    const mesh = this.elements.get(elementId);
    if (!mesh) {
      throw new Error(`No mesh found for element: ${elementId}`);
    }

    if (!this.render) {
      throw new Error('Render context is required for position updates');
    }

    // Use positioning integration service to update position
    this.positioningIntegration.updateElementPosition(elementId, mesh, this.render);
  }

  /**
   * Handles text content for DOM elements by creating text meshes and textures
   * @param dom - BabylonDOM interface
   * @param render - BabylonRender interface
   * @param element - DOM element containing text content
   * @param mesh - The parent mesh to attach text to
   * @param styles - Style rules for text styling
   */
  private handleTextContent(dom: BabylonDOM, render: BabylonRender, element: DOMElement, mesh: Mesh, styles: StyleRule[]): void {
    if (!element.textContent || element.textContent.trim() === '') {
      return; // No text content to render
    }

    if (!element.id) {
      console.warn('⚠️ Text content found but element has no ID, skipping text rendering');
      return;
    }

    try {
      console.log(`📝 Processing text content for element ${element.id}: "${element.textContent.substring(0, 50)}..."`);

      // Validate text element
      const validation = this.validateTextElement(element);
      if (!validation.isValid) {
        console.error(`❌ Text element validation failed for ${element.id}:`, validation.errors);
        return;
      }

      // Get merged style for text properties (including inheritance)
      const textStyle = this.getInheritedTextStyle(element, styles);
      
      // Derive available content box (CSS px)
      const elementDims = dom.context.elementDimensions.get(element.id);
      const paddingPx = elementDims?.padding ?? { top: 0, right: 0, bottom: 0, left: 0 };
      const availableWidthPx = elementDims
        ? Math.max(0, elementDims.width - (paddingPx.left + paddingPx.right))
        : undefined;
      const availableHeightPx = elementDims
        ? Math.max(0, elementDims.height - (paddingPx.top + paddingPx.bottom))
        : undefined;

      // Render text to texture using available width for wrapping
      const textTexture = this.textRenderingService.renderTextToTexture(
        element,
        element.textContent,
        textStyle,
        availableWidthPx
      );
      
      // Measure text dimensions (CSS px)
      const textStyleProperties = this.textRenderingService['parseElementTextStyle'](element, textStyle);
      const measuredDimensions = this.textRenderingService.calculateTextDimensions(
        element.textContent,
        textStyleProperties,
        availableWidthPx
      );

      // Clamp to available content box
      const targetWidthPx = availableWidthPx !== undefined
        ? Math.min(measuredDimensions.width, availableWidthPx)
        : measuredDimensions.width;
      const targetHeightPx = availableHeightPx !== undefined
        ? Math.min(measuredDimensions.height, availableHeightPx)
        : measuredDimensions.height;

      const finalDimensions = {
        width: targetWidthPx,
        height: targetHeightPx,
        rawWidth: measuredDimensions.width,
        rawHeight: measuredDimensions.height
      };

      // Create text mesh using BabylonMeshService
      const textMesh = this.createTextMesh(element.id, textTexture, finalDimensions, render);
      
      // Position text mesh relative to parent element
      this.positionTextMesh(textMesh, mesh, finalDimensions, textStyle, paddingPx, elementDims, render);
      
      // Store text rendering context
      dom.context.textMeshes.set(element.id, textMesh);
      dom.context.textTextures.set(element.id, textTexture);
      dom.context.textContent.set(element.id, element.textContent);
      
      console.log(`✅ Text rendering complete for ${element.id}: ${finalDimensions.width.toFixed(2)}x${finalDimensions.height.toFixed(2)} (raw: ${finalDimensions.rawWidth.toFixed(2)}x${finalDimensions.rawHeight.toFixed(2)})`);
    } catch (error) {
      console.error(`❌ Error handling text content for ${element.id}:`, error);
    }
  }

  /**
   * Updates text content for an existing element
   * @param dom - BabylonDOM interface
   * @param render - BabylonRender interface
   * @param elementId - ID of the element to update
   * @param newContent - New text content
   */
  private updateTextContent(dom: BabylonDOM, render: BabylonRender, elementId: string, newContent: string): void {
    try {
      console.log(`🔄 Updating text content for ${elementId}: "${newContent.substring(0, 50)}..."`);

      // Get existing text mesh and texture
      const existingTextMesh = dom.context.textMeshes.get(elementId);
      const existingTexture = dom.context.textTextures.get(elementId);
      
      if (!existingTextMesh || !existingTexture) {
        console.warn(`⚠️ No existing text mesh/texture found for ${elementId}, cannot update`);
        return;
      }

      // Dispose old texture
      existingTexture.dispose();
      dom.context.textTextures.delete(elementId);

      // Get element and parent mesh
      const parentMesh = dom.context.elements.get(elementId);
      if (!parentMesh) {
        console.error(`❌ Parent mesh not found for ${elementId}`);
        return;
      }

      // Create mock element for text rendering (we need the element structure)
      const elementType = dom.context.elementTypes.get(elementId) || 'div';
      const mockElement: DOMElement = {
        id: elementId,
        type: elementType as any,
        textContent: newContent
      };

      // Get style for text properties
      const elementStyles = dom.context.elementStyles.get(elementId);
      const textStyle = elementStyles?.normal;
      
      // Calculate maximum width for text wrapping
      const elementDims = dom.context.elementDimensions.get(elementId);
      const maxWidth = elementDims ? elementDims.width - (elementDims.padding.left + elementDims.padding.right) : undefined;

      // Render new text to texture
      const newTextTexture = this.textRenderingService.renderTextToTexture(mockElement, newContent, textStyle, maxWidth);
      
      // Update text mesh material with new texture
      if (existingTextMesh.material) {
        const material = existingTextMesh.material as BABYLON.StandardMaterial;
        material.diffuseTexture = newTextTexture;
      }
      
      // Update stored context
      dom.context.textTextures.set(elementId, newTextTexture);
      dom.context.textContent.set(elementId, newContent);
      
      console.log(`✅ Text content updated for ${elementId}`);
    } catch (error) {
      console.error(`❌ Error updating text content for ${elementId}:`, error);
    }
  }

  /**
   * Validates a text element for proper text rendering
   * @param element - DOM element to validate
   * @returns Validation result with errors if any
   */
  private validateTextElement(element: DOMElement): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for required properties
    if (!element.id) {
      errors.push('Element must have an ID for text rendering');
    }

    if (!element.textContent) {
      errors.push('Element must have textContent property');
    }

    // Check for valid text content
    if (element.textContent && typeof element.textContent !== 'string') {
      errors.push('textContent must be a string');
    }

    // Check for extremely long text that might cause performance issues
    if (element.textContent && element.textContent.length > 10000) {
      errors.push('Text content is too long (>10000 characters), consider splitting into multiple elements');
    }

    // Validate element type supports text content
    const textSupportedTypes = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'a', 'button'];
    if (!textSupportedTypes.includes(element.type)) {
      console.warn(`⚠️ Element type '${element.type}' may not be optimal for text content`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets inherited text style properties from element and parent styles
   * @param element - DOM element to get styles for
   * @param styles - Available style rules
   * @returns Merged style rule with text properties
   */
  private getInheritedTextStyle(element: DOMElement, styles: StyleRule[]): StyleRule {
    // Start with default text style
    let inheritedStyle: StyleRule = {
      selector: element.id ? `#${element.id}` : element.type,
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      textAlign: 'left',
      lineHeight: '1.2',
      letterSpacing: '0px',
      wordSpacing: '0px',
      textDecoration: 'none',
      textTransform: 'none'
    };

    // Apply element type defaults
    if (element.type === 'h1') {
      inheritedStyle.fontSize = '32px';
      inheritedStyle.fontWeight = 'bold';
    } else if (element.type === 'h2') {
      inheritedStyle.fontSize = '24px';
      inheritedStyle.fontWeight = 'bold';
    } else if (element.type === 'h3') {
      inheritedStyle.fontSize = '20px';
      inheritedStyle.fontWeight = 'bold';
    } else if (element.type === 'a') {
      inheritedStyle.color = '#0066cc';
      inheritedStyle.textDecoration = 'underline';
    }

    // Apply class styles
    if (element.class) {
      const classNames = element.class.split(' ').filter(c => c.trim());
      for (const className of classNames) {
        const classStyle = styles.find(s => s.selector === `.${className}` || s.selector === className);
        if (classStyle) {
          inheritedStyle = { ...inheritedStyle, ...classStyle };
        }
      }
    }

    // Apply ID styles (highest priority)
    if (element.id) {
      const idStyle = styles.find(s => s.selector === `#${element.id}`);
      if (idStyle) {
        inheritedStyle = { ...inheritedStyle, ...idStyle };
      }
    }

    return inheritedStyle;
  }

  /**
   * Creates a text mesh using BabylonJS plane geometry
   * @param elementId - ID of the element
   * @param texture - Text texture to apply
   * @param dimensions - Text dimensions for mesh sizing
   * @param render - BabylonRender interface
   * @returns Created text mesh
   */
  private createTextMesh(elementId: string, texture: BABYLON.Texture, dimensions: any, render: BabylonRender): Mesh {
    if (!render.scene) {
      throw new Error('Scene not initialized for text mesh creation');
    }

    // Convert pixel dimensions to world units
    const scaleFactor = render.actions.camera.getPixelToWorldScale();
    const worldWidth = dimensions.width * scaleFactor;
    const worldHeight = dimensions.height * scaleFactor;

    // Create plane mesh for text
    const textMesh = BABYLON.MeshBuilder.CreatePlane(`${elementId}-text`, {
      width: worldWidth,
      height: worldHeight,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, render.scene);

    // Create material with text texture
    const material = new BABYLON.StandardMaterial(`${elementId}-text-material`, render.scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    material.specularColor = new BABYLON.Color3(0, 0, 0); // No specular highlights
    material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Slight emissive for visibility

    textMesh.material = material;
    textMesh.isPickable = false; // Text meshes should not interfere with element picking

    console.log(`🎨 Created text mesh: ${textMesh.name} (${worldWidth.toFixed(3)}x${worldHeight.toFixed(3)} world units)`);

    return textMesh;
  }

  /**
   * Positions text mesh relative to parent element based on text alignment
   * @param textMesh - Text mesh to position
   * @param parentMesh - Parent element mesh
   * @param dimensions - Text dimensions
   * @param style - Text style for alignment
   */
  private positionTextMesh(
    textMesh: Mesh,
    parentMesh: Mesh,
    dimensions: { width: number; height: number },
    style?: StyleRule,
    paddingPx: { top: number; right: number; bottom: number; left: number } = { top: 0, right: 0, bottom: 0, left: 0 },
    elementDims?: { width: number; height: number; padding: { top: number; right: number; bottom: number; left: number } },
    render?: BabylonRender
  ): void {
    // Parent text mesh to element mesh
    textMesh.parent = parentMesh;

    const scale = render?.actions.camera.getPixelToWorldScale() || 1;

    const parentBounds = parentMesh.getBoundingInfo().boundingBox;
    const parentWidthWorld = parentBounds.maximum.x - parentBounds.minimum.x;
    const parentHeightWorld = parentBounds.maximum.y - parentBounds.minimum.y;

    const parentWidthPx = elementDims?.width ?? (parentWidthWorld / scale);
    const parentHeightPx = elementDims?.height ?? (parentHeightWorld / scale);

    const effectivePadding = {
      top: paddingPx.top ?? 0,
      right: paddingPx.right ?? 0,
      bottom: paddingPx.bottom ?? 0,
      left: paddingPx.left ?? 0
    };

    const contentWidthPx = Math.max(0, parentWidthPx - (effectivePadding.left + effectivePadding.right));
    const contentHeightPx = Math.max(0, parentHeightPx - (effectivePadding.top + effectivePadding.bottom));

    const textWidthPx = dimensions.width;
    const textHeightPx = dimensions.height;

    const textAlign = (style?.textAlign ?? 'left').toLowerCase();
    let offsetXPx: number;
    switch (textAlign) {
      case 'right':
        offsetXPx = (parentWidthPx / 2) - effectivePadding.right - (textWidthPx / 2);
        break;
      case 'center':
        offsetXPx = (-parentWidthPx / 2) + effectivePadding.left + (contentWidthPx / 2);
        break;
      default: // left alignment
        offsetXPx = (-parentWidthPx / 2) + effectivePadding.left + (textWidthPx / 2);
        break;
    }

    const verticalAlign = (style?.verticalAlign ?? 'top').toLowerCase();
    let offsetYPx: number;
    switch (verticalAlign) {
      case 'bottom':
        offsetYPx = (-parentHeightPx / 2) + effectivePadding.bottom + (textHeightPx / 2);
        break;
      case 'middle':
      case 'center':
        offsetYPx = (parentHeightPx / 2) - effectivePadding.top - (contentHeightPx / 2);
        break;
      case 'baseline':
        // Approximate baseline as bottom alignment for now
        offsetYPx = (-parentHeightPx / 2) + effectivePadding.bottom + (textHeightPx / 2);
        break;
      default: // top alignment
        offsetYPx = (parentHeightPx / 2) - effectivePadding.top - (textHeightPx / 2);
        break;
    }

    // Position text mesh relative to parent (slightly in front to avoid z-fighting)
    textMesh.position.x = offsetXPx * scale;
    textMesh.position.y = offsetYPx * scale;
    textMesh.position.z = 0.001; // Slightly in front of parent element

    console.log(`📍 Positioned text mesh at offset (${textMesh.position.x.toFixed(3)}, ${textMesh.position.y.toFixed(3)}, 0.001) with alignment: ${textAlign}/${verticalAlign}`);
  }

  cleanup(): void {
    this.clearElements();
    this.scene = undefined;
  }
}