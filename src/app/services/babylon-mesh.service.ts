import { Injectable } from '@angular/core';
import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh, Material } from '@babylonjs/core';
import { BabylonCameraService } from './babylon-camera.service';

@Injectable({
  providedIn: 'root'
})
export class BabylonMeshService {
  private scene?: Scene;
  private cameraService?: BabylonCameraService;

  constructor() {}

  initialize(scene: Scene, cameraService?: BabylonCameraService): void {
    this.scene = scene;
    this.cameraService = cameraService;
  }

  createPlane(name: string, width: number, height: number): Mesh {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    return MeshBuilder.CreatePlane(name, { 
      width: width,
      height: height
    }, this.scene);
  }

  createBorderMesh(name: string, elementWidth: number, elementHeight: number, borderWidth: number): Mesh[] {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    // Get unified border dimensions from camera service for consistency
    let borderDimensions;
    if (this.cameraService) {
      // Use a dummy center position just to get the dimensions calculation
      const layout = this.cameraService.calculateUnifiedBorderLayout(0, 0, 0, elementWidth, elementHeight, borderWidth);
      borderDimensions = layout.borderDimensions;
    } else {
      // Fallback calculation if camera service not available
      borderDimensions = {
        horizontal: { width: elementWidth + (borderWidth * 2), height: borderWidth },
        vertical: { width: borderWidth, height: elementHeight }
      };
    }

    // Create 4 border rectangles using unified dimensions
    const borders: Mesh[] = [];
    
    // Top border - uses horizontal dimensions
    const topBorder = MeshBuilder.CreatePlane(`${name}-top`, {
      width: borderDimensions.horizontal.width,
      height: borderDimensions.horizontal.height
    }, this.scene);
    borders.push(topBorder);
    
    // Bottom border - uses horizontal dimensions  
    const bottomBorder = MeshBuilder.CreatePlane(`${name}-bottom`, {
      width: borderDimensions.horizontal.width,
      height: borderDimensions.horizontal.height
    }, this.scene);
    borders.push(bottomBorder);
    
    // Left border - uses vertical dimensions
    const leftBorder = MeshBuilder.CreatePlane(`${name}-left`, {
      width: borderDimensions.vertical.width,
      height: borderDimensions.vertical.height
    }, this.scene);
    borders.push(leftBorder);
    
    // Right border - uses vertical dimensions
    const rightBorder = MeshBuilder.CreatePlane(`${name}-right`, {
      width: borderDimensions.vertical.width,
      height: borderDimensions.vertical.height
    }, this.scene);
    borders.push(rightBorder);
    
    console.log('🎯 Unified border mesh creation:', {
      elementSize: `${elementWidth.toFixed(6)} x ${elementHeight.toFixed(6)}`,
      originalBorderWidth: borderWidth.toFixed(6),
      snappedBorderWidth: this.cameraService ? 
        this.cameraService.snapBorderWidthToPixel(borderWidth).toFixed(6) : 'N/A',
      dimensions: {
        horizontal: {
          width: borderDimensions.horizontal.width.toFixed(6),
          height: borderDimensions.horizontal.height.toFixed(6)
        },
        vertical: {
          width: borderDimensions.vertical.width.toFixed(6),
          height: borderDimensions.vertical.height.toFixed(6)
        }
      },
      meshNames: [`${name}-top`, `${name}-bottom`, `${name}-left`, `${name}-right`]
    });
    
    return borders;
  }

