import { Injectable } from '@angular/core';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { Mesh } from '@babylonjs/core';

@Injectable({
  providedIn: 'root'
})
export class FlexService {
  public isFlexContainer(render: BabylonRender, parentElement: DOMElement, styles: StyleRule[]): boolean {
    const style = render.actions.style.findStyleForElement(parentElement, styles);
    return style?.display === 'flex';
  }
  
  public processFlexChildren(
    dom: BabylonDOM,
    render: BabylonRender,
    children: DOMElement[],
    parent: Mesh,
    styles: StyleRule[],
    parentElement: DOMElement
  ): void {
    
    // Get scale factor for debugging
    const scaleFactor = render.actions.camera.getPixelToWorldScale();
    
    // Get parent style and dimensions
    const parentStyle = render.actions.style.findStyleForElement(parentElement, styles);
    if (!parentStyle) throw new Error('FlexService: parent style not found');
    if (!parentElement.id) throw new Error('FlexService: parentElement.id is undefined');
    
    const parentDimensions = dom.context.elementDimensions.get(parentElement.id);
    if (!parentDimensions) throw new Error('FlexService: parent dimensions not found');
    // Get container dimensions (in pixels)
    const containerWidth = parentDimensions.width;
    const containerHeight = parentDimensions.height;
    // Parse container padding (in pixels)
    const padding = this.parsePadding(parentStyle?.padding);
    console.log('[FLEX] Container padding (pixels):', padding);
    // Get flex properties
    const flexDirection = parentStyle.flexDirection || 'row';
    const justifyContent = parentStyle.justifyContent || 'flex-start';
    const alignItems = parentStyle.alignItems || 'stretch';
    const flexWrap = parentStyle.flexWrap || 'nowrap';
    
    console.log('[FLEX] Container:', {
      width: containerWidth,
      height: containerHeight,
      padding,
      flexDirection,
      justifyContent,
      alignItems,
      flexWrap
    });
    
    // Get child items with their styles and dimensions - using proper sizing
    const childItems = children.map(child => {
      const style = styles.find(s => s.selector === `#${child.id}`);
      const margin = this.parseMargin(style?.margin);
      console.log(`[FLEX] Child ${child.id} margin (pixels):`, margin);
      
      // Get explicit width and height from style - proper sizing logic
      let width = 0;
      let height = 0;
      
      if (style?.width) {
        if (style.width.endsWith('px')) {
          width = parseFloat(style.width);
        } else if (style.width.endsWith('%')) {
          width = (parseFloat(style.width) / 100) * containerWidth;
        } else {
          width = parseFloat(style.width);
        }
      } else {
        // Default width if not specified
        width = containerWidth / children.length;
      }
      
      if (style?.height) {
        if (style.height.endsWith('px')) {
          height = parseFloat(style.height);
        } else if (style.height.endsWith('%')) {
          height = (parseFloat(style.height) / 100) * containerHeight;
        } else {
          height = parseFloat(style.height);
        }
      } else {
        // Default height if not specified
        height = containerHeight / 3;
      }
      
      const flexGrow = parseFloat(style?.flexGrow || '0') || 0;
      const flexShrink = parseFloat(style?.flexShrink || '1') || 1;
      
      return {
        element: child,
        style,
        width,
        height,
        baseWidth: width,
        baseHeight: height,
        margin,
        flexGrow,
        flexShrink
      };
    });
    
    console.log('[FLEX] Child items:', childItems);
    
    // Calculate flex layout using the same approach as the working version
    const layout = this.calculateFlexLayout(
      childItems,
      containerWidth,
      containerHeight,
      padding,
      {
        flexDirection,
        justifyContent,
        alignItems,
        flexWrap
      },
      render
    );
    
    console.log('[FLEX] Layout:', layout);
    
    // Create and position child elements according to flex layout
    layout.forEach((item, index) => {
      const child = childItems[index];
      console.log(`[FLEX] Creating flex child ${index + 1}/${childItems.length}: ${child.element.type}#${child.element.id}`);
      console.log(`[FLEX] Child ${child.element.id} layout (pixels):`, item);
      
      try {
        // The flex layout positions are in pixels, but createElement expects them to be in pixels
        // and will apply the scale factor internally, so we pass them as-is
        const childMesh = dom.actions.createElement(
          dom,
          render,
          child.element,
          parent,
          styles,
          item.position, // positions in pixels
          item.size      // sizes in pixels
        );
        
        console.log(`[FLEX] Created flex child mesh:`, childMesh.name, `Position:`, childMesh.position);
        
        // Process nested children if any
        if (child.element.children && child.element.children.length > 0) {
          console.log(`[FLEX] Child ${child.element.id} has ${child.element.children.length} sub-children`);
          dom.actions.processChildren(dom, render, child.element.children, childMesh, styles, child.element);
        }
      } catch (error) {
        console.error(`[FLEX] Error processing flex child ${child.element.type}#${child.element.id}:`, error);
        throw error;
      }
    });
    
    console.log(`[FLEX] Finished processing all flex children for parent:`, parent.name);
  }
  
