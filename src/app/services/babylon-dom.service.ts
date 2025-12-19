import { Injectable } from '@angular/core';
import { Scene, Color3, Vector3, Mesh, ActionManager, ExecuteCodeAction, Texture, StandardMaterial, Material, PointerEventTypes } from '@babylonjs/core';
import { BabylonCameraService } from './babylon-camera.service';
import { BabylonMeshService } from './babylon-mesh.service';
import { TextureService } from './texture.service';

export interface DOMElement {
  type: 'div' | 'section' | 'article' | 'header' | 'footer' | 'nav' | 'main' | 'ul' | 'ol' | 'li' | 'img' | 'a';
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
  // Border radius support
  borderRadius?: string;
  'border-radius'?: string;
  // Polygon type support (custom extension beyond CSS)
  polygonType?: string;
  // Box shadow support
  boxShadow?: string;
  'box-shadow'?: string;
  // Transform support
  transform?: string;
  // List support
  listStyleType?: string;
  'list-style-type'?: string;
  listItemSpacing?: string; // Custom property for spacing between list items
  // Image support
  src?: string; // Image source URL
  objectFit?: string; // How image fits within container ('cover', 'contain', etc.)
  // Anchor/Link support
  href?: string; // URL to navigate to (absolute or relative)
  target?: string; // Where to open the link ('_blank', '_self', etc.)
  onclick?: string; // JavaScript-like function call or action name
  // Flexbox layout support
  display?: string; // 'flex', 'block', 'inline', etc.
  flexDirection?: string; // 'row', 'column', 'row-reverse', 'column-reverse'
  'flex-direction'?: string;
  justifyContent?: string; // 'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'
  'justify-content'?: string;
  alignItems?: string; // 'flex-start', 'flex-end', 'center', 'stretch', 'baseline'
  'align-items'?: string;
  flexWrap?: string; // 'nowrap', 'wrap', 'wrap-reverse'
  'flex-wrap'?: string;
  // Gap properties
  gap?: string; // Shorthand for row-gap and column-gap
  rowGap?: string; // Gap between rows (cross-axis in row layouts)
  'row-gap'?: string;
  columnGap?: string; // Gap between columns (main-axis in row layouts)
  'column-gap'?: string;
  // Flex item properties
  flexGrow?: string; // Flex grow factor
  'flex-grow'?: string;
  flexShrink?: string; // Flex shrink factor
  'flex-shrink'?: string;
  flexBasis?: string; // Flex basis (initial size)
  'flex-basis'?: string;
  flex?: string; // Shorthand for flex-grow, flex-shrink, flex-basis
}

export interface TransformData {
  translate: { x: number; y: number; z: number };
  rotate: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
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
  private elementTypes: Map<string, string> = new Map(); // Store element types for hover handling
  private elementDimensions: Map<string, { width: number, height: number, padding: { top: number; right: number; bottom: number; left: number } }> = new Map();

  constructor(private textureService: TextureService) {}

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

    console.log('🏗️ Creating site from data:', siteData);

    // Clear existing elements and state
    this.clearElements();
    this.hoverStates.clear();
    this.elementStyles.clear();
    
    // Parse and organize styles
    console.log('📝 Parsing styles...');
    this.parseStyles(siteData.styles);
    console.log('📝 Parsed styles. ElementStyles map:', this.elementStyles);

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

