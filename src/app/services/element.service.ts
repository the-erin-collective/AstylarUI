import { Injectable } from '@angular/core';
import { Scene, Color3, Vector3, Mesh, StandardMaterial, Material, Texture } from '@babylonjs/core';
import { BabylonMeshService } from './babylon-mesh.service';
import { BabylonCameraService } from './babylon-camera.service';
import { StyleService } from './style.service';
import { TextureService } from './texture.service';
import { MaterialService } from './material.service';
import { InteractionService } from './interaction.service';
import { StyleRule } from '../types/style-rule';
import { DOMElement } from '../types/dom-element';
import { TransformData } from '../types/transform-data';

@Injectable({
  providedIn: 'root'
})
export class ElementService {
  private scene?: Scene;
  private meshService?: BabylonMeshService;
  private cameraService?: BabylonCameraService;
  private styleService?: StyleService;
  private textureService?: TextureService;
  private materialService?: MaterialService;
  private interactionService?: InteractionService;

  initialize(scene: Scene, meshService: BabylonMeshService, cameraService: BabylonCameraService, styleService: StyleService, textureService: TextureService, materialService?: MaterialService, interactionService?: InteractionService, getElementInfoCallback?: (elementId: string) => { padding?: { top: number; right: number; bottom: number; left: number } } | null): void {
    this.scene = scene;
    this.meshService = meshService;
    this.cameraService = cameraService;
    this.styleService = styleService;
    this.textureService = textureService;
    this.materialService = materialService;
    this.interactionService = interactionService;
    this.getElementInfo = getElementInfoCallback || this.getElementInfo;
  }