  /**
   * Calculate flex layout for child items - using the exact approach from the working version
   */
  private calculateFlexLayout(
    childItems: Array<{
      element: DOMElement;
      style: StyleRule | undefined;
      width: number;
      height: number;
      baseWidth: number;
      baseHeight: number;
      margin: { top: number; right: number; bottom: number; left: number };
      flexGrow: number;
      flexShrink: number;
    }>,
    containerWidth: number,
    containerHeight: number,
    padding: { top: number; right: number; bottom: number; left: number },
    flexProps: {
      flexDirection: string;
      justifyContent: string;
      alignItems: string;
      flexWrap: string;
    },
    render: BabylonRender
  ): Array<{
    position: { x: number; y: number; z: number };
    size: { width: number; height: number };
  }> {
    const isRow = flexProps.flexDirection === 'row' || flexProps.flexDirection === 'row-reverse';
    const isReverse = flexProps.flexDirection.includes('reverse');
    
    // Calculate total size of all items including margins
    const totalSize = childItems.reduce((total, item) => {
      if (isRow) {
        return total + item.baseWidth + item.margin.left + item.margin.right;
      } else {
        return total + item.baseHeight + item.margin.top + item.margin.bottom;
      }
    }, 0);
    
    // Calculate available space for items
    const availableSpace = isRow
      ? containerWidth - padding.left - padding.right
      : containerHeight - padding.top - padding.bottom;
    
    // Calculate remaining space
    const remainingSpace = Math.max(0, availableSpace - totalSize);
    
    // Apply flex-grow if there's remaining space
    if (remainingSpace > 0) {
      const totalFlexGrow = childItems.reduce((total, item) => total + item.flexGrow, 0);
      
      if (totalFlexGrow > 0) {
        childItems.forEach(item => {
          if (item.flexGrow > 0) {
            const extraSize = (item.flexGrow / totalFlexGrow) * remainingSpace;
            if (isRow) {
              item.width += extraSize;
            } else {
              item.height += extraSize;
            }
          }
        });
      }
    }
    
    // Calculate spacing for justify-content
    let spacing = 0;
    let startOffset = 0;
    
    switch (flexProps.justifyContent) {
      case 'flex-start':
        startOffset = 0;
        break;
      case 'flex-end':
        startOffset = Math.max(0, remainingSpace);
        break;
      case 'center':
        startOffset = Math.max(0, remainingSpace / 2);
        break;
      case 'space-between':
        if (childItems.length > 1) {
          spacing = Math.max(0, remainingSpace / (childItems.length - 1));
        }
        startOffset = 0;
        break;
      case 'space-around':
        spacing = Math.max(0, remainingSpace / childItems.length);
        startOffset = spacing / 2;
        break;
      case 'space-evenly':
        spacing = Math.max(0, remainingSpace / (childItems.length + 1));
        startOffset = spacing;
        break;
    }
    
    // Position each child
    let currentOffset = startOffset;
    const layout: Array<{
      position: { x: number; y: number; z: number };
      size: { width: number; height: number };
    }> = [];
    
    // If reversed, we need to position items from the end
    const itemsToProcess = isReverse ? [...childItems].reverse() : childItems;
    
    itemsToProcess.forEach((item, index) => {
      let x: number, y: number;
      
      if (isRow) {
        // Calculate X position (main axis)
        const itemLeft = padding.left + currentOffset + item.margin.left;
        x = -(containerWidth / 2) + itemLeft + (item.width / 2);
        
        // Calculate Y position (cross axis) based on align-items
        switch (flexProps.alignItems) {
          case 'flex-start':
            y = (containerHeight / 2) - padding.top - item.margin.top - (item.baseHeight / 2);
            break;
          case 'flex-end':
            y = -(containerHeight / 2) + padding.bottom + item.margin.bottom + (item.baseHeight / 2);
            break;
          case 'center':
            // Center the item vertically within the available space
            const availableHeight = containerHeight - padding.top - padding.bottom;
            const itemCenterOffset = (availableHeight - item.baseHeight) / 2;
            y = (containerHeight / 2) - padding.top - itemCenterOffset - (item.baseHeight / 2);
            console.log(`[FLEX] ROW CENTER: item ${item.element.id}, availableHeight: ${availableHeight}, itemCenterOffset: ${itemCenterOffset}, y: ${y}`);
            break;
          case 'stretch':
            y = 0; // Center of container
            item.height = containerHeight - padding.top - padding.bottom - item.margin.top - item.margin.bottom;
            break;
          default:
            y = (containerHeight / 2) - padding.top - item.margin.top - (item.baseHeight / 2);
        }
        
        // Update current offset for next item
        currentOffset += item.width + item.margin.left + item.margin.right + spacing;
      } else {
        // Calculate Y position (main axis)
        const itemTop = padding.top + currentOffset + item.margin.top;
        y = (containerHeight / 2) - itemTop - (item.height / 2);
        
        // Calculate X position (cross axis) based on align-items
        switch (flexProps.alignItems) {
          case 'flex-start':
            x = -(containerWidth / 2) + padding.left + item.margin.left + (item.baseWidth / 2);
            break;
          case 'flex-end':
            x = (containerWidth / 2) - padding.right - item.margin.right - (item.baseWidth / 2);
            break;
          case 'center':
            // Center the item horizontally within the available space
            const availableWidth = containerWidth - padding.left - padding.right;
            const itemCenterOffset = (availableWidth - item.baseWidth) / 2;
            x = -(containerWidth / 2) + padding.left + itemCenterOffset + (item.baseWidth / 2);
            console.log(`[FLEX] COLUMN CENTER: item ${item.element.id}, availableWidth: ${availableWidth}, itemCenterOffset: ${itemCenterOffset}, x: ${x}`);
            break;
          case 'stretch':
            x = 0; // Center of container
            item.width = containerWidth - padding.left - padding.right - item.margin.left - item.margin.right;
            break;
          default:
            x = -(containerWidth / 2) + padding.left + item.margin.left + (item.baseWidth / 2);
        }
        
        // Update current offset for next item
        currentOffset += item.height + item.margin.top + item.margin.bottom + spacing;
      }
      
      // Add to layout - positions are in pixels, will be converted to world units later
      layout.push({
        position: { x, y, z: 0.01 + (index * 0.01) },
        size: { width: item.width, height: item.height }
      });
    });
    
    return layout;
  }
  
