import { Injectable } from '@angular/core';
import { Scene, Color3, Mesh, StandardMaterial, Material, Texture } from '@babylonjs/core';
import { BabylonMeshService } from './babylon-mesh.service';
import { StyleService } from './style.service';
import { StyleRule } from '../types/style-rule';
import { DOMElement } from '../types/dom-element';

@Injectable({
  providedIn: 'root'
})
export class MaterialService {
  private scene?: Scene;
  private meshService?: BabylonMeshService;
  private styleService?: StyleService;

  initialize(scene: Scene, meshService: BabylonMeshService, styleService: StyleService): void {
    this.scene = scene;
    this.meshService = meshService;
    this.styleService = styleService;
  }

  applyElementMaterial(mesh: Mesh, element: DOMElement, isHovered: boolean, mergedStyle?: StyleRule): void {
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
        const elementStyles = this.styleService?.getElementStyle(element.id);
        if (elementStyles?.hover) {
          activeStyle = { ...mergedStyle, ...elementStyles.hover };
        }
      }
    } else {
      // Fallback to stored element styles only (shouldn't happen with new approach)
      const elementStyles = this.styleService?.getElementStyle(element.id);
      if (!elementStyles) return;
      activeStyle = isHovered && elementStyles.hover ? elementStyles.hover : elementStyles.normal;
    }
    
    console.log(`🎨 Material creation for ${element.id}, hover: ${isHovered}, background: ${activeStyle?.background}`);
    console.log(`🔍 Active style full object:`, activeStyle);
    
    // Parse opacity from the active style
    const opacity = this.styleService?.parseOpacity(activeStyle?.opacity) || 1.0;

    // Get the background to use - activeStyle should always include type defaults now
    const backgroundToUse = activeStyle?.background;

    let material;
    if (backgroundToUse) {
      // Parse background to check if it's a gradient or solid color
      const backgroundData = this.styleService?.parseGradient(backgroundToUse);
      
      if (backgroundData?.type === 'solid') {
        // Solid color background
        const backgroundColor = this.styleService?.parseBackgroundColor(backgroundToUse);
        if (backgroundColor) {
          material = this.meshService?.createMaterial(`${element.id}-material-${isHovered ? 'hover' : 'normal'}`, backgroundColor, undefined, opacity);
        }
        console.log(`Applied ${element.id} ${isHovered ? 'hover' : 'normal'} solid background:`, backgroundToUse, '-> parsed:', backgroundColor, 'opacity:', opacity);
      } else if (backgroundData?.type === 'linear' || backgroundData?.type === 'radial') {
        // Gradient background - get element dimensions from stored data
        // Note: This would need to be passed in or retrieved from a service
        const width = 100; // Fallback dimensions
        const height = 100;
        material = this.meshService?.createGradientMaterial(`${element.id}-gradient-${isHovered ? 'hover' : 'normal'}`, backgroundData, opacity, width, height);
        console.log(`Applied ${element.id} ${isHovered ? 'hover' : 'normal'} gradient background:`, backgroundData.type, backgroundData.gradient);
      } else {
        // Fallback for invalid background format
        console.warn(`Invalid background format for ${element.id}: ${backgroundToUse}, using default purple`);
        const fallbackColor = new Color3(0.7, 0.5, 0.9); // Light purple
        material = this.meshService?.createMaterial(`${element.id}-material-${isHovered ? 'hover' : 'normal'}`, fallbackColor, undefined, opacity);
      }
    } else {
      // This should not happen if type defaults are working correctly
      console.error(`No background found for ${element.id} (type: ${element.type}) - type defaults may not be working!`);
      const fallbackColor = new Color3(0.7, 0.5, 0.9); // Light purple
      material = this.meshService?.createMaterial(`${element.id}-material-${isHovered ? 'hover' : 'normal'}`, fallbackColor, undefined, opacity);
    }

    if (material) {
      mesh.material = material;
    }
  }

  private applyImageMaterialUpdate(mesh: Mesh, element: DOMElement, isHovered: boolean, mergedStyle?: StyleRule): void {
    if (!mesh.material || !element.id) return;
    
    console.log(`🖼️ Updating image material for ${element.id}, hover: ${isHovered}`);
    
    // Get the active style (merged + hover if needed)
    let activeStyle = mergedStyle;
    if (isHovered && mergedStyle) {
      const elementStyles = this.styleService?.getElementStyle(element.id);
      if (elementStyles?.hover) {
        activeStyle = { ...mergedStyle, ...elementStyles.hover };
      }
    }
    
    // For image elements, we want to preserve the existing texture material
    // and only update properties like opacity, scale, etc.
    const existingMaterial = mesh.material as StandardMaterial;
    
    if (existingMaterial) {
      // Update opacity
      const newOpacity = this.styleService?.parseOpacity(activeStyle?.opacity) || 1.0;
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
        const transformData = this.styleService?.parseTransform(activeStyle.transform);
        
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

  applyBorderMaterial(borderMesh: Mesh, elementId: string, isHovered: boolean): void {
    if (!this.meshService) return;
    
    const elementStyles = this.styleService?.getElementStyle(elementId);
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
    const opacity = this.styleService?.parseOpacity(activeStyle?.opacity) || 1.0;
    
    const borderProperties = {
      width: this.styleService?.parseBorderWidth(borderWidth) || 0,
      color: this.styleService?.parseBackgroundColor(borderColor),
      style: borderStyle || 'solid'
    };
    
    console.log(`Applying border material for ${elementId}, isHovered: ${isHovered}, borderWidth: ${borderProperties.width}, borderColor:`, borderProperties.color, 'opacity:', opacity);
    
    if (borderProperties.width > 0 && borderProperties.color) {
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

  applyBoxShadow(mesh: Mesh, elementId: string, style: StyleRule, dimensions: any, zPosition: number, parent: Mesh, flexPosition?: { x: number; y: number; z: number }): void {
    if (!this.meshService) return;

    const boxShadow = this.styleService?.parseBoxShadow(style?.boxShadow);
    if (boxShadow) {
      // Scale box shadow values from pixels to world coordinates
      const pixelToWorldScale = 0.01;
      const scaledOffsetX = boxShadow.offsetX * pixelToWorldScale;
      const scaledOffsetY = boxShadow.offsetY * pixelToWorldScale;
      const scaledBlur = boxShadow.blur * pixelToWorldScale;
      
      console.log(`🎭 Box shadow scaling for ${elementId}: offset (${boxShadow.offsetX}px, ${boxShadow.offsetY}px) → (${scaledOffsetX.toFixed(3)}, ${scaledOffsetY.toFixed(3)}) world units, blur ${boxShadow.blur}px → ${scaledBlur.toFixed(3)} world units`);
      
      const polygonType = this.styleService?.parsePolygonType(style?.polygonType) || 'rectangle';
      const borderRadiusPixels = this.styleService?.parseBorderRadius(style?.borderRadius) || 0;
      const borderRadius = borderRadiusPixels * pixelToWorldScale;
      
      const shadowMesh = this.meshService.createShadow(
        `${elementId}-shadow`,
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
  }

  applyBorders(mesh: Mesh, elementId: string, style: StyleRule, dimensions: any, zPosition: number, parent: Mesh, flexPosition?: { x: number; y: number; z: number }): void {
    if (!this.meshService) return;

    const elementStyles = this.styleService?.getElementStyle(elementId);
    const borderProperties = this.styleService?.parseBorderProperties(elementStyles?.normal);
    
    if (borderProperties && borderProperties.width > 0 && borderProperties.color) {
      console.log(`Creating border for ${elementId} with width ${borderProperties.width}`);
      
      // Use unified polygon border system for all shapes
      const polygonType = this.styleService?.parsePolygonType(style?.polygonType) || 'rectangle';
      const borderRadiusPixels = this.styleService?.parseBorderRadius(style?.borderRadius) || 0;
      const pixelToWorldScale = 0.01;
      const borderRadius = borderRadiusPixels * pixelToWorldScale;
      
      const borderMeshes = this.meshService.createPolygonBorder(
        `${elementId}-border`,
        polygonType,
        dimensions.width,
        dimensions.height,
        borderProperties.width,
        borderRadius
      );
      
      // Calculate Z position for borders (slightly above element for visibility)
      const borderZPosition = zPosition + 0.001; // Borders with significant offset above element
      
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
      const borderOpacity = this.styleService?.parseOpacity(elementStyles?.normal?.opacity) || 1.0;
      const borderMaterial = this.meshService.createMaterial(
        `${elementId}-border-material`,
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
      
      console.log(`Applied border - width: ${borderProperties.width}, color:`, borderProperties.color);
    }
  }
} 