import { Injectable } from '@angular/core';
import { Mesh } from '@babylonjs/core';
import { BabylonMeshService } from './babylon-mesh.service';
import { BabylonCameraService } from './babylon-camera.service';
import { StyleService } from './style.service';
import { ElementService } from './element.service';
import { StyleRule } from '../types/style-rule';
import { DOMElement } from '../types/dom-element';

@Injectable({
  providedIn: 'root'
})
export class ListService {
  private meshService?: BabylonMeshService;
  private cameraService?: BabylonCameraService;
  private styleService?: StyleService;
  private elementService?: ElementService;
  private elementDimensions: Map<string, { width: number, height: number, padding: { top: number; right: number; bottom: number; left: number } }> = new Map();
  private storeElementCallback?: (element: DOMElement, mesh: Mesh, dimensions?: { width: number; height: number; padding: { top: number; right: number; bottom: number; left: number } }) => void;

  initialize(meshService: BabylonMeshService, cameraService: BabylonCameraService, styleService: StyleService, elementService: ElementService, storeElementCallback?: (element: DOMElement, mesh: Mesh, dimensions?: { width: number; height: number; padding: { top: number; right: number; bottom: number; left: number } }) => void): void {
    this.meshService = meshService;
    this.cameraService = cameraService;
    this.styleService = styleService;
    this.elementService = elementService;
    this.storeElementCallback = storeElementCallback;
  }

  processListChildren(children: DOMElement[], parent: Mesh, styles: StyleRule[], listType: 'ul' | 'ol'): void {
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
            // Note: This would need to be handled by the main BabylonDOMService
            // For now, we'll just log that sub-children exist
            console.log(`🔄 Sub-children processing would be handled by main service`);
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
      const parentStyle = this.styleService?.getElementStyle(parentId)?.normal;
      const spacing = parentStyle?.listItemSpacing || '4px';
      return this.styleService?.parsePixelValue(spacing) || 4;
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
    const elementStyles = element.id ? this.styleService?.getElementStyle(element.id) : undefined;
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
    const tempStyles = element.id ? this.styleService?.getElementStyle(element.id) : undefined;
    
    // Override stored styles temporarily
    if (element.id && this.styleService) {
      this.styleService.setElementStyle(element.id, {
        normal: autoPositionedStyle,
        hover: tempStyles?.hover
      });
    }
    
    // Create the element using ElementService
    const listItemMesh = this.elementService?.createElement(element, parent, styles) as Mesh;
    
    // Restore original styles
    if (element.id && tempStyles && this.styleService) {
      this.styleService.setElementStyle(element.id, tempStyles);
    }
    
    // Store element in main service if callback is provided
    if (this.storeElementCallback && element.id) {
      const dimensions = this.elementService?.getCalculatedDimensions(element, parent, styles);
      this.storeElementCallback(element, listItemMesh, dimensions || undefined);
    }
    
    // Add bullet point or number indicator
    this.addListIndicator(listItemMesh, listType, index, autoPositionedStyle);
    
    return listItemMesh;
  }

  private getElementTypeDefaults(elementType: string): Partial<StyleRule> {
    const defaults: { [key: string]: Partial<StyleRule> } = {
      li: {
        background: '#ecf0f1',  // Light gray background for list items
        borderWidth: '1px',
        borderColor: '#bdc3c7',
        borderStyle: 'solid',
        borderRadius: '4px',
        padding: '8px',
        marginBottom: '4px'
      }
    };

    return defaults[elementType] || {};
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
    const parsedColor = this.styleService?.parseBackgroundColor(indicatorColor);
    console.log(`🎨 Parsed color:`, parsedColor, `(r=${parsedColor?.r}, g=${parsedColor?.g}, b=${parsedColor?.b})`);
    
    if (parsedColor) {
      const indicatorMaterial = this.meshService.createMaterial(
        `${listItemMesh.name}-indicator-material-${Date.now()}`, // Add timestamp to avoid caching
        parsedColor,
        undefined,
        1.0
      );
      indicatorMesh.material = indicatorMaterial;
      
      console.log(`✅ Added ${listType} indicator:`, indicatorMesh.name, `with material:`, indicatorMaterial.name);
    }
  }

  setElementDimensions(elementId: string, dimensions: { width: number, height: number, padding: { top: number; right: number; bottom: number; left: number } }): void {
    this.elementDimensions.set(elementId, dimensions);
  }

  getElementDimensions(elementId: string): { width: number, height: number, padding: { top: number; right: number; bottom: number; left: number } } | undefined {
    return this.elementDimensions.get(elementId);
  }
} 