  /**
   * Parse padding value from style
   */
  private parsePadding(padding?: string): { top: number; right: number; bottom: number; left: number } {
    if (!padding) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    
    const parts = padding.split(/\s+/);
    
    if (parts.length === 1) {
      // padding: 10px (all sides)
      const value = parseFloat(parts[0]) || 0;
      return { top: value, right: value, bottom: value, left: value };
    } else if (parts.length === 2) {
      // padding: 10px 20px (vertical horizontal)
      const vValue = parseFloat(parts[0]) || 0;
      const hValue = parseFloat(parts[1]) || 0;
      return { top: vValue, right: hValue, bottom: vValue, left: hValue };
    } else if (parts.length === 4) {
      // padding: 10px 20px 30px 40px (top right bottom left)
      return {
        top: parseFloat(parts[0]) || 0,
        right: parseFloat(parts[1]) || 0,
        bottom: parseFloat(parts[2]) || 0,
        left: parseFloat(parts[3]) || 0
      };
    }
    
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  
  /**
   * Parse margin value from style
   */
  private parseMargin(margin?: string): { top: number; right: number; bottom: number; left: number } {
    if (!margin) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    
    const parts = margin.split(/\s+/);
    
    if (parts.length === 1) {
      // margin: 10px (all sides)
      const value = parseFloat(parts[0]) || 0;
      return { top: value, right: value, bottom: value, left: value };
    } else if (parts.length === 2) {
      // margin: 10px 20px (vertical horizontal)
      const vValue = parseFloat(parts[0]) || 0;
      const hValue = parseFloat(parts[1]) || 0;
      return { top: vValue, right: hValue, bottom: vValue, left: hValue };
    } else if (parts.length === 4) {
      // margin: 10px 20px 30px 40px (top right bottom left)
      return {
        top: parseFloat(parts[0]) || 0,
        right: parseFloat(parts[1]) || 0,
        bottom: parseFloat(parts[2]) || 0,
        left: parseFloat(parts[3]) || 0
      };
    }
    
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
}