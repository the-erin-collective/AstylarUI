import { Injectable } from '@angular/core';
import { DOMElement } from '../../../types/dom-element';
import { ActionManager, Color3, ExecuteCodeAction, Material, Mesh, PointerEventTypes, StandardMaterial, Texture, Vector3 } from '@babylonjs/core';
import { StyleRule } from '../../../types/style-rule';
import { BabylonDOM } from '../interfaces/dom.types';
import { TransformData } from '../../../types/transform-data';
import { BabylonRender } from '../interfaces/render.types';
import { StyleDefaultsService } from '../style-defaults.service';

@Injectable({
  providedIn: 'root'
})
export class ElementService {
  constructor(private styleDefaults: StyleDefaultsService) {}

  public processChildren(dom: BabylonDOM, render: BabylonRender, children: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement?: DOMElement): void {
    console.log(`🔄 Processing ${children.length} children for parent:`, parent.name);
    console.log(`🔍 Children details:`, children.map(c => `${c.type}#${c.id}`));

    // Check if parent is a list container (ul or ol) - then apply automatic stacking
    const isListContainer = parentElement?.type === 'ul' || parentElement?.type === 'ol';

    // Check if parent is a flex container
    const isFlexContainer = parentElement ? dom.actions.isFlexContainer(render, parentElement, styles) : false;

    console.log(`🔍 Parent element type: ${parentElement?.type}, isListContainer: ${isListContainer}`);

    if (isListContainer) {
      console.log(`📋 Parent is list container (${parentElement?.type}), applying automatic stacking to ${children.length} items`);
      try {
        dom.actions.processListChildren(dom, render, children, parent, styles, parentElement.type as 'ul' | 'ol');
        console.log(`✅ Completed list processing for ${parentElement?.type}`);
      } catch (error) {
        console.error(`❌ Error in processListChildren for ${parentElement?.type}:`, error);
        throw error;
      }
    } else if (isFlexContainer && parentElement) {
      console.log(`🔀 Parent is flex container, applying flexbox layout to ${children.length} items`);
      try {
        dom.actions.processFlexChildren(dom, render, children, parent, styles, parentElement);
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
          const childMesh = this.createElement(dom, render, child, parent, styles);
          console.log(`✅ Created child mesh:`, childMesh.name, `Position:`, childMesh.position);

          if (child.children && child.children.length > 0) {
            console.log(`🔄 Child ${child.id} has ${child.children.length} sub-children`);
            this.processChildren(dom, render, child.children, childMesh, styles, child);
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

  public createElement(dom: BabylonDOM, render: BabylonRender, element: DOMElement, parent: Mesh, styles: StyleRule[], flexPosition?: { x: number; y: number; z: number }, flexSize?: { width: number; height: number }): Mesh {
    // Get element styles (normal and hover)
    const elementStyles = element.id ? dom.context.elementStyles.get(element.id) : undefined;
    const explicitStyle = elementStyles?.normal;

    // Get default styles for this element type
    const typeDefaults = this.styleDefaults.getElementTypeDefaults(element.type);
    console.log(`[ELEMENT DEBUG] 🎨 Type defaults for ${element.type}: ${JSON.stringify(typeDefaults)}`);

    // Use centralized CSS-correct merging
    const style: StyleRule = StyleDefaultsService.mergeStyles(
      { selector: element.id ? `#${element.id}` : element.type, ...typeDefaults },
      explicitStyle || {}
    ) as StyleRule;

    console.log(`[ELEMENT DEBUG] 🏗️ Creating ${element.type} element${element.id ? ` #${element.id}` : ''}`);
    console.log(`[ELEMENT DEBUG] 📋 Explicit style was: ${JSON.stringify(explicitStyle)}`);
    console.log(`[ELEMENT DEBUG] 🎨 Type defaults were: ${JSON.stringify(typeDefaults)}`);
    console.log(`[ELEMENT DEBUG] 🔀 Final merged style: ${JSON.stringify(style)}`);

    // Calculate dimensions and position relative to parent
    const dimensions = flexSize ?
      { ...this.calculateDimensions(dom, render, style, parent), width: flexSize.width, height: flexSize.height } :
      this.calculateDimensions(dom, render, style, parent);

    if (flexSize) {
      console.log(`[ELEMENT DEBUG] 🔀 Using flex dimensions for ${element.id}: ${flexSize.width.toFixed(2)}x${flexSize.height.toFixed(2)} (overriding calculated: ${dimensions.width.toFixed(2)}x${dimensions.height.toFixed(2)})`);
    }

    // Parse border radius and scale it to world coordinates
    const borderRadiusPixels = this.parseBorderRadius(style?.borderRadius);

    // Scale border radius from pixels to world coordinates using camera scale factor
    const scaleFactor = render.actions.camera.getPixelToWorldScale();
    const borderRadius = borderRadiusPixels * scaleFactor;

    console.log(`🔧 Border radius scaling: ${borderRadiusPixels}px → ${borderRadius.toFixed(3)} world units (scale: ${scaleFactor.toFixed(6)}, shape: ${dimensions.width.toFixed(1)}×${dimensions.height.toFixed(1)})`);

    // Parse polygon properties
    const polygonType = this.parsePolygonType(style?.polygonType);

    // Create the mesh based on element type
    let mesh: any;

    // Convert pixel dimensions to world units for mesh creation
    const worldWidth = dimensions.width * scaleFactor;
    const worldHeight = dimensions.height * scaleFactor;

    // Add debug log for list items
    if (element.type === 'li') {
      console.log(`[LIST ITEM DEBUG] Creating list item mesh for ${element.id}:` +
        ` pixel size: ${dimensions.width}x${dimensions.height},` +
        ` world size: ${worldWidth}x${worldHeight}`);
    }

    console.log(`[ELEMENT DEBUG] 🧩 Processing element with type: '${element.type}' and id: '${element.id}'`);

    if (element.type === 'img') {
      // Create image element with texture support
      mesh = this.createImageElement(render, element, style, { ...dimensions, width: worldWidth, height: worldHeight }, borderRadius);
    } else if (element.type === 'a') {
      // Create anchor element (button-like for now)
      mesh = this.createAnchorElement(render, element, style, { ...dimensions, width: worldWidth, height: worldHeight }, borderRadius);
    } else if (polygonType === 'rectangle') {
      // Use polygon system for rectangles too to unify border handling
      mesh = render.actions.mesh.createPolygon(
        element.id || `element-${Date.now()}`,
        'rectangle',
        worldWidth, // world units
        worldHeight, // world units
        borderRadius
      );
    } else {
      // Create polygon mesh with border radius support
      mesh = render.actions.mesh.createPolygon(
        element.id || `element-${Date.now()}`,
        polygonType,
        worldWidth, // world units
        worldHeight, // world units
        borderRadius
      );
    }
    console.log(`[ELEMENT DEBUG] [BABYLON MESH DEBUG] Created mesh for ${element.id} (type: ${element.type}, polygon: ${polygonType}) with dimensions: width=${worldWidth}, height=${worldHeight}, borderRadius=${borderRadius}`);

    // Calculate Z position based on z-index, but prefer flex position Z if available
    const zIndex = this.parseZIndex(style?.zIndex);
    const baseZPosition = this.calculateZPosition(zIndex);

    // Use flex position Z if provided (it includes index-based layering), otherwise use calculated Z
    const zPosition = flexPosition ? flexPosition.z : baseZPosition;

    console.log(`🎯 Z-positioning for ${element.id}: ${JSON.stringify({ zIndex, baseZPosition, flexZPosition: flexPosition?.z, finalZPosition: zPosition, hasZIndexStyle: !!(style?.zIndex) })}`);

    // Position relative to parent (parent's coordinate system)
    // Calculate actual Z position that will be used for the element
    let actualZPosition = zPosition;

    // Use flex positioning if provided, otherwise use normal positioning
    if (flexPosition) {
      const scaleFactor = render.actions.camera.getPixelToWorldScale();
      const worldX = flexPosition.x * scaleFactor;
      const worldY = flexPosition.y * scaleFactor;
      render.actions.mesh.positionMesh(mesh, worldX, worldY, zPosition);
      render.actions.mesh.parentMesh(mesh, parent);
      if (element.type === 'li') {
        console.log(`[LIST ITEM DEBUG] Positioned list item mesh for ${element.id}: world position: (${worldX}, ${worldY}, ${zPosition})`);
      }
      console.log(`🔀 Using flex positioning for ${element.id}: (${worldX.toFixed(2)}, ${worldY.toFixed(2)}, ${zPosition.toFixed(6)}) world units (from flex: ${flexPosition.x}, ${flexPosition.y}) scaleFactor: ${scaleFactor}`);
    } else {
      // Convert pixel position to world units for mesh positioning
      const scaleFactor = render.actions.camera.getPixelToWorldScale();
      const worldX = dimensions.x * scaleFactor;
      const worldY = dimensions.y * scaleFactor;
      render.actions.mesh.positionMesh(mesh, worldX, worldY, zPosition);
      render.actions.mesh.parentMesh(mesh, parent);
      if (element.type === 'li') {
        console.log(`[LIST ITEM DEBUG] Positioned list item mesh for ${element.id}: world position: (${worldX}, ${worldY}, ${zPosition})`);
      }
      console.log(`[ELEMENT DEBUG] Using normal positioning for ${element.id}: (${worldX.toFixed(2)}, ${worldY.toFixed(2)}, ${zPosition.toFixed(6)}) world units (from dimensions.x: ${dimensions.x}, dimensions.y}) scaleFactor: ${scaleFactor}`);
    }

    // Apply material (start with normal state) - pass merged style that includes type defaults
    this.applyElementMaterial(dom, render, mesh, element, false, style);

    // Apply transforms if specified
    const transform = this.parseTransform(style?.transform);
    if (transform) {
      this.applyTransforms(mesh, transform);
      // Also apply to all border meshes and parent them to the main mesh
      for (let i = 0; i < 4; i++) {
        const borderMesh = dom.context.elements.get(`${element.id}-border-${i}`);
        if (borderMesh) {
          this.applyTransforms(borderMesh, transform);
          // Parent border mesh to main mesh for transform inheritance
          render.actions.mesh.parentMesh(borderMesh, mesh);
        }
      }
    }

    // Add or update box shadow mesh
    if (element.id && parent instanceof Mesh) {
      this.updateShadowMesh(dom, render, element.id, style, parent, dimensions, zPosition, borderRadius, polygonType, transform || undefined);
    }

    // Add borders if specified
    const borderElementStyles = element.id ? dom.context.elementStyles.get(element.id) : undefined;
    const borderProperties = this.parseBorderProperties(render, borderElementStyles?.normal);

    if (borderProperties.width > 0) {
      console.log(`Creating border for ${element.id} with width ${borderProperties.width}`);

      // Use unified polygon border system for all shapes
      const borderMeshes = render.actions.mesh.createPolygonBorder(
        `${element.id}-border`,
        polygonType,
        worldWidth,
        worldHeight,
        borderProperties.width * scaleFactor, // border width in world units
        borderRadius
      );

      // Calculate Z position for borders (slightly above element for visibility)
      // Use the actual Z position that was calculated for the element
      const borderZPosition = actualZPosition + 0.001; // Borders with significant offset above element

      // Position border frames around the element
      // Use flex positioning if provided, otherwise use normal positioning
      // Convert to world units
      const borderX = flexPosition ? flexPosition.x * scaleFactor : dimensions.x * scaleFactor;
      const borderY = flexPosition ? flexPosition.y * scaleFactor : dimensions.y * scaleFactor;

      // Parent all border frames to main mesh BEFORE positioning for correct transform inheritance
      borderMeshes.forEach(borderMesh => {
        render.actions.mesh.parentMesh(borderMesh, mesh);
      });

      // Position border frames at (0,0) relative to main mesh
      render.actions.mesh.positionBorderFrames(
        borderMeshes,
        0, // x relative to main mesh
        0, // y relative to main mesh
        borderZPosition,
        worldWidth,
        worldHeight,
        borderProperties.width * scaleFactor
      );

      // Apply border material to all frames with consistent rendering
      const borderOpacity = render.actions.style.parseOpacity(elementStyles?.normal?.opacity);
      const borderMaterial = render.actions.mesh.createMaterial(
        `${element.id}-border-material`,
        borderProperties.color,
        undefined,
        borderOpacity
      );

      // DO NOT override emissive color - keep materials consistent
      // The createSharpEdgeMaterial already sets optimal values

      borderMeshes.forEach(borderMesh => {
        borderMesh.material = borderMaterial;
      });

      // Store border references for cleanup
      if (element.id) {
        borderMeshes.forEach((borderMesh, index) => {
          dom.context.elements.set(`${element.id}-border-${index}`, borderMesh);

          // Add hover events to border frames if element has hover styles
          if (borderElementStyles?.hover && element.id) {
            this.setupMouseEvents(dom, render, borderMesh, element.id);
          }
        });
        console.log(`Applied border - width: ${borderProperties.width}, color:`, borderProperties.color);
      }
    }

    // Add mouse events if element has hover styles
    if (element.id && borderElementStyles?.hover) {
      this.setupMouseEvents(dom, render, mesh, element.id);
    }

    console.log(`Created element ${element.id}: ${JSON.stringify({ position: mesh.position, dimensions, parentId: parent.name })}`);

    // Store reference
    if (element.id) {
      dom.context.elements.set(element.id, mesh);
      dom.context.hoverStates.set(element.id, false); // Start in normal state
      dom.context.elementTypes.set(element.id, element.type); // Store element type for hover handling

      // Convert padding from world units to pixels for storage
      const pixelPadding = this.convertPaddingToPixels(dimensions.padding, render);

      // Store element dimensions and padding info for child calculations
      // All values are in PIXELS
      // Debug: Warn if suspiciously small for top-level containers
      const isTopLevel = parent && parent.name === 'root-body';
      if (isTopLevel && (dimensions.width < 100 || dimensions.height < 100)) {
        console.warn(`[ELEMENT DIM DEBUG] SUSPICIOUS: Storing small dimensions for top-level element: ${element.id} (parent: ${parent.name}) width: ${dimensions.width}, height: ${dimensions.height}, style: ${JSON.stringify(style)}, stack: ${JSON.stringify((new Error()).stack)}`);
      }
      dom.context.elementDimensions.set(element.id, {
        width: dimensions.width, // pixels
        height: dimensions.height, // pixels
        padding: pixelPadding // pixels
      });
      console.log(`[ELEMENT DIM DEBUG] Stored elementDimensions for ${element.id}: ${JSON.stringify({ width: dimensions.width, height: dimensions.height, padding: pixelPadding })}`);
    }

    return mesh;
  }

  public requestElementRecreation(
    dom: BabylonDOM,
    render: BabylonRender,
    elementId: string,
    styleType: 'normal' | 'hover'
  ) {
    const elementType = dom.context.elementTypes.get(elementId) || 'div';
    const element = { id: elementId, type: elementType } as DOMElement;
    const elementStyles = dom.context.elementStyles.get(elementId);
    const typeDefaults = this.styleDefaults.getElementTypeDefaults(elementType);
    const style = styleType === 'hover'
      ? { ...typeDefaults, ...elementStyles?.normal, ...elementStyles?.hover, selector: `#${elementId}` }
      : { ...typeDefaults, ...elementStyles?.normal, selector: `#${elementId}` };

    // Remove old border meshes
    for (let i = 0; i < 4; i++) {
      const borderMesh = dom.context.elements.get(`${elementId}-border-${i}`);
      if (borderMesh) {
        borderMesh.dispose();
        dom.context.elements.delete(`${elementId}-border-${i}`);
      }
    }
    // Remove old main mesh
    const mainMesh = dom.context.elements.get(elementId);
    let parent: Mesh | undefined = undefined;
    if (mainMesh) {
      if (mainMesh.parent && mainMesh.parent instanceof Mesh) {
        parent = mainMesh.parent;
      }
      mainMesh.dispose();
      dom.context.elements.delete(elementId);
    }

    // Recreate the element (main mesh and borders)
    const dimensions = dom.context.elementDimensions.get(elementId);
    if (parent && dimensions) {
      const newMesh = this.createElement(dom, render, element, parent, [], undefined, { width: dimensions.width, height: dimensions.height });
      dom.context.elements.set(elementId, newMesh);
      dom.context.hoverStates.set(elementId, styleType === 'hover');
      // No need to reattach event handlers here; createElement does it
    }
  }


  private parseBorderProperties(render: BabylonRender, style: StyleRule | undefined) {
    if (!style) {
      return { width: 0, color: new Color3(0, 0, 0), style: 'solid' };
    }

    // Only use camelCase properties
    const borderWidth = style.borderWidth;
    const borderColor = style.borderColor;
    const borderStyle = style.borderStyle;

    return {
      width: this.parseBorderWidth(render, borderWidth),
      color: render.actions.style.parseBackgroundColor(borderColor),
      style: borderStyle || 'solid'
    };
  }


  private calculateDimensions(dom: BabylonDOM, render: BabylonRender, style: StyleRule | undefined, parent: Mesh): {
    width: number;
    height: number;
    x: number;
    y: number;
    padding: { top: number; right: number; bottom: number; left: number };
    margin: { top: number; right: number; bottom: number; left: number };
  } {
    // Always use parent dimensions from elementDimensions (in pixels)
    // Never use mesh bounding box fallbacks
    const parentDims = dom.context.elementDimensions.get(parent.name);
    if (!parentDims) {
      throw new Error(`[ELEMENT DIM ERROR] Parent dimensions not found in elementDimensions for parent: ${parent.name}`);
    }
    let parentWidth = parentDims.width;
    let parentHeight = parentDims.height;
    console.log('[ELEMENT DIM DEBUG] Using elementDimensions for parent:', parent.name, { parentWidth, parentHeight });

    // If parent has padding, reduce available space for this child
    const parentInfo = this.getElementInfo(dom, parent.name);
    if (parentInfo && parentInfo.padding) {
      parentWidth -= (parentInfo.padding.left + parentInfo.padding.right);
      parentHeight -= (parentInfo.padding.top + parentInfo.padding.bottom);
      console.log(`Applied parent padding - reduced dimensions from original to ${parentWidth}x${parentHeight}`);
    }

    console.log('Parent dimensions:', { parentWidth, parentHeight });

    // Parse padding and margin
    const padding = this.parsePadding(render, style, undefined);
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
      if (style.selector && style.selector.startsWith('#ul-item-') || style.selector && style.selector.startsWith('#ol-item-') || style.selector && style.selector.startsWith('li')) {
        console.log(`[LIST ITEM DIM DEBUG] For ${style.selector}: incoming style.height = ${style.height}`);
      }
      console.log(`STYLE CHECK - Element: ${style.selector || 'unknown'}, left: ${style.left}, top: ${style.top}`);

      // Calculate width as percentage of available space (after margins)
      if (style.width) {
        if (typeof style.width === 'string' && style.width.endsWith('px')) {
          width = parseFloat(style.width);
          if (style.selector && (style.selector.startsWith('#ul-item-') || style.selector.startsWith('#ol-item-') || style.selector.startsWith('li'))) {
            console.log(`[LIST ITEM DIM DEBUG] For ${style.selector}: using pixel width directly: ${width}`);
          }
        } else if (typeof style.width === 'string' && style.width.endsWith('%')) {
          const percent = parseFloat(style.width);
          width = (percent / 100) * availableWidth;
        } else {
          width = parseFloat(style.width);
        }
      }

      // Calculate height as percentage of available space (after margins)
      if (style.height) {
        if (typeof style.height === 'string' && style.height.endsWith('px')) {
          height = parseFloat(style.height);
          if (style.selector && (style.selector.startsWith('#ul-item-') || style.selector.startsWith('#ol-item-') || style.selector.startsWith('li'))) {
            console.log(`[LIST ITEM DIM DEBUG] For ${style.selector}: using pixel height directly: ${height}`);
          }
        } else if (typeof style.height === 'string' && style.height.endsWith('%')) {
          const percent = parseFloat(style.height);
          height = (percent / 100) * availableHeight;
        } else {
          height = parseFloat(style.height);
        }
      }

      // Calculate position - CSS uses top-left origin, BabylonJS uses center origin
      if (style.left !== undefined) {
        if (typeof style.left === 'string' && style.left.endsWith('px')) {
          // Use pixel value directly
          x = (-parentWidth / 2) + parseFloat(style.left) + (width / 2);
        } else if (typeof style.left === 'string' && style.left.endsWith('%')) {
          const leftPercent = parseFloat(style.left);
          x = (-parentWidth / 2) + ((leftPercent / 100) * availableWidth) + (width / 2);
        } else {
          x = (-parentWidth / 2) + parseFloat(style.left) + (width / 2);
        }
        // Flip X coordinate if needed (existing logic)
        x = -x;
      }

      if (style.top !== undefined) {
        if (typeof style.top === 'string' && style.top.endsWith('px')) {
          // Use pixel value directly
          y = (parentHeight / 2) - parseFloat(style.top) - (height / 2);
        } else if (typeof style.top === 'string' && style.top.endsWith('%')) {
          const topPercent = parseFloat(style.top);
          y = (parentHeight / 2) - ((topPercent / 100) * availableHeight) - (height / 2);
        } else {
          y = (parentHeight / 2) - parseFloat(style.top) - (height / 2);
        }
      }
      if (style && (style.selector && (style.selector.startsWith('#ul-item-') || style.selector.startsWith('#ol-item-') || style.selector.startsWith('li')))) {
        console.log(`[LIST ITEM DIM DEBUG] For ${style.selector}: final calculated y = ${y}, x = ${x}`);
      }
    }

    if (style && (style.selector && style.selector.startsWith('#ul-item-') || style.selector && style.selector.startsWith('#ol-item-') || style.selector && style.selector.startsWith('li'))) {
      console.log(`[LIST ITEM DIM DEBUG] For ${style.selector}: final calculated height = ${height}`);
    }

    console.log(`[ELEMENT DIM DEBUG] Calculated dimensions for element: ${JSON.stringify({ width, height, x, y, style, padding, margin, parentDimensions: { parentWidth, parentHeight } })}`);

    return { width, height, x, y, padding, margin };
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

  private createImageElement(render: BabylonRender, element: DOMElement, style: StyleRule, dimensions: any, borderRadius: number): Mesh {
    if (!render.scene) {
      throw new Error('Scene not initialized');
    }

    const elementId = element.id || `image-${Date.now()}`;
    console.log(`🖼️ Creating image element: ${elementId}`);

    // Get image source from style
    const imageSrc = style.src;
    if (!imageSrc) {
      console.warn(`⚠️ No image source found for ${elementId}, creating placeholder`);
      // Create a placeholder rectangle if no source is provided
      return render.actions.mesh.createPolygon(elementId, 'rectangle', dimensions.width, dimensions.height, borderRadius);
    }

    console.log(`📸 Loading image texture from: ${imageSrc}`);

    // Create a rectangle mesh for the image
    const imageMesh = render.actions.mesh.createPolygon(
      elementId,
      'rectangle',
      dimensions.width,
      dimensions.height,
      borderRadius
    );

    // Load texture using TextureService
    render.actions.texture.getTexture(imageSrc, render.scene)
      .then((texture) => {
        console.log(`✅ Texture loaded successfully for ${elementId}: ${imageSrc}`);

        // Create material for the image
        const material = new StandardMaterial(`${elementId}-material`, render.scene);
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
        const opacity = render.actions.style.parseOpacity(style.opacity);
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
        throw error;
      });

    return imageMesh;
  }

  private createAnchorElement(render: BabylonRender, element: DOMElement, style: StyleRule, dimensions: any, borderRadius: number): Mesh {

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
    const anchorMesh = render.actions.mesh.createPolygon(
      elementId,
      'rectangle',
      dimensions.width,
      dimensions.height,
      borderRadius
    );

    // Ensure the mesh is pickable for click events
    anchorMesh.isPickable = true;

    // Add click interaction for navigation/onclick functionality
    this.setupAnchorInteraction(render, anchorMesh, elementId, style);

    return anchorMesh;
  }

  private setupAnchorInteraction(render: BabylonRender, mesh: Mesh, elementId: string, style: StyleRule): void {
    console.log(`🎯 Setting up anchor interaction for ${elementId}`);
    if (!render.scene) {
      throw new Error('Scene not initialized');
    }
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
    if (!render.scene?.metadata?.anchorHandlerSetup) {
      render.scene?.onPointerObservable.add((pointerInfo) => {
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
      render.scene.metadata = { ...render.scene?.metadata, anchorHandlerSetup: true };
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


  private parsePadding(render: BabylonRender, mergedStyle: StyleRule | undefined, explicitStyle?: StyleRule) {
    const selector = mergedStyle?.selector;
    if (selector && (selector.startsWith('#unordered-list') || selector.startsWith('#ordered-list') || selector === 'ul' || selector === 'ol')) {
      console.log(`[LIST CONTAINER PADDING DEBUG] Incoming merged style for ${selector}:`, JSON.stringify(mergedStyle));
      if (explicitStyle) {
        console.log(`[LIST CONTAINER PADDING DEBUG] Incoming explicit style for ${selector}:`, JSON.stringify(explicitStyle));
      }
    }
    if (!mergedStyle) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    // Parse the shorthand padding property from the explicit style (if present)
    const explicitShorthand = this.parseBoxValues(render, explicitStyle?.padding);
    // Parse the shorthand padding property from the merged style (if present)
    const mergedShorthand = this.parseBoxValues(render, mergedStyle.padding);

    // Arrow function to capture 'this' context
    const pickPadding = (side: 'Top' | 'Right' | 'Bottom' | 'Left') => {
      const sideKey = `padding${side}` as keyof StyleRule;
      const explicitSide = explicitStyle ? explicitStyle[sideKey] : undefined;
      const mergedSide = mergedStyle[sideKey];
      const explicitSideValue = explicitSide !== undefined ? (typeof explicitSide === 'string' ? parseFloat(explicitSide) : 0) : null;
      const mergedSideValue = mergedSide !== undefined ? (typeof mergedSide === 'string' ? parseFloat(mergedSide) : 0) : null;
      const explicitShorthandValue = explicitShorthand[side.toLowerCase() as 'top' | 'right' | 'bottom' | 'left'];
      const mergedShorthandValue = mergedShorthand[side.toLowerCase() as 'top' | 'right' | 'bottom' | 'left'];
      let result: number;
      if (explicitSideValue !== null) {
        result = this.parsePaddingValue(render, explicitSide as string) ?? 0;
        if (selector && (selector.startsWith('#unordered-list') || selector.startsWith('#ordered-list') || selector === 'ul' || selector === 'ol')) {
          console.log(`[LIST CONTAINER PADDING DEBUG] ${selector}: using explicit side ${side}: ${result}`);
        }
      } else if (explicitStyle && explicitStyle.padding) {
        result = explicitShorthandValue;
        if (selector && (selector.startsWith('#unordered-list') || selector.startsWith('#ordered-list') || selector === 'ul' || selector === 'ol')) {
          console.log(`[LIST CONTAINER PADDING DEBUG] ${selector}: using explicit shorthand for ${side}: ${result}`);
        }
      } else if (!explicitStyle || !explicitStyle.padding) {
        if (mergedSideValue !== null) {
          result = this.parsePaddingValue(render, mergedSide as string) ?? 0;
          if (selector && (selector.startsWith('#unordered-list') || selector.startsWith('#ordered-list') || selector === 'ul' || selector === 'ol')) {
            console.log(`[LIST CONTAINER PADDING DEBUG] ${selector}: using merged side ${side}: ${result}`);
          }
        } else {
          result = mergedShorthandValue;
          if (selector && (selector.startsWith('#unordered-list') || selector.startsWith('#ordered-list') || selector === 'ul' || selector === 'ol')) {
            console.log(`[LIST CONTAINER PADDING DEBUG] ${selector}: using merged shorthand for ${side}: ${result}`);
          }
        }
      } else {
        result = 0;
      }
      return result;
    };

      return {
      top: pickPadding('Top'),
      right: pickPadding('Right'),
      bottom: pickPadding('Bottom'),
      left: pickPadding('Left')
    };
  }

  private parseBoxValues(render: BabylonRender, value?: string) {
    if (!value) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const values = value.split(/\s+/).map(v => this.parsePaddingValue(render, v) ?? 0);

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


  private applyElementMaterial(dom: BabylonDOM, render: BabylonRender, mesh: Mesh, element: DOMElement, isHovered: boolean, mergedStyle?: StyleRule): void {
    if (!element.id) return;

    // Special handling for image elements - preserve textures and only modify properties like opacity
    if (element.type === 'img') {
      this.applyImageMaterialUpdate(dom, render, mesh, element, isHovered, mergedStyle);
      return;
    }

    let activeStyle;
    if (mergedStyle) {
      // Use the merged style that includes type defaults
      activeStyle = mergedStyle;

      // If in hover state, apply hover styles on top of merged style
      if (isHovered) {
        const elementStyles = dom.context.elementStyles.get(element.id);
        if (elementStyles?.hover) {
          activeStyle = { ...mergedStyle, ...elementStyles.hover };
        }
      }
    } else {
      // Fallback to stored element styles only (shouldn't happen with new approach)
      const elementStyles = dom.context.elementStyles.get(element.id);
      if (!elementStyles) return;
      activeStyle = isHovered && elementStyles.hover ? elementStyles.hover : elementStyles.normal;
    }

    console.log(`🎨 Material creation for ${element.id}, hover: ${isHovered}, background: ${activeStyle?.background}`);
    console.log(`🔍 Active style full object:`, activeStyle);

    // Parse opacity from the active style
    const opacity = render.actions.style.parseOpacity(activeStyle?.opacity);

    // Get the background to use - activeStyle should always include type defaults now
    const backgroundToUse = activeStyle?.background;

    let material;
    if (backgroundToUse) {
      // Parse background to check if it's a gradient or solid color
      const backgroundData = this.parseGradient(backgroundToUse);

      if (backgroundData?.type === 'solid') {
        // Solid color background
        const backgroundColor = render.actions.style.parseBackgroundColor(backgroundToUse);
        material = render.actions.mesh.createMaterial(`${element.id}-material-${isHovered ? 'hover' : 'normal'}`, backgroundColor, undefined, opacity);
        console.log(`Applied ${element.id} ${isHovered ? 'hover' : 'normal'} solid background:`, backgroundToUse, '-> parsed:', backgroundColor, 'opacity:', opacity);
      } else if (backgroundData?.type === 'linear' || backgroundData?.type === 'radial') {
        // Gradient background - get element dimensions from stored data
        const elementDims = dom.context.elementDimensions.get(element.id);
        const width = elementDims?.width || 100; // Fallback dimensions
        const height = elementDims?.height || 100;
        material = render.actions.mesh.createGradientMaterial(`${element.id}-gradient-${isHovered ? 'hover' : 'normal'}`, backgroundData, opacity, width, height);
        console.log(`Applied ${element.id} ${isHovered ? 'hover' : 'normal'} gradient background:`, backgroundData.type, backgroundData.gradient);
      } else {
        // Fallback for invalid background format
        console.warn(`Invalid background format for ${element.id}: ${backgroundToUse}, using default purple`);
        const fallbackColor = new Color3(0.7, 0.5, 0.9); // Light purple
        material = render.actions.mesh.createMaterial(`${element.id}-material-${isHovered ? 'hover' : 'normal'}`, fallbackColor, undefined, opacity);
      }
    } else {
      // This should not happen if type defaults are working correctly
      console.error(`No background found for ${element.id} (type: ${element.type}) - type defaults may not be working!`);
      const fallbackColor = new Color3(0.7, 0.5, 0.9); // Light purple
      material = render.actions.mesh.createMaterial(`${element.id}-material-${isHovered ? 'hover' : 'normal'}`, fallbackColor, undefined, opacity);
    }

    mesh.material = material;
    // Log mesh rotation and transform after material and transform application
    if (activeStyle?.transform) {
      console.log(`[MATERIAL DEBUG] ${element.id} transform string:`, activeStyle.transform);
    }
    console.log(`[MATERIAL DEBUG] ${element.id} mesh.rotation after material:`, mesh.rotation);
  }

  private applyImageMaterialUpdate(dom: BabylonDOM, render: BabylonRender, mesh: Mesh, element: DOMElement, isHovered: boolean, mergedStyle?: StyleRule): void {
    if (!mesh.material || !element.id) return;

    console.log(`🖼️ Updating image material for ${element.id}, hover: ${isHovered}`);

    // Get the active style (merged + hover if needed)
    let activeStyle = mergedStyle;
    if (isHovered && mergedStyle) {
      const elementStyles = dom.context.elementStyles.get(element.id);
      if (elementStyles?.hover) {
        activeStyle = { ...mergedStyle, ...elementStyles.hover };
      }
    }

    // For image elements, we want to preserve the existing texture material
    // and only update properties like opacity, scale, etc.
    const existingMaterial = mesh.material as StandardMaterial;

    if (existingMaterial) {
      // Update opacity
      const newOpacity = render.actions.style.parseOpacity(activeStyle?.opacity);
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
    // After applying transform, log mesh rotation and transform string
    console.log(`[IMAGE MATERIAL DEBUG] ${element.id} transform string:`, activeStyle?.transform);
    console.log(`[IMAGE MATERIAL DEBUG] ${element.id} mesh.rotation after material:`, mesh.rotation);
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

  private parsePaddingValue(render: BabylonRender, value?: string): number | null {
    if (!value) return null;
    // Handle "10px", "0.5", etc. - convert to world units
    const numericValue = parseFloat(value.replace('px', ''));
    // Use camera-calculated scaling factor for accurate conversion

    const scaleFactor = render.actions.camera.getPixelToWorldScale();
    return isNaN(numericValue) ? null : numericValue * scaleFactor;
  }

  private parseMarginValue(value?: string): number | null {
    if (!value) return null;
    // Handle "10px", "0.5", etc. - return raw pixel values without scaling
    // Scaling will be applied later in positioning calculations
    const numericValue = parseFloat(value.replace('px', ''));
    return isNaN(numericValue) ? null : numericValue; // Return raw pixel value
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

  private calculateZPosition(zIndex: number): number {
    // Base Z position for elements (slightly in front of the root background)
    const baseZ = 0.01;

    // Z-index scale factor - increase to 0.01 for much larger separation
    const zScale = 0.01;

    // Calculate final Z position: base + (zIndex * scale)
    // Positive z-index moves toward camera, negative moves away from camera
    return baseZ + (zIndex * zScale);
  }

  private getElementInfo(dom: BabylonDOM, elementId: string): { padding?: { top: number; right: number; bottom: number; left: number } } | null {
    // Get element dimension info for padding calculations
    const elementDimensions = dom.context.elementDimensions.get(elementId);
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

  private parseBorderWidth(render: BabylonRender, width?: string): number {
    if (!width) return 0;
    // Handle "2px", "0.1", etc. - convert to world units
    const numericValue = parseFloat(width.replace('px', ''));
    // Use camera-calculated scaling factor for accurate conversion
    const scaleFactor = render.actions.camera.getPixelToWorldScale();

    // Apply a slight reduction to compensate for 3D perspective effects that make borders appear thicker
    const perspectiveAdjustment = 0.8; // Reduce border width by 20% to account for 3D perspective
    return numericValue * scaleFactor * perspectiveAdjustment;
  }

  private applyBorderMaterial(dom: BabylonDOM, render: BabylonRender, borderMesh: Mesh, elementId: string, isHovered: boolean): void {
    const elementStyles = dom.context.elementStyles.get(elementId);
    if (!elementStyles) {
      console.log(`No element styles found for ${elementId}`);
      return;
    }

    // Get normal style for base properties
    const normalStyle = elementStyles.normal;
    const hoverStyle = elementStyles.hover;

    // For border properties, use hover values if available, otherwise fall back to normal
    const borderWidth = isHovered && hoverStyle?.borderWidth ? hoverStyle.borderWidth : normalStyle?.borderWidth;

    const borderColor = isHovered && hoverStyle?.borderColor ? hoverStyle.borderColor : normalStyle?.borderColor;

    const borderStyle = isHovered && hoverStyle?.borderStyle ? hoverStyle.borderStyle : normalStyle?.borderStyle;

    // Parse opacity from the active style
    const activeStyle = isHovered && hoverStyle ? hoverStyle : normalStyle;
    const opacity = render.actions.style.parseOpacity(activeStyle?.opacity);

    const borderProperties = {
      width: this.parseBorderWidth(render, borderWidth),
      color: render.actions.style.parseBackgroundColor(borderColor),
      style: borderStyle || 'solid'
    };

    console.log(`Applying border material for ${elementId}, isHovered: ${isHovered}, borderWidth: ${borderProperties.width}, borderColor:`, borderProperties.color, 'opacity:', opacity);

    if (borderProperties.width > 0) {
      const borderMaterial = render.actions.mesh.createMaterial(
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

  private setupMouseEvents(dom: BabylonDOM, render: BabylonRender, mesh: Mesh, elementId: string): void {
    let needsRecreation = false;

    if (!render.scene) {
      throw new Error('Scene not initialized');
    }

    mesh.actionManager = new ActionManager(render.scene);

    mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
      // Always get the latest mesh reference
      const mainMesh = dom.context.elements.get(elementId);
      if (!mainMesh) return;
      const elementType = dom.context.elementTypes.get(elementId) || 'div';
      const element = { id: elementId, type: elementType } as DOMElement;
      const elementStyles = dom.context.elementStyles.get(elementId);
      const typeDefaults = this.styleDefaults.getElementTypeDefaults(element.type);
      const normalStyle = (elementStyles?.normal || {}) as StyleRule;
      const hoverStyle = (elementStyles?.hover || {}) as StyleRule;
      const mergedStyle: StyleRule = { ...typeDefaults, ...normalStyle, ...hoverStyle, selector: `#${elementId}` };

      const normalRadius = this.parseBorderRadius(normalStyle?.borderRadius);
      const safeNormalRadius = isNaN(normalRadius) ? 0 : normalRadius;
      const hoverRadius = this.parseBorderRadius(hoverStyle?.borderRadius);
      const dimensions = dom.context.elementDimensions.get(elementId);
      const pixelToWorldScale = render.actions.camera.getPixelToWorldScale(); // <-- moved here
      if (dimensions) {
        const worldBorderRadius = (hoverStyle?.borderRadius !== undefined ? hoverRadius : safeNormalRadius) * pixelToWorldScale;
        const worldWidth = dimensions.width * pixelToWorldScale;
        const worldHeight = dimensions.height * pixelToWorldScale;
        const polygonType = this.parsePolygonType(mergedStyle?.polygonType) || 'rectangle';
        // Update mesh geometry for hover border radius
        const vertexData = render.actions.mesh.generatePolygonVertexData(
          polygonType,
          worldWidth,
          worldHeight,
          worldBorderRadius
        );
        vertexData.applyToMesh(mainMesh, true);
        // Remove old border meshes
        for (let i = 0; i < 4; i++) {
          const borderMesh = dom.context.elements.get(`${elementId}-border-${i}`);
          if (borderMesh) {
            borderMesh.dispose();
            dom.context.elements.delete(`${elementId}-border-${i}`);
            console.log(`[ELEMENT HOVER DEBUG] Disposed old border mesh for hover: ${elementId}-border-${i}`);
          }
        }
        // Create new border meshes for hover
        const borderWidth = this.parseBorderWidth(render, hoverStyle?.borderWidth ?? normalStyle.borderWidth);
        const borderColor = render.actions.style.parseBackgroundColor(hoverStyle?.borderColor ?? normalStyle.borderColor);
        const borderMeshes = render.actions.mesh.createPolygonBorder(
          `${elementId}-border`,
          polygonType,
          worldWidth,
          worldHeight,
          borderWidth,
          worldBorderRadius
        );
        const borderZPosition = mainMesh.position.z + 0.001;
        render.actions.mesh.positionBorderFrames(
          borderMeshes,
          mainMesh.position.x,
          mainMesh.position.y,
          borderZPosition,
          worldWidth,
          worldHeight,
          borderWidth
        );
        const borderOpacity = render.actions.style.parseOpacity(hoverStyle?.opacity ?? normalStyle.opacity);
        const borderMaterial = render.actions.mesh.createMaterial(
          `${elementId}-border-material`,
          borderColor,
          undefined,
          borderOpacity
        );
        borderMeshes.forEach((borderMesh, index) => {
          borderMesh.material = borderMaterial;
          if (mainMesh.parent && mainMesh.parent instanceof Mesh) {
            render.actions.mesh.parentMesh(borderMesh, mainMesh.parent);
          }
          dom.context.elements.set(`${elementId}-border-${index}`, borderMesh);
          console.log(`[ELEMENT HOVER DEBUG] Created hover border mesh: ${elementId}-border-${index}`);
        });
        // Calculate worldBorderRadius and polygonType for shadow
        const shadowBorderRadius = (hoverStyle?.borderRadius !== undefined ? hoverRadius : safeNormalRadius) * pixelToWorldScale;
        const shadowPolygonType = this.parsePolygonType(mergedStyle?.polygonType) || 'rectangle';
        // Ensure parent is a Mesh
        const shadowParent = (mainMesh.parent && mainMesh.parent instanceof Mesh) ? mainMesh.parent : mesh;
        // Add or update shadow mesh for hover
        this.updateShadowMesh(dom, render, elementId, mergedStyle, shadowParent, dimensions, mainMesh.position.z, shadowBorderRadius, shadowPolygonType, this.parseTransform(mergedStyle.transform) || undefined);
      }
      dom.context.hoverStates.set(elementId, true);
      this.applyElementMaterial(dom, render, mainMesh, element, true, mergedStyle);
      const transform = this.parseTransform(mergedStyle?.transform);
      if (transform) {
        this.applyTransforms(mainMesh, transform);
        // Also apply to all border meshes and parent them to the main mesh
        for (let i = 0; i < 4; i++) {
          const borderMesh = dom.context.elements.get(`${elementId}-border-${i}`);
          if (borderMesh) {
            this.applyTransforms(borderMesh, transform);
            // Parent border mesh to main mesh for transform inheritance
            render.actions.mesh.parentMesh(borderMesh, mainMesh);
          }
        }
      }
      // After all style/geometry updates, log the mesh rotation and transform
      if (mergedStyle.transform) {
        console.log(`[HOVER DEBUG] ${elementId} transform string:`, mergedStyle.transform);
      }
      console.log(`[HOVER DEBUG] ${elementId} mesh.rotation after hover:`, mainMesh.rotation);
      // Remove old shadow mesh
      const oldShadow = dom.context.elements.get(`${elementId}-shadow`);
      if (oldShadow) {
        oldShadow.dispose();
        dom.context.elements.delete(`${elementId}-shadow`);
      }
      // Calculate worldBorderRadius and polygonType for shadow
      const shadowBorderRadius = (hoverStyle?.borderRadius !== undefined ? hoverRadius : safeNormalRadius) * pixelToWorldScale;
      const shadowPolygonType = this.parsePolygonType(mergedStyle?.polygonType) || 'rectangle';
      // Ensure parent is a Mesh
      const shadowParent = (mainMesh.parent && mainMesh.parent instanceof Mesh) ? mainMesh.parent : mesh;
      // Add or update shadow mesh for hover
      this.updateShadowMesh(dom, render, elementId, mergedStyle, shadowParent, dimensions, mainMesh.position.z, shadowBorderRadius, shadowPolygonType, this.parseTransform(mergedStyle.transform) || undefined);
    }));

    mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
      // Always get the latest mesh reference
      const mainMesh = dom.context.elements.get(elementId);
      if (!mainMesh) return;
      const elementType = dom.context.elementTypes.get(elementId) || 'div';
      const element = { id: elementId, type: elementType } as DOMElement;
      const elementStyles = dom.context.elementStyles.get(elementId);
      const typeDefaults = this.styleDefaults.getElementTypeDefaults(element.type);
      const normalStyle = (elementStyles?.normal || {}) as StyleRule;
      const mergedStyle: StyleRule = { ...typeDefaults, ...normalStyle, selector: `#${elementId}` };
      const normalRadius = this.parseBorderRadius(normalStyle?.borderRadius);
      const safeNormalRadius = isNaN(normalRadius) ? 0 : normalRadius;
      const dimensions = dom.context.elementDimensions.get(elementId);
      const pixelToWorldScale = render.actions.camera.getPixelToWorldScale(); // <-- moved here
      if (dimensions) {
        const worldBorderRadius = safeNormalRadius * pixelToWorldScale;
        const worldWidth = dimensions.width * pixelToWorldScale;
        const worldHeight = dimensions.height * pixelToWorldScale;
        const polygonType = this.parsePolygonType(mergedStyle?.polygonType) || 'rectangle';
        // Update mesh geometry for normal border radius
        const vertexData = render.actions.mesh.generatePolygonVertexData(
          polygonType,
          worldWidth,
          worldHeight,
          worldBorderRadius
        );
        vertexData.applyToMesh(mainMesh, true);
        // Remove old border meshes
        for (let i = 0; i < 4; i++) {
          const borderMesh = dom.context.elements.get(`${elementId}-border-${i}`);
          if (borderMesh) {
            borderMesh.dispose();
            dom.context.elements.delete(`${elementId}-border-${i}`);
            console.log(`[ELEMENT HOVER DEBUG] Disposed old border mesh for normal: ${elementId}-border-${i}`);
          }
        }
        // Create new border meshes for normal
        const borderWidth = this.parseBorderWidth(render, normalStyle.borderWidth);
        const borderColor = render.actions.style.parseBackgroundColor(normalStyle.borderColor);
        const borderMeshes = render.actions.mesh.createPolygonBorder(
          `${elementId}-border`,
          polygonType,
          worldWidth,
          worldHeight,
          borderWidth,
          worldBorderRadius
        );
        const borderZPosition = mainMesh.position.z + 0.001;
        render.actions.mesh.positionBorderFrames(
          borderMeshes,
          mainMesh.position.x,
          mainMesh.position.y,
          borderZPosition,
          worldWidth,
          worldHeight,
          borderWidth
        );
        const borderOpacity = render.actions.style.parseOpacity(normalStyle.opacity);
        const borderMaterial = render.actions.mesh.createMaterial(
          `${elementId}-border-material`,
          borderColor,
          undefined,
          borderOpacity
        );
        borderMeshes.forEach((borderMesh, index) => {
          borderMesh.material = borderMaterial;
          if (mainMesh.parent && mainMesh.parent instanceof Mesh) {
            render.actions.mesh.parentMesh(borderMesh, mainMesh.parent);
          }
          dom.context.elements.set(`${elementId}-border-${index}`, borderMesh);
          console.log(`[ELEMENT HOVER DEBUG] Created normal border mesh: ${elementId}-border-${index}`);
        });
        // Calculate worldBorderRadius and polygonType for shadow
        const shadowBorderRadius = safeNormalRadius * pixelToWorldScale;
        const shadowPolygonType = this.parsePolygonType(mergedStyle?.polygonType) || 'rectangle';
        // Ensure parent is a Mesh
        const shadowParent = (mainMesh.parent && mainMesh.parent instanceof Mesh) ? mainMesh.parent : mesh;
        // Add or update shadow mesh for normal
        this.updateShadowMesh(dom, render, elementId, mergedStyle, shadowParent, dimensions, mainMesh.position.z, shadowBorderRadius, shadowPolygonType, this.parseTransform(mergedStyle.transform) || undefined);
      }
      dom.context.hoverStates.set(elementId, false);
      this.applyElementMaterial(dom, render, mainMesh, element, false, mergedStyle);
      const transform = this.parseTransform(mergedStyle?.transform);
      if (transform) {
        this.applyTransforms(mainMesh, transform);
        // Also apply to all border meshes and parent them to the main mesh
        for (let i = 0; i < 4; i++) {
          const borderMesh = dom.context.elements.get(`${elementId}-border-${i}`);
          if (borderMesh) {
            this.applyTransforms(borderMesh, transform);
            // Parent border mesh to main mesh for transform inheritance
            render.actions.mesh.parentMesh(borderMesh, mainMesh);
          }
        }
      } else {
        mainMesh.scaling.x = 1;
        mainMesh.scaling.y = 1;
        mainMesh.scaling.z = 1;
        mainMesh.rotation.x = 0;
        mainMesh.rotation.y = 0;
        mainMesh.rotation.z = 0;
        for (let i = 0; i < 4; i++) {
          const borderMesh = dom.context.elements.get(`${elementId}-border-${i}`);
          if (borderMesh) {
            borderMesh.scaling.x = 1;
            borderMesh.scaling.y = 1;
            borderMesh.scaling.z = 1;
            borderMesh.rotation.x = 0;
            borderMesh.rotation.y = 0;
            borderMesh.rotation.z = 0;
          }
        }
      }
      // Remove old shadow mesh
      const oldShadow = dom.context.elements.get(`${elementId}-shadow`);
      if (oldShadow) {
        oldShadow.dispose();
        dom.context.elements.delete(`${elementId}-shadow`);
      }
      // Calculate worldBorderRadius and polygonType for shadow
      const shadowBorderRadius = safeNormalRadius * pixelToWorldScale;
      const shadowPolygonType = this.parsePolygonType(mergedStyle?.polygonType) || 'rectangle';
      // Ensure parent is a Mesh
      const shadowParent = (mainMesh.parent && mainMesh.parent instanceof Mesh) ? mainMesh.parent : mesh;
      // Add or update shadow mesh for normal
      this.updateShadowMesh(dom, render, elementId, mergedStyle, shadowParent, dimensions, mainMesh.position.z, shadowBorderRadius, shadowPolygonType, this.parseTransform(mergedStyle.transform) || undefined);
    }));
  }

  /**
   * Converts a padding object from world units to pixels using the camera scale factor.
   * @param padding The padding object with top/right/bottom/left in world units.
   * @param render The BabylonRender object to get the scale factor.
   * @returns The padding object in pixels.
   */
  private convertPaddingToPixels(padding: { top: number; right: number; bottom: number; left: number }, render: BabylonRender): { top: number; right: number; bottom: number; left: number } {
    const scale = render.actions.camera.getPixelToWorldScale();
    if (!scale || scale === 0) return { ...padding };
    return {
      top: Math.round(padding.top / scale),
      right: Math.round(padding.right / scale),
      bottom: Math.round(padding.bottom / scale),
      left: Math.round(padding.left / scale)
    };
  }

  // Helper to parse RGBA color and multiply alpha
  private getBoxShadowColorWithOpacity(color: string, styleOpacity: number): string {
    // Try to parse rgba/hsla or hex
    const rgbaRegex = /rgba?\(([^)]+)\)/;
    const match = color.match(rgbaRegex);
    if (match) {
      const parts = match[1].split(',').map(p => p.trim());
      let r = parseFloat(parts[0]);
      let g = parseFloat(parts[1]);
      let b = parseFloat(parts[2]);
      let a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
      a = Math.max(0, Math.min(1, a * styleOpacity));
      return `rgba(${r},${g},${b},${a})`;
    }
    // Hex or named color fallback: just return as is (no alpha multiplication)
    return color;
  }

  // Helper to create or update the shadow mesh for an element
  private updateShadowMesh(dom: BabylonDOM, render: BabylonRender, elementId: string, style: StyleRule, parent: Mesh, dimensions: any, zPosition: number, borderRadius: number, polygonType: string, transform?: TransformData) {
    // Remove old shadow mesh if it exists
    const oldShadow = dom.context.elements.get(`${elementId}-shadow`);
    if (oldShadow) {
      oldShadow.dispose();
      dom.context.elements.delete(`${elementId}-shadow`);
    }
    const boxShadow = this.parseBoxShadow(style?.boxShadow);
    if (!boxShadow) return;
    const scaleFactor = render.actions.camera.getPixelToWorldScale();
    const worldWidth = dimensions.width * scaleFactor;
    const worldHeight = dimensions.height * scaleFactor;
    const scaledOffsetX = boxShadow.offsetX * scaleFactor;
    const scaledOffsetY = boxShadow.offsetY * scaleFactor;
    const scaledBlur = boxShadow.blur * scaleFactor;
    // Multiply color alpha by style opacity
    const styleOpacity = render.actions.style.parseOpacity(style.opacity);
    const shadowColor = this.getBoxShadowColorWithOpacity(boxShadow.color, styleOpacity);
    const shadowMesh = render.actions.mesh.createShadow(
      `${elementId}-shadow`,
      worldWidth,
      worldHeight,
      scaledOffsetX,
      scaledOffsetY,
      scaledBlur,
      shadowColor,
      polygonType,
      borderRadius
    );
    // Position shadow behind the element with offset
    const shadowZ = zPosition - 0.001;
    // Convert shadow position to world units
    const shadowX = (dimensions.x + scaledOffsetX) * scaleFactor;
    const shadowY = (dimensions.y - scaledOffsetY) * scaleFactor;
    render.actions.mesh.positionMesh(shadowMesh, shadowX, shadowY, shadowZ);
    render.actions.mesh.parentMesh(shadowMesh, parent);
    // Apply transforms if present
    if (transform) {
      this.applyTransforms(shadowMesh, transform);
    }
    dom.context.elements.set(`${elementId}-shadow`, shadowMesh);
  }
} 