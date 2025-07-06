import { Injectable } from '@angular/core';
import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh } from '@babylonjs/core';

@Injectable({
  providedIn: 'root'
})
export class BabylonMeshService {
  private scene?: Scene;

  constructor() {}

  initialize(scene: Scene): void {
    this.scene = scene;
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

    // Create 4 border rectangles: top, bottom, left, right
    const borders: Mesh[] = [];
    
    // Top border
    const topBorder = MeshBuilder.CreatePlane(`${name}-top`, {
      width: elementWidth + (borderWidth * 2),
      height: borderWidth
    }, this.scene);
    borders.push(topBorder);
    
    // Bottom border
    const bottomBorder = MeshBuilder.CreatePlane(`${name}-bottom`, {
      width: elementWidth + (borderWidth * 2),
      height: borderWidth
    }, this.scene);
    borders.push(bottomBorder);
    
    // Left border
    const leftBorder = MeshBuilder.CreatePlane(`${name}-left`, {
      width: borderWidth,
      height: elementHeight
    }, this.scene);
    borders.push(leftBorder);
    
    // Right border
    const rightBorder = MeshBuilder.CreatePlane(`${name}-right`, {
      width: borderWidth,
      height: elementHeight
    }, this.scene);
    borders.push(rightBorder);
    
    return borders;
  }

  positionBorderFrames(borders: Mesh[], centerX: number, centerY: number, centerZ: number, elementWidth: number, elementHeight: number, borderWidth: number): void {
    if (borders.length !== 4) return;
    
    const [topBorder, bottomBorder, leftBorder, rightBorder] = borders;
    
    // Position top border (above element)
    topBorder.position.x = centerX;
    topBorder.position.y = centerY + (elementHeight / 2) + (borderWidth / 2);
    topBorder.position.z = centerZ;
    
    // Position bottom border (below element)
    bottomBorder.position.x = centerX;
    bottomBorder.position.y = centerY - (elementHeight / 2) - (borderWidth / 2);
    bottomBorder.position.z = centerZ;
    
    // Position left border (left of element)
    leftBorder.position.x = centerX - (elementWidth / 2) - (borderWidth / 2);
    leftBorder.position.y = centerY;
    leftBorder.position.z = centerZ;
    
    // Position right border (right of element)
    rightBorder.position.x = centerX + (elementWidth / 2) + (borderWidth / 2);
    rightBorder.position.y = centerY;
    rightBorder.position.z = centerZ;
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
    
    return material;
  }

  // Create material specifically optimized for sharp edges
  createSharpEdgeMaterial(name: string, diffuseColor: Color3): StandardMaterial {
    if (!this.scene) {
      throw new Error('Mesh service not initialized');
    }

    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = diffuseColor;
    
    // No emissive color for maximum edge contrast
    material.emissiveColor = new Color3(0, 0, 0);
    
    material.backFaceCulling = false;
    
    // Settings for sharp edge definition
    material.specularColor = new Color3(0.05, 0.05, 0.05); // Very minimal specular
    material.roughness = 1.0; // Maximum diffuse
    
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