  private processChildren(children: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement?: DOMElement): void {
    console.log(`🔄 Processing ${children.length} children for parent:`, parent.name);
    console.log(`🔍 Children details:`, children.map(c => `${c.type}#${c.id}`));
    
    // Check if parent is a list container (ul or ol) - then apply automatic stacking
    const isListContainer = parentElement?.type === 'ul' || parentElement?.type === 'ol';
    
    // Check if parent is a flex container
    const isFlexContainer = parentElement ? this.isFlexContainer(parentElement, styles) : false;
    
    console.log(`🔍 Parent element type: ${parentElement?.type}, isListContainer: ${isListContainer}, isFlexContainer: ${isFlexContainer}`);
    
    if (isListContainer) {
      console.log(`📋 Parent is list container (${parentElement?.type}), applying automatic stacking to ${children.length} items`);
      try {
        this.processListChildren(children, parent, styles, parentElement.type as 'ul' | 'ol');
        console.log(`✅ Completed list processing for ${parentElement?.type}`);
      } catch (error) {
        console.error(`❌ Error in processListChildren for ${parentElement?.type}:`, error);
        throw error;
      }
    } else if (isFlexContainer && parentElement) {
      console.log(`🔀 Parent is flex container, applying flexbox layout to ${children.length} items`);
      try {
        this.processFlexChildren(children, parent, styles, parentElement);
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
          const childMesh = this.createElement(child, parent, styles);
          console.log(`✅ Created child mesh:`, childMesh.name, `Position:`, childMesh.position);
          
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

  private getElementByMeshName(meshName: string): DOMElement | null {
    // Extract element info from mesh name (format: "elementType-elementId" or just "elementId")
    const parts = meshName.split('-');
    if (parts.length >= 2) {
      // Try to find the element type from the stored elementTypes map
      const elementId = parts[parts.length - 1]; // Last part is usually the ID
      const elementType = this.elementTypes.get(elementId);
      if (elementType) {
        return { type: elementType as any, id: elementId };
      }
    }
    return null;
  }

  private processListChildren(children: DOMElement[], parent: Mesh, styles: StyleRule[], listType: 'ul' | 'ol'): void {
    console.log(`📋 Processing ${children.length} list items in ${listType} container "${parent.name}"`);
    
    try {
      // Get list item spacing from parent style
      const listItemSpacing = this.parseListItemSpacing(parent);
      console.log(`📐 List item spacing:`, listItemSpacing);
      
      // Calculate automatic item height based on container size and number of items
      const containerHeight = this.getContainerAvailableHeight(parent);
      const automaticItemHeight = this.calculateAutomaticItemHeight(containerHeight, children.length, listItemSpacing);
      console.log(`📊 ${listType.toUpperCase()} Container "${parent.name}": height=${containerHeight}px, items=${children.length}, auto item height=${automaticItemHeight}px`);
      
      let currentY = 0; // Start at top of container
      
      children.forEach((child, index) => {
        console.log(`📝 Processing list item ${index + 1}/${children.length}: ${child.type}#${child.id}`);
        console.log(`📍 Item ${index + 1} positioning: currentY=${currentY}, height=${automaticItemHeight}, spacing=${listItemSpacing}`);
        
        try {
          // Create the list item with automatic positioning and height
          const listItemMesh = this.createListItem(child, parent, styles, currentY, index, listType, automaticItemHeight);
          console.log(`✅ Created list item mesh:`, listItemMesh.name, `Position:`, listItemMesh.position);
          console.log(`📏 Item ${index + 1} final position: x=${listItemMesh.position.x}, y=${listItemMesh.position.y}, z=${listItemMesh.position.z}`);
          
          // Move to next item position
          console.log(`📐 Item ${index + 1} height: ${automaticItemHeight}, moving currentY from ${currentY} to ${currentY + automaticItemHeight + listItemSpacing}`);
          currentY += automaticItemHeight + listItemSpacing;
          
          // Process nested children if any
          if (child.children && child.children.length > 0) {
            console.log(`🔄 List item ${child.id} has ${child.children.length} sub-children`);
            this.processChildren(child.children, listItemMesh, styles, child);
          }
        } catch (error) {
          console.error(`❌ Error processing list item ${child.type}#${child.id}:`, error);
          throw error;
        }
      });
      
      console.log(`✅ Successfully processed all ${children.length} list items for ${listType}`);
      console.log(`📊 Final positioning summary for ${listType}: ${children.length} items, final currentY=${currentY}`);
      
      // Check if items fit within container bounds
      const totalContentHeight = currentY - listItemSpacing; // Remove spacing after last item
      console.log(`📏 Container ${listType} available height: ${containerHeight}px, total content height: ${totalContentHeight}px`);
      if (totalContentHeight <= containerHeight) {
        console.log(`✅ All items fit perfectly within ${listType} container`);
      } else {
        console.warn(`⚠️ Content overflow in ${listType}: needed ${totalContentHeight}px but container has ${containerHeight}px`);
      }
    } catch (error) {
      console.error(`❌ Critical error in processListChildren for ${listType}:`, error);
      throw error;
    }
  }

  private getContainerAvailableHeight(parentMesh: Mesh): number {
    // Get the container's actual content height (excluding padding)
    const parentId = this.getElementIdFromMeshName(parentMesh.name);
    console.log(`🔍 Getting container height for: ${parentMesh.name}, extracted ID: ${parentId}`);
    
    if (parentId) {
      const parentStyle = this.elementStyles.get(parentId)?.normal;
      console.log(`📋 Parent style found:`, parentStyle);
      
      if (parentStyle) {
        // Get the container's dimensions from our element dimensions cache
        const containerDimensions = this.elementDimensions.get(parentId);
        console.log(`📐 Container dimensions:`, containerDimensions);
        
        if (containerDimensions) {
          // Calculate available height by subtracting padding
          const padding = containerDimensions.padding || { top: 0, right: 0, bottom: 0, left: 0 };
          const availableHeight = containerDimensions.height - padding.top - padding.bottom;
          console.log(`📏 Calculated available height: ${availableHeight} (total: ${containerDimensions.height}, padding: ${padding.top + padding.bottom})`);
          return Math.max(availableHeight, 50); // Minimum 50px height
        }
      }
    }
    
    // Fallback: estimate based on world dimensions and use a reasonable default
    const worldHeight = Math.abs(parentMesh.getBoundingInfo().maximum.y - parentMesh.getBoundingInfo().minimum.y);
    const estimatedPixelHeight = worldHeight / (this.cameraService?.getPixelToWorldScale() || 0.03);
    const fallbackHeight = Math.max(estimatedPixelHeight * 0.8, 200); // Use 200px as reasonable fallback
    console.log(`⚠️ Using fallback height calculation: ${fallbackHeight}px (world: ${worldHeight}, scale: ${this.cameraService?.getPixelToWorldScale()})`);
    return fallbackHeight;
  }

  private calculateAutomaticItemHeight(containerHeight: number, itemCount: number, spacing: number): number {
    console.log(`🧮 AUTO HEIGHT CALCULATION:`);
    console.log(`   Container height: ${containerHeight}px`);
    console.log(`   Number of items: ${itemCount}`);
    console.log(`   Spacing between items: ${spacing}px`);
    
    // Calculate how much space is needed for spacing
    const totalSpacing = spacing * (itemCount - 1); // n-1 spaces between n items
    console.log(`   Total spacing needed: ${totalSpacing}px (${spacing}px × ${itemCount - 1} gaps)`);
    
    // Calculate available space for actual items
    const availableForItems = containerHeight - totalSpacing;
    console.log(`   Available space for items: ${availableForItems}px`);
    
    // Distribute evenly among items
    const rawItemHeight = availableForItems / itemCount;
    // Use a minimum that's proportional to container size (10% of container height)
    const minHeight = Math.max(containerHeight * 0.1, 8); // Minimum 8px, but proportional to container
    const itemHeight = Math.max(rawItemHeight, minHeight); 
    const finalHeight = Math.floor(itemHeight); // Use whole pixels
    
    console.log(`   Per-item calculation: ${availableForItems}px ÷ ${itemCount} = ${rawItemHeight}px`);
    console.log(`   Minimum height: ${minHeight}px (10% of container or 8px)`);
    console.log(`   Final item height: ${finalHeight}px (after min ${minHeight}px clamp and floor)`);
    console.log(`🧮 ================================`);
    return finalHeight;
  }

  private parseListItemSpacing(parentMesh: Mesh): number {
    // Try to get spacing from parent's style, fallback to default
    const parentId = this.getElementIdFromMeshName(parentMesh.name);
    if (parentId) {
      const parentStyle = this.elementStyles.get(parentId)?.normal;
      const spacing = parentStyle?.listItemSpacing || '4px';
      return this.parsePixelValue(spacing);
    }
    return 4; // Default spacing in pixels
  }

  private getElementIdFromMeshName(meshName: string): string | null {
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

  private createListItem(element: DOMElement, parent: Mesh, styles: StyleRule[], yOffset: number, index: number, listType: 'ul' | 'ol', automaticHeight?: number): Mesh {
    // Create modified element styles for automatic positioning
    const elementStyles = element.id ? this.elementStyles.get(element.id) : undefined;
    const explicitStyle = elementStyles?.normal;
    
    // Get default styles and merge
    const typeDefaults = this.getElementTypeDefaults(element.type);
    
    // Create auto-positioned style - modify the explicit style to add automatic positioning
    const autoPositionedStyle: StyleRule = {
      selector: element.id ? `#${element.id}` : element.type,
      ...typeDefaults,
      ...explicitStyle,
      top: `${yOffset}px`,              // Automatic Y positioning
      left: '10%',                      // Leave space for bullet/number
      width: '85%',                     // Use most of container width
      ...(automaticHeight ? { height: `${automaticHeight}px` } : {}), // Add automatic height if provided
    };
    
    // Temporarily store the auto-positioned style
    const tempId = element.id || `temp-list-item-${Date.now()}`;
    const tempStyles = element.id ? this.elementStyles.get(element.id) : undefined;
    
    // Override stored styles temporarily
    if (element.id) {
      this.elementStyles.set(element.id, {
        normal: autoPositionedStyle,
        hover: tempStyles?.hover
      });
    }
    
    // Create the element using existing createElement method
    const listItemMesh = this.createElement(element, parent, styles);
    
    // Restore original styles
    if (element.id && tempStyles) {
      this.elementStyles.set(element.id, tempStyles);
    }
    
    // Add bullet point or number indicator
    this.addListIndicator(listItemMesh, listType, index, autoPositionedStyle);
    
    return listItemMesh;
  }

  private getListItemHeight(element: DOMElement, styles: StyleRule[]): number {
    // Calculate approximate height of list item
    const elementStyles = element.id ? this.elementStyles.get(element.id) : undefined;
    const style = elementStyles?.normal;
    
    // Smaller base height to fit more items in container
    let height = 24; // Reduced from 32 to 24 pixels
    
    // Add padding if specified
    if (style?.padding) {
      const padding = this.parseSinglePadding(style.padding);
      height += padding * 2; // top + bottom
    }
    
    return height;
  }

  private parseSinglePadding(padding: string): number {
    // Simple padding parser for single values like "8px"
    return this.parsePixelValue(padding);
  }

  private parsePixelValue(value: string): number {
    // Parse pixel values like "8px", "16px", etc.
    if (typeof value === 'string' && value.endsWith('px')) {
      return parseFloat(value.replace('px', ''));
    }
    // If no unit, assume pixels
    return parseFloat(value) || 0;
  }

  private addListIndicator(listItemMesh: Mesh, listType: 'ul' | 'ol', index: number, style: StyleRule): void {
    if (!this.meshService) return;
    
    console.log(`🔘 Adding ${listType} indicator for item ${index + 1}`);
    
    // Create indicator based on list type
    let indicatorMesh: any;
    const indicatorSize = 0.6; // Larger indicator size for better visibility
    
    if (listType === 'ul') {
      console.log(`🔵 Creating BULLET (circle) for ul item ${index + 1}`);
      // Create bullet point (small circle/disc)
      indicatorMesh = this.meshService.createPolygon(
        `${listItemMesh.name}-bullet`,
        'circle',
        indicatorSize,
        indicatorSize,
        0
      );
    } else {
      console.log(`🔴 Creating NUMBER (rectangle) for ol item ${index + 1}`);
      // Create number indicator (small rectangle for now, will be text later)
      indicatorMesh = this.meshService.createPolygon(
        `${listItemMesh.name}-number-${index + 1}`,
        'rectangle',
        indicatorSize,
        indicatorSize,
        0.05
      );
    }
    
    // Position indicator to the left of the list item
    const indicatorX = -2; // Position to the left
    const indicatorY = 0;  // Center vertically with list item
    const indicatorZ = 0.001; // Slightly in front
    
    this.meshService.positionMesh(indicatorMesh, indicatorX, indicatorY, indicatorZ);
    this.meshService.parentMesh(indicatorMesh, listItemMesh);
    
    // Apply indicator styling with more debugging
    const indicatorColor = listType === 'ul' ? '#3498db' : '#e74c3c'; // Blue for bullets, red for numbers
    console.log(`🎨 Applying ${listType} indicator color: ${indicatorColor}`);
    const parsedColor = this.parseBackgroundColor(indicatorColor);
    console.log(`🎨 Parsed color:`, parsedColor, `(r=${parsedColor.r}, g=${parsedColor.g}, b=${parsedColor.b})`);
    
    const indicatorMaterial = this.meshService.createMaterial(
      `${listItemMesh.name}-indicator-material-${Date.now()}`, // Add timestamp to avoid caching
      parsedColor,
      undefined,
      1.0
    );
    indicatorMesh.material = indicatorMaterial;
    
    console.log(`✅ Added ${listType} indicator:`, indicatorMesh.name, `with material:`, indicatorMaterial.name);
  }

  private createElement(element: DOMElement, parent: Mesh, styles: StyleRule[], flexPosition?: { x: number; y: number; z: number }, flexSize?: { width: number; height: number }): Mesh {
    if (!this.scene || !this.meshService) throw new Error('Services not initialized');

    // Get element styles (normal and hover)
    const elementStyles = element.id ? this.elementStyles.get(element.id) : undefined;
    const explicitStyle = elementStyles?.normal;
    
    // Get default styles for this element type
    const typeDefaults = this.getElementTypeDefaults(element.type);
    console.log(`🎨 Type defaults for ${element.type}:`, typeDefaults);
    
    // Merge defaults with explicit styles (explicit styles override defaults)
    // Only use explicit style properties if they exist
    const style: StyleRule = {
      selector: element.id ? `#${element.id}` : element.type,
      ...typeDefaults,
      ...explicitStyle
    };
    
    console.log(`🏗️ Creating ${element.type} element${element.id ? ` #${element.id}` : ''}`);
    console.log(`📋 Explicit style was:`, explicitStyle);
    console.log(`🎨 Type defaults were:`, typeDefaults);
    console.log(`🔀 Final merged style:`, style);
    
    // Calculate dimensions and position relative to parent
    const dimensions = flexSize ? 
      { ...this.calculateDimensions(style, parent), width: flexSize.width, height: flexSize.height } : 
      this.calculateDimensions(style, parent);
    
    if (flexSize) {
      console.log(`🔀 Using flex dimensions for ${element.id}: ${flexSize.width.toFixed(2)}x${flexSize.height.toFixed(2)} (overriding calculated: ${dimensions.width.toFixed(2)}x${dimensions.height.toFixed(2)})`);
    }
    
    // Parse border radius and scale it to world coordinates
    const borderRadiusPixels = this.parseBorderRadius(style?.borderRadius || style?.['border-radius']);
    
    // Scale border radius from pixels to world coordinates using a reasonable conversion factor
    // Based on typical screen dimensions, 1 world unit ≈ 100-200 pixels in our coordinate system
    const pixelToWorldScale = 0.01; // Adjust this factor to get the right visual balance
    const borderRadius = borderRadiusPixels * pixelToWorldScale;
    
    console.log(`🔧 Border radius scaling: ${borderRadiusPixels}px → ${borderRadius.toFixed(3)} world units (scale: ${pixelToWorldScale}, shape: ${dimensions.width.toFixed(1)}×${dimensions.height.toFixed(1)})`);
    
    // Parse polygon properties
    const polygonType = this.parsePolygonType(style?.polygonType);
    
    // Create the mesh based on element type
    let mesh: any;
    
    console.log(`🧩 Processing element with type: '${element.type}' and id: '${element.id}'`);
    
    if (element.type === 'img') {
      // Create image element with texture support
      mesh = this.createImageElement(element, style, dimensions, borderRadius);
    } else if (element.type === 'a') {
      // Create anchor element (button-like for now)
      mesh = this.createAnchorElement(element, style, dimensions, borderRadius);
    } else if (polygonType === 'rectangle') {
      // Use polygon system for rectangles too to unify border handling
      mesh = this.meshService.createPolygon(
        element.id || `element-${Date.now()}`,
        'rectangle',
        dimensions.width,
        dimensions.height,
        borderRadius
      );
    } else {
      // Create polygon mesh with border radius support
      mesh = this.meshService.createPolygon(
        element.id || `element-${Date.now()}`,
        polygonType,
        dimensions.width,
        dimensions.height,
        borderRadius
      );
    }

    // Calculate Z position based on z-index, but prefer flex position Z if available
    const zIndex = this.parseZIndex(style?.zIndex || style?.['z-index']);
    const baseZPosition = this.calculateZPosition(zIndex);
    
    // Use flex position Z if provided (it includes index-based layering), otherwise use calculated Z
    const zPosition = flexPosition ? flexPosition.z : baseZPosition;
    
    console.log(`🎯 Z-positioning for ${element.id}:`, {
      zIndex: zIndex,
      baseZPosition: baseZPosition,
      flexZPosition: flexPosition?.z,
      finalZPosition: zPosition,
      hasZIndexStyle: !!(style?.zIndex || style?.['z-index'])
    });
    
    // Position relative to parent (parent's coordinate system)
    // Calculate actual Z position that will be used for the element
    let actualZPosition = zPosition;
    
    // Use flex positioning if provided, otherwise use normal positioning
    if (flexPosition) {
      // For flex positioning, use the flex coordinates and Z position directly
      // The Z position already includes index-based layering when coming from flex layout
      actualZPosition = zPosition; // Store the actual Z position used
      console.log(`🔀 Using flex positioning for ${element.id}: (${flexPosition.x.toFixed(2)}, ${flexPosition.y.toFixed(2)}, ${zPosition.toFixed(6)})`);
      this.meshService.positionMesh(mesh, flexPosition.x, flexPosition.y, zPosition);
    } else {
      this.meshService.positionMesh(mesh, dimensions.x, dimensions.y, zPosition);
    }

    // Parent the mesh so it inherits parent's transformations
    this.meshService.parentMesh(mesh, parent);

    // Apply material (start with normal state) - pass merged style that includes type defaults
    this.applyElementMaterial(mesh, element, false, style);

    // Apply transforms if specified
    const transform = this.parseTransform(style?.transform);
    if (transform) {
      this.applyTransforms(mesh, transform);
    }

    // Add box shadow if specified
    const boxShadow = this.parseBoxShadow(style?.boxShadow || style?.['box-shadow']);
    if (boxShadow) {
      // Scale box shadow values from pixels to world coordinates
      const scaledOffsetX = boxShadow.offsetX * pixelToWorldScale;
      const scaledOffsetY = boxShadow.offsetY * pixelToWorldScale;
      const scaledBlur = boxShadow.blur * pixelToWorldScale;
      
      console.log(`🎭 Box shadow scaling for ${element.id}: offset (${boxShadow.offsetX}px, ${boxShadow.offsetY}px) → (${scaledOffsetX.toFixed(3)}, ${scaledOffsetY.toFixed(3)}) world units, blur ${boxShadow.blur}px → ${scaledBlur.toFixed(3)} world units`);
      
      const shadowMesh = this.meshService.createShadow(
        `${element.id}-shadow`,
        dimensions.width,
        dimensions.height,
        scaledOffsetX,
        scaledOffsetY,
        scaledBlur,
        boxShadow.color,
        polygonType,
        borderRadius
      );
      
      // Position shadow behind the element with offset
      const shadowZ = zPosition - 0.001; // Place slightly behind
      const shadowX = flexPosition ? flexPosition.x + scaledOffsetX : dimensions.x + scaledOffsetX;
      const shadowY = flexPosition ? flexPosition.y - scaledOffsetY : dimensions.y - scaledOffsetY;
      this.meshService.positionMesh(shadowMesh, shadowX, shadowY, shadowZ);
      this.meshService.parentMesh(shadowMesh, parent);
    }

    // Add borders if specified
    const borderElementStyles = element.id ? this.elementStyles.get(element.id) : undefined;
    const borderProperties = this.parseBorderProperties(borderElementStyles?.normal);
    
    if (borderProperties.width > 0) {
      console.log(`Creating border for ${element.id} with width ${borderProperties.width}`);
      
      // Use unified polygon border system for all shapes
      const borderMeshes = this.meshService.createPolygonBorder(
        `${element.id}-border`,
        polygonType,
        dimensions.width,
        dimensions.height,
        borderProperties.width,
        borderRadius
      );
      
      // Calculate Z position for borders (slightly above element for visibility)
      // Use the actual Z position that was calculated for the element
      const borderZPosition = actualZPosition + 0.001; // Borders with significant offset above element
      
      // Position border frames around the element
      // Use flex positioning if provided, otherwise use normal positioning
      const borderX = flexPosition ? flexPosition.x : dimensions.x;
      const borderY = flexPosition ? flexPosition.y : dimensions.y;
      
      this.meshService.positionBorderFrames(
        borderMeshes,
        borderX,
        borderY,
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
      this.elementTypes.set(element.id, element.type); // Store element type for hover handling
      
      // Store element dimensions and padding info for child calculations
      this.elementDimensions.set(element.id, {
        width: dimensions.width,
        height: dimensions.height,
        padding: dimensions.padding
      });
    }

    return mesh;
  }
  
  private applyElementMaterial(mesh: Mesh, element: DOMElement, isHovered: boolean, mergedStyle?: StyleRule): void {
    if (!this.meshService || !element.id) return;
    
    // Special handling for image elements - preserve textures and only modify properties like opacity
    if (element.type === 'img') {
      this.applyImageMaterialUpdate(mesh, element, isHovered, mergedStyle);
      return;
    }

    let activeStyle;
    if (mergedStyle) {
      // Use the merged style that includes type defaults
      activeStyle = mergedStyle;
      
      // If in hover state, apply hover styles on top of merged style
      if (isHovered) {
        const elementStyles = this.elementStyles.get(element.id);
        if (elementStyles?.hover) {
          activeStyle = { ...mergedStyle, ...elementStyles.hover };
        }
      }
    } else {
      // Fallback to stored element styles only (shouldn't happen with new approach)
      const elementStyles = this.elementStyles.get(element.id);
      if (!elementStyles) return;
      activeStyle = isHovered && elementStyles.hover ? elementStyles.hover : elementStyles.normal;
    }
    
    console.log(`🎨 Material creation for ${element.id}, hover: ${isHovered}, background: ${activeStyle?.background}`);
    console.log(`🔍 Active style full object:`, activeStyle);
    
    // Parse opacity from the active style
    const opacity = this.parseOpacity(activeStyle?.opacity);
    
    // Get the background to use - activeStyle should always include type defaults now
    const backgroundToUse = activeStyle?.background;
    
    let material;
    if (backgroundToUse) {
      // Parse background to check if it's a gradient or solid color
      const backgroundData = this.parseGradient(backgroundToUse);
      
      if (backgroundData?.type === 'solid') {
        // Solid color background
        const backgroundColor = this.parseBackgroundColor(backgroundToUse);
        material = this.meshService.createMaterial(`${element.id}-material-${isHovered ? 'hover' : 'normal'}`, backgroundColor, undefined, opacity);
        console.log(`Applied ${element.id} ${isHovered ? 'hover' : 'normal'} solid background:`, backgroundToUse, '-> parsed:', backgroundColor, 'opacity:', opacity);
      } else if (backgroundData?.type === 'linear' || backgroundData?.type === 'radial') {
        // Gradient background - get element dimensions from stored data
        const elementDims = this.elementDimensions.get(element.id);
        const width = elementDims?.width || 100; // Fallback dimensions
        const height = elementDims?.height || 100;
        material = this.meshService.createGradientMaterial(`${element.id}-gradient-${isHovered ? 'hover' : 'normal'}`, backgroundData, opacity, width, height);
        console.log(`Applied ${element.id} ${isHovered ? 'hover' : 'normal'} gradient background:`, backgroundData.type, backgroundData.gradient);
      } else {
        // Fallback for invalid background format
        console.warn(`Invalid background format for ${element.id}: ${backgroundToUse}, using default purple`);
        const fallbackColor = new Color3(0.7, 0.5, 0.9); // Light purple
        material = this.meshService.createMaterial(`${element.id}-material-${isHovered ? 'hover' : 'normal'}`, fallbackColor, undefined, opacity);
      }
    } else {
      // This should not happen if type defaults are working correctly
      console.error(`No background found for ${element.id} (type: ${element.type}) - type defaults may not be working!`);
      const fallbackColor = new Color3(0.7, 0.5, 0.9); // Light purple
      material = this.meshService.createMaterial(`${element.id}-material-${isHovered ? 'hover' : 'normal'}`, fallbackColor, undefined, opacity);
    }
    
    mesh.material = material;
  }

  private applyImageMaterialUpdate(mesh: Mesh, element: DOMElement, isHovered: boolean, mergedStyle?: StyleRule): void {
    if (!mesh.material || !element.id) return;
    
    console.log(`🖼️ Updating image material for ${element.id}, hover: ${isHovered}`);
    
    // Get the active style (merged + hover if needed)
    let activeStyle = mergedStyle;
    if (isHovered && mergedStyle) {
      const elementStyles = this.elementStyles.get(element.id);
      if (elementStyles?.hover) {
        activeStyle = { ...mergedStyle, ...elementStyles.hover };
      }
    }
    
    // For image elements, we want to preserve the existing texture material
    // and only update properties like opacity, scale, etc.
    const existingMaterial = mesh.material as StandardMaterial;
    
    if (existingMaterial) {
      // Update opacity
      const newOpacity = this.parseOpacity(activeStyle?.opacity);
      existingMaterial.alpha = newOpacity;
      
      // Ensure transparency mode is set if opacity < 1
      if (newOpacity < 1.0) {
        existingMaterial.transparencyMode = Material.MATERIAL_ALPHABLEND;
      } else {
        existingMaterial.transparencyMode = Material.MATERIAL_OPAQUE;
      }
      
      console.log(`🎨 Updated image material opacity for ${element.id}: ${newOpacity} (${(newOpacity * 100).toFixed(0)}%)`);
      
      // Handle transform properties (scale, rotation) on the mesh itself
      if (activeStyle?.transform) {
        const transformData = this.parseTransform(activeStyle.transform);
        
        if (transformData) {
          // Apply scale
          if (transformData.scale.x !== 1 || transformData.scale.y !== 1 || transformData.scale.z !== 1) {
            mesh.scaling.x = transformData.scale.x;
            mesh.scaling.y = transformData.scale.y;
            mesh.scaling.z = transformData.scale.z;
            console.log(`🔄 Applied scale to ${element.id}: (${transformData.scale.x}, ${transformData.scale.y}, ${transformData.scale.z})`);
          }
          
          // Apply rotation
          if (transformData.rotate.x !== 0 || transformData.rotate.y !== 0 || transformData.rotate.z !== 0) {
            mesh.rotation.x = transformData.rotate.x;
            mesh.rotation.y = transformData.rotate.y;
            mesh.rotation.z = transformData.rotate.z;
            console.log(`🔄 Applied rotation to ${element.id}: (${transformData.rotate.x}, ${transformData.rotate.y}, ${transformData.rotate.z})`);
          }
        }
      } else {
        // Reset transforms when not in hover state
        mesh.scaling.x = 1;
        mesh.scaling.y = 1;
        mesh.scaling.z = 1;
        mesh.rotation.x = 0;
        mesh.rotation.y = 0;
        mesh.rotation.z = 0;
      }
    }
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
        const elementType = this.elementTypes.get(elementId) || 'div';
        const element = { id: elementId, type: elementType } as DOMElement;
        
        // Get element styles and rebuild merged style with type defaults
        const elementStyles = this.elementStyles.get(elementId);
        const explicitStyle = elementStyles?.normal;
        const typeDefaults = this.getElementTypeDefaults(element.type);
        const mergedStyle: StyleRule = {
          selector: `#${elementId}`,
          ...typeDefaults,
          ...explicitStyle
        };
        
        this.applyElementMaterial(mainMesh, element, true, mergedStyle);
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
        const elementType = this.elementTypes.get(elementId) || 'div';
        const element = { id: elementId, type: elementType } as DOMElement;
        
        // Get element styles and rebuild merged style with type defaults
        const elementStyles = this.elementStyles.get(elementId);
        const explicitStyle = elementStyles?.normal;
        const typeDefaults = this.getElementTypeDefaults(element.type);
        const mergedStyle: StyleRule = {
          selector: `#${elementId}`,
          ...typeDefaults,
          ...explicitStyle
        };
        
        this.applyElementMaterial(mainMesh, element, false, mergedStyle);
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
    
    // Apply a slight reduction to compensate for 3D perspective effects that make borders appear thicker
    const perspectiveAdjustment = 0.8; // Reduce border width by 20% to account for 3D perspective
    return numericValue * scaleFactor * perspectiveAdjustment;
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

  private parseBorderRadius(borderRadiusValue: string | undefined): number {
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

  private parseBoxShadow(boxShadowValue: string | undefined): { offsetX: number, offsetY: number, blur: number, color: string } | null {
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

  private parsePolygonType(polygonTypeValue: string | undefined): string {
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

  private parseGradient(backgroundValue: string | undefined): { type: 'solid' | 'linear' | 'radial', color?: string, gradient?: any } | null {
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

  private parseLinearGradient(gradientParams: string): { type: 'linear', gradient: any } {
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

  private parseRadialGradient(gradientParams: string): { type: 'radial', gradient: any } {
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
    this.elementTypes.clear();
  }

  // Element type default styles
  private getElementTypeDefaults(elementType: string): Partial<StyleRule> {
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
  private parseTransform(transformValue?: string): TransformData | null {
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

  private parseLength(value: string): number {
    // Convert pixel values to world coordinates, others to relative values
    if (value.endsWith('px')) {
      return parseFloat(value) * 0.01; // Convert pixels to world units
    }
    return parseFloat(value) || 0;
  }

  private parseAngle(value: string): number {
    if (value.endsWith('deg')) {
      return (parseFloat(value) * Math.PI) / 180; // Convert degrees to radians
    } else if (value.endsWith('rad')) {
      return parseFloat(value);
    } else if (value.endsWith('turn')) {
      return parseFloat(value) * 2 * Math.PI; // Convert turns to radians
    }
    return parseFloat(value) || 0; // Assume radians if no unit
  }

  private applyTransforms(mesh: Mesh, transforms: TransformData): void {
    console.log(`🔄 Applying transforms to ${mesh.name}:`, transforms);

    // Apply translation
    if (transforms.translate.x !== 0 || transforms.translate.y !== 0 || transforms.translate.z !== 0) {
      const currentPosition = mesh.position.clone();
      mesh.position = new Vector3(
        currentPosition.x + transforms.translate.x,
        currentPosition.y - transforms.translate.y, // Y is inverted in BabylonJS
        currentPosition.z + transforms.translate.z
      );
      console.log(`📍 Translation applied: (${transforms.translate.x}, ${transforms.translate.y}, ${transforms.translate.z})`);
    }

    // Apply rotation (in order: X, Y, Z)
    if (transforms.rotate.x !== 0 || transforms.rotate.y !== 0 || transforms.rotate.z !== 0) {
      mesh.rotation = new Vector3(
        transforms.rotate.x,
        transforms.rotate.y,
        transforms.rotate.z
      );
      console.log(`🔄 Rotation applied: (${transforms.rotate.x}, ${transforms.rotate.y}, ${transforms.rotate.z}) radians`);
    }

    // Apply scaling
    if (transforms.scale.x !== 1 || transforms.scale.y !== 1 || transforms.scale.z !== 1) {
      mesh.scaling = new Vector3(
        transforms.scale.x,
        transforms.scale.y,
        transforms.scale.z
      );
      console.log(`📏 Scaling applied: (${transforms.scale.x}, ${transforms.scale.y}, ${transforms.scale.z})`);
    }
  }

  private createImageElement(element: DOMElement, style: StyleRule, dimensions: any, borderRadius: number): Mesh {
    if (!this.scene || !this.meshService) throw new Error('Services not initialized');
    
    const elementId = element.id || `image-${Date.now()}`;
    console.log(`🖼️ Creating image element: ${elementId}`);
    
    // Get image source from style
    const imageSrc = style.src;
    if (!imageSrc) {
      console.warn(`⚠️ No image source found for ${elementId}, creating placeholder`);
      // Create a placeholder rectangle if no source is provided
      return this.meshService.createPolygon(elementId, 'rectangle', dimensions.width, dimensions.height, borderRadius);
    }
    
    console.log(`📸 Loading image texture from: ${imageSrc}`);
    
    // Create a rectangle mesh for the image
    const imageMesh = this.meshService.createPolygon(
      elementId,
      'rectangle', 
      dimensions.width, 
      dimensions.height, 
      borderRadius
    );
    
    // Load texture using TextureService
    this.textureService.getTexture(imageSrc, this.scene)
      .then((texture) => {
        console.log(`✅ Texture loaded successfully for ${elementId}: ${imageSrc}`);
        
        // Create material for the image
        const material = new StandardMaterial(`${elementId}-material`, this.scene);
        material.diffuseTexture = texture;
        material.specularColor = new Color3(0, 0, 0); // No specular highlights for images
        material.emissiveColor = new Color3(0.1, 0.1, 0.1); // Slight emissive to ensure visibility
        
        // Handle object-fit property
        const objectFit = style.objectFit || 'cover';
        if (objectFit === 'cover') {
          // Scale texture to cover the entire mesh (may crop)
          texture.uScale = 1;
          texture.vScale = 1;
          texture.wrapU = Texture.CLAMP_ADDRESSMODE;
          texture.wrapV = Texture.CLAMP_ADDRESSMODE;
        } else if (objectFit === 'contain') {
          // Scale texture to fit entirely within mesh (may have empty space)
          // This would require more complex UV mapping based on aspect ratios
          console.log(`🔧 Object-fit 'contain' not fully implemented yet, using 'cover'`);
        }
        
        // Apply opacity from style
        const opacity = this.parseOpacity(style.opacity);
        if (opacity < 1.0) {
          material.alpha = opacity;
          material.transparencyMode = Material.MATERIAL_ALPHABLEND;
        }
        
        // Apply material to mesh
        imageMesh.material = material;
        
        console.log(`✅ Image texture applied to ${elementId} with opacity ${opacity}`);
      })
      .catch((error) => {
        console.error(`❌ Failed to load image texture for ${elementId}:`, error);
        this.applyFallbackMaterial(imageMesh, elementId);
      });
    
    return imageMesh;
  }

  private createAnchorElement(element: DOMElement, style: StyleRule, dimensions: any, borderRadius: number): Mesh {
    if (!this.scene || !this.meshService) throw new Error('Services not initialized');
    
    const elementId = element.id || `anchor-${Date.now()}`;
    console.log(`🔗 Creating anchor element: ${elementId}`);
    
    // Log link properties
    if (style.href) {
      console.log(`🌐 Link href: ${style.href}`);
    }
    if (style.target) {
      console.log(`🎯 Link target: ${style.target}`);
    }
    if (style.onclick) {
      console.log(`🖱️ Link onclick: ${style.onclick}`);
    }
    
    // Create a rectangle mesh for the anchor (button-like)
    const anchorMesh = this.meshService.createPolygon(
      elementId,
      'rectangle', 
      dimensions.width, 
      dimensions.height, 
      borderRadius
    );
    
    // Ensure the mesh is pickable for click events
    anchorMesh.isPickable = true;
    
    // Add click interaction for navigation/onclick functionality
    this.setupAnchorInteraction(anchorMesh, elementId, style);
    
    return anchorMesh;
  }

  private setupAnchorInteraction(mesh: Mesh, elementId: string, style: StyleRule): void {
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

  private applyFallbackMaterial(mesh: Mesh, elementId: string): void {
    // Fallback: create a colored rectangle as placeholder
    const fallbackMaterial = new StandardMaterial(`${elementId}-fallback-material`, this.scene);
    fallbackMaterial.diffuseColor = new Color3(0.8, 0.4, 0.4); // Reddish placeholder to indicate missing image
    fallbackMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1);
    mesh.material = fallbackMaterial;
    console.log(`🔄 Applied fallback material for ${elementId}`);
  }

  // ========== FLEXBOX LAYOUT SYSTEM ==========

  private isFlexContainer(parentElement: DOMElement, styles: StyleRule[]): boolean {
    const parentStyle = this.findStyleForElement(parentElement, styles);
    const display = parentStyle?.display;
    return display === 'flex';
  }

  private processFlexChildren(children: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement: DOMElement): void {
    console.log(`🔀 Processing ${children.length} flex children for parent:`, parent.name);
    console.log('🔍 Children IDs:', children.map(c => c.id));
    
    const parentStyle = this.findStyleForElement(parentElement, styles);
    const flexDirection = this.getFlexDirection(parentStyle);
    const justifyContent = this.getJustifyContent(parentStyle);
    const alignItems = this.getAlignItems(parentStyle);
    const flexWrap = this.getFlexWrap(parentStyle);
    
    console.log(`🔀 Flex properties - direction: ${flexDirection}, justify: ${justifyContent}, align: ${alignItems}, wrap: ${flexWrap}`);
    
    // Calculate flex layout
    const flexLayout = this.calculateFlexLayout(children, parent, styles, parentElement, parentStyle, {
      flexDirection,
      justifyContent,
      alignItems,
      flexWrap
    });
    console.log('🧩 Flex layout result:', flexLayout.map((l, i) => ({
      index: i,
      position: l.position,
      size: l.size,
      childId: children[i]?.id
    })));
    
    // Create and position child elements according to flex layout
    flexLayout.forEach((childLayout, index) => {
      const child = children[index];
      console.log(`🔀 Creating flex child ${index + 1}/${children.length}: ${child.type}#${child.id}`);
      console.log(`🔀 Child ${child.id} layout position: (${childLayout.position.x.toFixed(2)}, ${childLayout.position.y.toFixed(2)}, ${childLayout.position.z.toFixed(6)}) size: (${childLayout.size.width.toFixed(2)}x${childLayout.size.height.toFixed(2)})`);
      
      try {
        const childMesh = this.createElement(child, parent, styles, childLayout.position, childLayout.size);
        console.log(`✅ Created flex child mesh:`, childMesh.name, `Position:`, childMesh.position);
        console.log(`🎯 VERIFICATION: ${child.id} -> X position ${childMesh.position.x.toFixed(2)} (expected ${childLayout.position.x.toFixed(2)})`);
        
        if (child.children && child.children.length > 0) {
          console.log(`🔄 Flex child ${child.id} has ${child.children.length} sub-children`);
          this.processChildren(child.children, childMesh, styles, child);
          console.log(`✅ Completed sub-children processing for flex child ${child.id}`);
        }
      } catch (error) {
        console.error(`❌ Error processing flex child ${child.type}#${child.id}:`, error);
        throw error;
      }
    });
    
    console.log(`✅ Finished processing all flex children for parent:`, parent.name);
  }

  private getFlexDirection(style?: StyleRule): string {
    return style?.flexDirection || style?.['flex-direction'] || 'row';
  }

  private getJustifyContent(style?: StyleRule): string {
    return style?.justifyContent || style?.['justify-content'] || 'flex-start';
  }

  private getAlignItems(style?: StyleRule): string {
    return style?.alignItems || style?.['align-items'] || 'stretch';
  }

  private getFlexWrap(style?: StyleRule): string {
    return style?.flexWrap || style?.['flex-wrap'] || 'nowrap';
  }

  // Move parseFlexBasis and parseGapProperties above calculateFlexLayout or declare them as function expressions
  private parseFlexBasis(flexBasis: string, containerSize: number): number {
    if (flexBasis.endsWith('%')) {
      return (parseFloat(flexBasis) / 100) * containerSize;
    } else if (flexBasis.endsWith('px')) {
      // Convert pixels to world units
      return parseFloat(flexBasis) * 0.01; // Approximate pixel to world conversion
    } else {
      return parseFloat(flexBasis) || containerSize / 3; // Fallback
    }
  }
  private parseGapProperties(style: StyleRule): { rowGap: number; columnGap: number } {
    let rowGap = 0;
    let columnGap = 0;
    const rowGapValue = style?.rowGap || style?.['row-gap'];
    if (rowGapValue) {
      rowGap = this.parseGapValue(rowGapValue);
    }
    const columnGapValue = style?.columnGap || style?.['column-gap'];
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

  private calculateFlexLayout(children: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement: DOMElement, parentStyle?: StyleRule, flexProps?: {
    flexDirection: string;
    justifyContent: string;
    alignItems: string;
    flexWrap: string;
  }): Array<{ position: { x: number; y: number; z: number }; size: { width: number; height: number } }> {
    
    if (!flexProps) return [];
    
    console.log(`🧮 Calculating flex layout for ${children.length} children`);
    console.log(`🧮 Flex props:`, flexProps);
    
    // Get parent dimensions from stored data - parent.name should match parentElement.id
    const parentId = parentElement?.id || parent.name.replace('-body', '');
    const parentDimensions = this.elementDimensions.get(parentId) || {
      width: 20, height: 10, padding: { top: 0, right: 0, bottom: 0, left: 0 }
    };
    
    console.log(`🧮 Parent ID: ${parentId}, stored dimensions:`, this.elementDimensions.get(parentId));
    console.log(`🧮 Available dimension keys:`, Array.from(this.elementDimensions.keys()));
    
    const isRow = flexProps.flexDirection === 'row' || flexProps.flexDirection === 'row-reverse';
    const isReverse = flexProps.flexDirection.includes('reverse');
    const canWrap = flexProps.flexWrap === 'wrap' || flexProps.flexWrap === 'wrap-reverse';
    const isWrapReverse = flexProps.flexWrap === 'wrap-reverse';
    
    console.log(`🧮 Parent dimensions: ${parentDimensions.width}x${parentDimensions.height}, isRow: ${isRow}, isReverse: ${isReverse}, canWrap: ${canWrap}, isWrapReverse: ${isWrapReverse}`);
    
    // Parse gap properties from parent style
    const { rowGap, columnGap } = parentStyle ? this.parseGapProperties(parentStyle) : { rowGap: 0, columnGap: 0 };
    const mainAxisGap = isRow ? columnGap : rowGap; // Gap between items on main axis
    const crossAxisGap = isRow ? rowGap : columnGap; // Gap between lines on cross axis
    
    console.log(`🧮 Gap properties: rowGap=${rowGap.toFixed(3)}, columnGap=${columnGap.toFixed(3)}, mainAxisGap=${mainAxisGap.toFixed(3)}, crossAxisGap=${crossAxisGap.toFixed(3)}`);
    
    // Calculate child dimensions and flex properties
    const childData = children.map(child => {
      const childStyle = this.findStyleForElement(child, styles);
      const flexGrow = parseFloat(childStyle?.flexGrow || childStyle?.['flex-grow'] || '0');
      const flexShrink = parseFloat(childStyle?.flexShrink || childStyle?.['flex-shrink'] || '1');
      const flexBasis = childStyle?.flexBasis || childStyle?.['flex-basis'] || 'auto';
      
      // Calculate base size
      let baseWidth, baseHeight;
      if (isRow) {
        baseWidth = flexBasis === 'auto' ? parentDimensions.width / children.length : this.parseFlexBasis(flexBasis, parentDimensions.width);
        // For wrapped row layouts, don't make items fill the full height
        if (canWrap) {
          baseHeight = parentDimensions.height / 3; // Allow space for multiple lines
        } else {
          baseHeight = parentDimensions.height;
        }
      } else {
        // For wrapped column layouts, don't make items fill the full width  
        if (canWrap) {
          baseWidth = parentDimensions.width / 3; // Allow space for multiple columns
        } else {
          baseWidth = parentDimensions.width;
        }
        baseHeight = flexBasis === 'auto' ? parentDimensions.height / children.length : this.parseFlexBasis(flexBasis, parentDimensions.height);
      }
      
      return {
        element: child,
        style: childStyle,
        flexGrow,
        flexShrink,
        flexBasis,
        baseWidth,
        baseHeight
      };
    });

    // Now log childData, after it exists:
    console.log('🧮 FLEX DEBUG: childData', childData.map((c, i) => ({
      index: i,
      id: c.element.id,
      flexGrow: c.flexGrow,
      flexShrink: c.flexShrink,
      flexBasis: c.flexBasis,
      baseWidth: c.baseWidth,
      baseHeight: c.baseHeight
    })));

    // Handle flex-wrap: organize children into lines
    const lines: Array<typeof childData> = [];
    
    if (!canWrap) {
      // No wrapping: all items on one line
      lines.push(childData);
    } else {
      // Wrapping enabled: distribute items across multiple lines
      console.log(`🧮 FLEX-WRAP: Organizing ${children.length} items into wrapped lines`);
      
      let currentLine: typeof childData = [];
      let currentLineSize = 0;
      const maxLineSize = isRow ? parentDimensions.width : parentDimensions.height;
      
      childData.forEach((child, index) => {
        const itemSize = isRow ? child.baseWidth : child.baseHeight;
        
        // Calculate the size this item would add to the current line
        // Include gap if this isn't the first item in the line
        const gapSize = currentLine.length > 0 ? mainAxisGap : 0;
        const totalItemSize = itemSize + gapSize;
        
        // Check if adding this item would exceed the line size
        // Allow a small tolerance to prevent unnecessary wrapping due to floating point precision
        const tolerance = 0.01;
        if (currentLine.length > 0 && (currentLineSize + totalItemSize) > (maxLineSize + tolerance)) {
          // Start new line
          console.log(`🧮 WRAP: Line ${lines.length + 1} complete with ${currentLine.length} items (size: ${currentLineSize.toFixed(2)})`);
          lines.push(currentLine);
          currentLine = [child];
          currentLineSize = itemSize;
        } else {
          // Add to current line
          currentLine.push(child);
          currentLineSize += totalItemSize;
        }
        
        console.log(`🧮 WRAP: Item ${index + 1} (${child.element.id}) added to line ${lines.length + 1}, line size now: ${currentLineSize.toFixed(2)}/${maxLineSize.toFixed(2)} (gap: ${gapSize.toFixed(3)})`);
      });
      
      // Add the last line
      if (currentLine.length > 0) {
        lines.push(currentLine);
        console.log(`🧮 WRAP: Final line ${lines.length} with ${currentLine.length} items`);
      }
      
      console.log(`🧮 WRAP: Created ${lines.length} lines:`, lines.map((line, idx) => `Line ${idx + 1}: ${line.length} items`));
    }

    // Apply wrap-reverse if needed
    if (isWrapReverse) {
      lines.reverse();
      console.log(`🧮 WRAP-REVERSE: Reversed line order`);
    }

    // Calculate positions for each line
    const layout: Array<{ position: { x: number; y: number; z: number }; size: { width: number; height: number } }> = [];
    
    // Calculate line spacing for cross-axis
    const crossAxisSize = isRow ? parentDimensions.height : parentDimensions.width;
    const totalCrossAxisGaps = lines.length > 1 ? (lines.length - 1) * crossAxisGap : 0;
    const availableCrossAxisSpace = crossAxisSize - totalCrossAxisGaps;
    const lineHeight = availableCrossAxisSpace / lines.length;
    
    console.log(`🧮 Cross-axis layout: totalSize=${crossAxisSize.toFixed(3)}, gaps=${totalCrossAxisGaps.toFixed(3)}, available=${availableCrossAxisSpace.toFixed(3)}, lineHeight=${lineHeight.toFixed(3)}`);
    
    lines.forEach((line, lineIndex) => {
      // --- FLEX GROW/SHRINK LOGIC START ---
      // Calculate total base size and total flex factors
      const containerSize = isRow ? parentDimensions.width : parentDimensions.height;
      const totalBaseSize = line.reduce((sum, child) => sum + (isRow ? child.baseWidth : child.baseHeight), 0);
      const totalMainAxisGaps = line.length > 1 ? (line.length - 1) * mainAxisGap : 0;
      const totalContentSize = totalBaseSize + totalMainAxisGaps;
      const availableSpace = containerSize - totalContentSize;
      // Calculate total grow/shrink factors
      const totalGrow = line.reduce((sum, child) => sum + (child.flexGrow || 0), 0);
      const totalShrink = line.reduce((sum, child) => sum + (child.flexShrink || 0), 0);
      // Determine if we need to grow or shrink
      let itemSizes: number[] = [];
      if (availableSpace > 0 && totalGrow > 0) {
        // Distribute extra space by flexGrow
        itemSizes = line.map(child => {
          const base = isRow ? child.baseWidth : child.baseHeight;
          return base + (availableSpace * (child.flexGrow || 0) / totalGrow);
        });
      } else if (availableSpace < 0 && totalShrink > 0) {
        // Remove overflow space by flexShrink (CSS spec: shrink is proportional to flexShrink * baseSize)
        const shrinkableTotal = line.reduce((sum, child) => sum + ((child.flexShrink > 0 ? child.flexShrink * (isRow ? child.baseWidth : child.baseHeight) : 0)), 0);
        itemSizes = line.map(child => {
          const base = isRow ? child.baseWidth : child.baseHeight;
          if (child.flexShrink > 0 && shrinkableTotal > 0) {
            const shrinkFactor = child.flexShrink * base;
            return base + (availableSpace * (shrinkFactor / shrinkableTotal));
          } else {
            // No shrink
            return base;
          }
        });
      } else {
        // No grow/shrink, use base sizes
        itemSizes = line.map(child => isRow ? child.baseWidth : child.baseHeight);
      }

      console.log('🧮 FLEX DEBUG: line', line.map((c, i) => ({
        index: i,
        id: c.element.id,
        base: isRow ? c.baseWidth : c.baseHeight,
        flexGrow: c.flexGrow,
        flexShrink: c.flexShrink
      })));
      console.log('🧮 FLEX DEBUG: containerSize', containerSize, 'totalBaseSize', totalBaseSize, 'totalMainAxisGaps', totalMainAxisGaps, 'totalContentSize', totalContentSize, 'availableSpace', availableSpace, 'totalGrow', totalGrow, 'totalShrink', totalShrink);
      console.log('🧮 FLEX DEBUG: itemSizes', itemSizes);

      // --- FLEX GROW/SHRINK LOGIC END ---
      // Calculate spacing for justify-content (main axis)
      let spacing = 0;
      let startOffset = 0;
      const totalItemSize = itemSizes.reduce((sum, s) => sum + s, 0);
      const totalContentWithGaps = totalItemSize + totalMainAxisGaps;
      const mainAxisAvailable = containerSize - totalContentWithGaps;
      if (flexProps.justifyContent === 'center') {
        startOffset = mainAxisAvailable / 2;
      } else if (flexProps.justifyContent === 'flex-end') {
        startOffset = mainAxisAvailable;
      } else if (flexProps.justifyContent === 'space-between' && line.length > 1) {
        spacing = mainAxisAvailable / (line.length - 1);
        startOffset = 0;
      } else if (flexProps.justifyContent === 'space-around') {
        spacing = mainAxisAvailable / line.length;
        startOffset = spacing / 2;
      } else if (flexProps.justifyContent === 'space-evenly') {
        spacing = mainAxisAvailable / (line.length + 1);
        startOffset = spacing;
      }
      let currentOffset = startOffset;
      // Calculate cross-axis position for this line
      const totalGapsBeforeLine = lineIndex * crossAxisGap;
      const linePosition = isRow 
        ? (parentDimensions.height / 2) - (lineIndex + 0.5) * lineHeight - totalGapsBeforeLine
        : -(parentDimensions.width / 2) + (lineIndex + 0.5) * lineHeight + totalGapsBeforeLine;
      line.forEach((child, indexInLine) => {
        let x, y;
        // Use itemSizes for main axis size
        const mainSize = itemSizes[indexInLine];
        if (isRow) {
          x = -(currentOffset - parentDimensions.width / 2 + mainSize / 2);
          // Cross-axis positioning for wrapped lines
          if (canWrap && lines.length > 1) {
            y = linePosition;
          } else {
            if (flexProps.alignItems === 'center') {
              y = 0;
            } else if (flexProps.alignItems === 'flex-end') {
              y = -(parentDimensions.height / 2 - child.baseHeight / 2);
            } else {
              y = parentDimensions.height / 2 - child.baseHeight / 2;
            }
          }
          const gapToAdd = indexInLine < line.length - 1 ? mainAxisGap : 0;
          currentOffset += mainSize + spacing + gapToAdd;
        } else {
          y = parentDimensions.height / 2 - currentOffset - mainSize / 2;
          if (canWrap && lines.length > 1) {
            x = linePosition;
          } else {
            if (flexProps.alignItems === 'center') {
              x = 0;
            } else if (flexProps.alignItems === 'flex-end') {
              x = parentDimensions.width / 2 - child.baseWidth / 2;
            } else {
              x = -parentDimensions.width / 2 + child.baseWidth / 2;
            }
          }
          const gapToAdd = indexInLine < line.length - 1 ? mainAxisGap : 0;
          currentOffset += mainSize + spacing + gapToAdd;
        }
        const zPosition = 0.01 + (layout.length * 0.01);
        layout.push({
          position: { x, y, z: zPosition },
          size: isRow ? { width: mainSize, height: child.baseHeight } : { width: child.baseWidth, height: mainSize }
        });
      });
    });

    console.log('🧮 FLEX DEBUG: final layout', layout.map((l, i) => ({
      index: i,
      position: l.position,
      size: l.size
    })));
    
    return layout;
  }

  private parseGapValue(gapValue: string): number {
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

  cleanup(): void {
    this.clearElements();
    this.scene = undefined;
  }
}