  positionBorderFrames(borders: Mesh[], centerX: number, centerY: number, centerZ: number, elementWidth: number, elementHeight: number, borderWidth: number): void {
    if (borders.length !== 4) return;
    
    const [topBorder, bottomBorder, leftBorder, rightBorder] = borders;
    
    // Use unified border layout calculation for complete consistency
    if (!this.cameraService) {
      console.warn('Camera service not available - using fallback positioning');
      return;
    }
    
    const layout = this.cameraService.calculateUnifiedBorderLayout(
      centerX, centerY, centerZ,
      elementWidth, elementHeight, 
      borderWidth
    );
    
    // Apply calculated positions directly - no additional calculations needed
    topBorder.position.set(
      layout.borderPositions.top.x,
      layout.borderPositions.top.y,
      layout.borderPositions.top.z
    );
    
    bottomBorder.position.set(
      layout.borderPositions.bottom.x,
      layout.borderPositions.bottom.y,
      layout.borderPositions.bottom.z
    );
    
    leftBorder.position.set(
      layout.borderPositions.left.x,
      layout.borderPositions.left.y,
      layout.borderPositions.left.z
    );
    
    rightBorder.position.set(
      layout.borderPositions.right.x,
      layout.borderPositions.right.y,
      layout.borderPositions.right.z
    );
    
    console.log('🎯 Unified border positioning applied:', {
      elementCenter: `(${centerX.toFixed(3)}, ${centerY.toFixed(3)}, ${centerZ.toFixed(3)})`,
      elementSize: `${elementWidth.toFixed(3)} x ${elementHeight.toFixed(3)}`,
      originalBorderWidth: borderWidth.toFixed(6),
      snappedBorderWidth: layout.snappedBorderWidth.toFixed(6),
      widthDifference: (layout.snappedBorderWidth - borderWidth).toFixed(6),
      zPositions: {
        element: centerZ.toFixed(6),
        borders: layout.borderPositions.top.z.toFixed(6),
        offset: (layout.borderPositions.top.z - centerZ).toFixed(6)
      },
      elementBounds: {
        left: layout.elementBounds.left.toFixed(6),
        right: layout.elementBounds.right.toFixed(6),
        top: layout.elementBounds.top.toFixed(6),
        bottom: layout.elementBounds.bottom.toFixed(6)
      },
      borderDimensions: {
        horizontalMeshes: `${layout.borderDimensions.horizontal.width.toFixed(3)} x ${layout.borderDimensions.horizontal.height.toFixed(6)}`,
        verticalMeshes: `${layout.borderDimensions.vertical.width.toFixed(6)} x ${layout.borderDimensions.vertical.height.toFixed(3)}`
      },
      finalPositions: {
        top: `(${layout.borderPositions.top.x.toFixed(6)}, ${layout.borderPositions.top.y.toFixed(6)}, ${layout.borderPositions.top.z.toFixed(6)})`,
        bottom: `(${layout.borderPositions.bottom.x.toFixed(6)}, ${layout.borderPositions.bottom.y.toFixed(6)}, ${layout.borderPositions.bottom.z.toFixed(6)})`,
        left: `(${layout.borderPositions.left.x.toFixed(6)}, ${layout.borderPositions.left.y.toFixed(6)}, ${layout.borderPositions.left.z.toFixed(6)})`,
        right: `(${layout.borderPositions.right.x.toFixed(6)}, ${layout.borderPositions.right.y.toFixed(6)}, ${layout.borderPositions.right.z.toFixed(6)})`
      }
    });
  }

  createMaterial(name: string, diffuseColor: Color3, emissiveColor?: Color3): StandardMaterial {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = diffuseColor;
    
    // Completely eliminate emissive color to prevent edge bleeding
    material.emissiveColor = new Color3(0, 0, 0);
    
    material.backFaceCulling = false;
    
    // Clean settings for sharp edges
    material.specularColor = new Color3(0, 0, 0); // No specular reflection
    
    material.roughness = 0;

    material.fillMode = Material.TriangleFillMode;

    return material;
  }

  positionMesh(mesh: Mesh, x: number, y: number, z: number): void {
    mesh.position = new Vector3(x, y, z);
  }

  parentMesh(child: Mesh, parent: Mesh): void {
    child.parent = parent;
  }

  cleanup(): void {
    this.scene = undefined;
  }
}
