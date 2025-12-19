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