  createElement(element: DOMElement, parent: Mesh, styles: StyleRule[], flexPosition?: { x: number; y: number; z: number }, flexSize?: { width: number; height: number }): Mesh {
    if (!this.scene || !this.meshService) throw new Error('Services not initialized');

    // Get element styles (normal and hover)
    const elementStyles = element.id ? this.styleService?.getElementStyle(element.id) : undefined;
    const explicitStyle = elementStyles?.normal;
    
    // Get default styles for this element type
    const typeDefaults = this.getElementTypeDefaults(element.type);
    console.log(`🎨 Type defaults for ${element.type}:`, typeDefaults);
    
    // Merge defaults with explicit styles (explicit styles override defaults)
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
    const borderRadiusPixels = this.styleService?.parseBorderRadius(style?.borderRadius) || 0;
    const pixelToWorldScale = 0.01;
    const borderRadius = borderRadiusPixels * pixelToWorldScale;

    console.log(`🔧 Border radius scaling: ${borderRadiusPixels}px → ${borderRadius.toFixed(3)} world units (scale: ${pixelToWorldScale}, shape: ${dimensions.width.toFixed(1)}×${dimensions.height.toFixed(1)})`);

    // Parse polygon properties
    const polygonType = this.styleService?.parsePolygonType(style?.polygonType) || 'rectangle';
    
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
    const zIndex = this.styleService?.parseZIndex(style?.zIndex) || 0;
    const baseZPosition = this.calculateZPosition(zIndex);
    
    // Use flex position Z if provided (it includes index-based layering), otherwise use calculated Z
    const zPosition = flexPosition ? flexPosition.z : baseZPosition;
    
    console.log(`🎯 Z-positioning for ${element.id}:`, {
      zIndex: zIndex,
      baseZPosition: baseZPosition,
      flexZPosition: flexPosition?.z,
      finalZPosition: zPosition,
      hasZIndexStyle: !!(style?.zIndex)
    });
    
    // Position relative to parent (parent's coordinate system)
    let actualZPosition = zPosition;
    
    // Use flex positioning if provided, otherwise use normal positioning
    if (flexPosition) {
      actualZPosition = zPosition;
      console.log(`🔀 Using flex positioning for ${element.id}: (${flexPosition.x.toFixed(2)}, ${flexPosition.y.toFixed(2)}, ${zPosition.toFixed(6)})`);
      this.meshService.positionMesh(mesh, flexPosition.x, flexPosition.y, zPosition);
    } else {
      this.meshService.positionMesh(mesh, dimensions.x, dimensions.y, zPosition);
    }

    // Parent the mesh so it inherits parent's transformations
    this.meshService.parentMesh(mesh, parent);

    // Apply material (start with normal state) - pass merged style that includes type defaults
    this.materialService?.applyElementMaterial(mesh, element, false, style);

    // Apply transforms if specified
    const transform = this.styleService?.parseTransform(style?.transform);
    if (transform) {
      this.applyTransforms(mesh, transform);
    }

    // Add box shadow if specified
    const boxShadow = this.styleService?.parseBoxShadow(style?.boxShadow);
    if (boxShadow) {
      // Scale box shadow values from pixels to world coordinates
      const pixelToWorldScale = 0.01;
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
    const borderElementStyles = element.id ? this.styleService?.getElementStyle(element.id) : undefined;
    const borderProperties = this.styleService?.parseBorderProperties(borderElementStyles?.normal);
    
    if (borderProperties && borderProperties.width > 0) {
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
      const borderZPosition = actualZPosition + 0.001; // Borders with significant offset above element
      
      // Position border frames around the element
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
      
      // Apply border material to all frames with consistent rendering
      const borderOpacity = this.styleService?.parseOpacity(borderElementStyles?.normal?.opacity);
      const borderMaterial = this.meshService.createMaterial(
        `${element.id}-border-material`,
        borderProperties.color,
        undefined,
        borderOpacity
      );
      
      borderMeshes.forEach(borderMesh => {
        borderMesh.material = borderMaterial;
        
        // Apply same parenting as main element for consistent coordinate system
        if (parent && this.meshService) {
          this.meshService.parentMesh(borderMesh, parent);
        }
      });
      
      // Store border references for cleanup and add hover events
      if (element.id) {
        borderMeshes.forEach((borderMesh, index) => {
          // Register border element with interaction service
          if (element.id) {
            this.interactionService?.setBorderElement(element.id, index, borderMesh);
            
            // Add hover events to border frames if element has hover styles
            if (borderElementStyles?.hover) {
              this.interactionService?.setupMouseEvents(borderMesh, element.id);
            }
          }
        });
        console.log(`Applied border - width: ${borderProperties.width}, color:`, borderProperties.color);
      }
    }

    // Register element with interaction service for hover handling
    if (element.id) {
      this.interactionService?.setElement(element.id, mesh, element.type);
    }

    // Add mouse events if element has hover styles
    if (element.id && borderElementStyles?.hover) {
      this.interactionService?.setupMouseEvents(mesh, element.id);
    }

    console.log(`Created element ${element.id}:`, {
      position: mesh.position,
      dimensions,
      parentId: parent.name,
      style
    });

    return mesh;
  }

  getCalculatedDimensions(element: DOMElement, parent: Mesh, styles: StyleRule[]): { width: number; height: number; padding: { top: number; right: number; bottom: number; left: number } } | null {
    if (!element.id) return null;
    
    // Get element styles (normal and hover)
    const elementStyles = this.styleService?.getElementStyle(element.id);
    const explicitStyle = elementStyles?.normal;
    
    // Get default styles for this element type
    const typeDefaults = this.getElementTypeDefaults(element.type);
    
    // Merge defaults with explicit styles (explicit styles override defaults)
    const style: StyleRule = {
      selector: element.id ? `#${element.id}` : element.type,
      ...typeDefaults,
      ...explicitStyle
    };
    
    // Calculate dimensions
    const dimensions = this.calculateDimensions(style, parent);
    
    return {
      width: dimensions.width,
      height: dimensions.height,
      padding: dimensions.padding
    };
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
    const padding = this.styleService?.parsePadding(this.cameraService?.getPixelToWorldScale(), style) || { top: 0, right: 0, bottom: 0, left: 0 };
    // Use raw margin values (not scaled) to match original service behavior
    const margin = this.parseMarginRaw(style) || { top: 0, right: 0, bottom: 0, left: 0 };

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
        const widthPercent = this.styleService?.parsePercentageValue(style.width) || 0;
        width = (widthPercent / 100) * availableWidth;
      }
      
      // Calculate height as percentage of available space (after margins)
      if (style.height) {
        const heightPercent = this.styleService?.parsePercentageValue(style.height) || 0;
        height = (heightPercent / 100) * availableHeight;
      }

      // Calculate position - CSS uses top-left origin, BabylonJS uses center origin
      if (style.left !== undefined) {
        const leftPercent = this.styleService?.parsePercentageValue(style.left) || 0;
        const scaleFactor = this.cameraService?.getPixelToWorldScale() || 0.03;
        const scaledMarginLeft = margin.left * scaleFactor;
        
        x = (-parentWidth / 2) + scaledMarginLeft + ((leftPercent / 100) * availableWidth) + (width / 2);
      }

      if (style.top !== undefined) {
        const topPercent = this.styleService?.parsePercentageValue(style.top) || 0;
        const scaleFactor = this.cameraService?.getPixelToWorldScale() || 0.03;
        const scaledMarginTop = margin.top * scaleFactor;
        
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
    // This method needs to be implemented to get element info from the main service
    // For now, return null - this will be handled by the main service
    return null;
  }

  private parseMarginRaw(style: StyleRule | undefined): { top: number; right: number; bottom: number; left: number } | null {
    if (!style) {
      return null;
    }

    // Check for individual margin properties first
    const marginTop = this.parseMarginValueRaw(style.marginTop);
    const marginRight = this.parseMarginValueRaw(style.marginRight);
    const marginBottom = this.parseMarginValueRaw(style.marginBottom);
    const marginLeft = this.parseMarginValueRaw(style.marginLeft);

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
    return this.parseMarginBoxValuesRaw(style.margin);
  }

  private parseMarginValueRaw(value?: string): number | null {
    if (!value) return null;
    // Handle "10px", "0.5", etc. - return raw pixel values without scaling
    // Scaling will be applied later in positioning calculations
    const numericValue = parseFloat(value.replace('px', ''));
    return isNaN(numericValue) ? null : numericValue; // Return raw pixel value
  }

  private parseMarginBoxValuesRaw(value?: string): { top: number; right: number; bottom: number; left: number } {
    if (!value) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const values = value.split(/\s+/).map(v => this.parseMarginValueRaw(v) ?? 0);
    
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
    this.textureService?.getTexture(imageSrc, this.scene)
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
        const opacity = this.styleService?.parseOpacity(style.opacity) || 1.0;
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
    
    return anchorMesh;
  }

  private applyFallbackMaterial(mesh: Mesh, elementId: string): void {
    // Fallback: create a colored rectangle as placeholder
    const fallbackMaterial = new StandardMaterial(`${elementId}-fallback-material`, this.scene);
    fallbackMaterial.diffuseColor = new Color3(0.8, 0.4, 0.4); // Reddish placeholder to indicate missing image
    fallbackMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1);
    mesh.material = fallbackMaterial;
    console.log(`🔄 Applied fallback material for ${elementId}`);
  }
} 