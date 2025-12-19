// BabylonJS Playground Example: Border Rendering and Sub-pixel Blurring
// Copy this code into https://playground.babylonjs.com/

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    
    // Set background color similar to our app
    scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.1, 1.0);
    
    // Create orthographic camera for 2D-like rendering
    const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, -10), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    
    // Convert to orthographic projection for pixel-perfect rendering
    camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
    
    // Set orthographic viewport dimensions
    const canvas = engine.getRenderingCanvas();
    const aspectRatio = canvas.width / canvas.height;
    const viewportHeight = 25;
    const viewportWidth = viewportHeight * aspectRatio;
    
    camera.orthoTop = viewportHeight / 2;
    camera.orthoBottom = -viewportHeight / 2;
    camera.orthoLeft = -viewportWidth / 2;
    camera.orthoRight = viewportWidth / 2;
    
    // Lighting for sharp edges
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 1.0;
    
    // Calculate pixel-to-world scale for snapping
    const pixelToWorldScale = viewportHeight / canvas.height;
    
    // Snap coordinates to pixel boundaries
    function snapToPixel(worldPos) {
        const pixelX = Math.round(worldPos.x / pixelToWorldScale);
        const pixelY = Math.round(worldPos.y / pixelToWorldScale);
        return {
            x: pixelX * pixelToWorldScale,
            y: pixelY * pixelToWorldScale,
            z: worldPos.z || 0
        };
    }
    
    // Snap border width to pixel boundaries
    function snapBorderWidth(borderWidth) {
        const pixelWidth = Math.max(1, Math.round(borderWidth / pixelToWorldScale));
        return pixelWidth * pixelToWorldScale;
    }
    
    // Create sharp edge material
    function createSharpMaterial(name, color) {
        const material = new BABYLON.StandardMaterial(name, scene);
        material.diffuseColor = color;
        material.emissiveColor = new BABYLON.Color3(0, 0, 0);
        material.specularColor = new BABYLON.Color3(0, 0, 0);
        material.backFaceCulling = false;
        return material;
    }
    
    // Create element with borders (similar to our box1)
    function createElement(name, elementWidth, elementHeight, borderWidth, centerX, centerY, centerZ) {
        const snappedCenter = snapToPixel({ x: centerX, y: centerY, z: centerZ });
        const snappedBorderWidth = snapBorderWidth(borderWidth);
        
        // Calculate element bounds
        const elementBounds = {
            left: snappedCenter.x - (elementWidth / 2),
            right: snappedCenter.x + (elementWidth / 2),
            top: snappedCenter.y + (elementHeight / 2),
            bottom: snappedCenter.y - (elementHeight / 2)
        };
        
        // Create main element
        const mainElement = BABYLON.MeshBuilder.CreatePlane(`${name}-main`, {
            width: elementWidth,
            height: elementHeight
        }, scene);
        
        const snappedMainPos = snapToPixel(snappedCenter);
        mainElement.position.set(snappedMainPos.x, snappedMainPos.y, snappedMainPos.z);
        
        const mainMaterial = createSharpMaterial(`${name}-main-mat`, new BABYLON.Color3(0, 0, 1)); // Blue
        mainElement.material = mainMaterial;
        
        // Border Z position slightly in front
        const borderZ = centerZ + 0.01;
        
        // Calculate border dimensions (using our current approach)
        const borderDimensions = {
            // Horizontal borders span element width + border width (middle ground approach)
            horizontal: {
                width: elementWidth + snappedBorderWidth,
                height: snappedBorderWidth
            },
            // Vertical borders span only element height
            vertical: {
                width: snappedBorderWidth,
                height: elementHeight
            }
        };
        
        // Calculate border positions
        const borderPositions = {
            top: snapToPixel({
                x: snappedCenter.x,
                y: elementBounds.top + (snappedBorderWidth / 2),
                z: borderZ
            }),
            bottom: snapToPixel({
                x: snappedCenter.x,
                y: elementBounds.bottom - (snappedBorderWidth / 2),
                z: borderZ
            }),
            left: snapToPixel({
                x: elementBounds.left - snappedBorderWidth + (snappedBorderWidth / 2),
                y: snappedCenter.y,
                z: borderZ
            }),
            right: snapToPixel({
                x: elementBounds.right + snappedBorderWidth - (snappedBorderWidth / 2),
                y: snappedCenter.y,
                z: borderZ
            })
        };
        
        // Create border meshes
        const borders = [];
        
        // Top border
        const topBorder = BABYLON.MeshBuilder.CreatePlane(`${name}-border-top`, {
            width: borderDimensions.horizontal.width,
            height: borderDimensions.horizontal.height
        }, scene);
        topBorder.position.set(borderPositions.top.x, borderPositions.top.y, borderPositions.top.z);
        borders.push(topBorder);
        
        // Bottom border
        const bottomBorder = BABYLON.MeshBuilder.CreatePlane(`${name}-border-bottom`, {
            width: borderDimensions.horizontal.width,
            height: borderDimensions.horizontal.height
        }, scene);
        bottomBorder.position.set(borderPositions.bottom.x, borderPositions.bottom.y, borderPositions.bottom.z);
        borders.push(bottomBorder);
        
        // Left border
        const leftBorder = BABYLON.MeshBuilder.CreatePlane(`${name}-border-left`, {
            width: borderDimensions.vertical.width,
            height: borderDimensions.vertical.height
        }, scene);
        leftBorder.position.set(borderPositions.left.x, borderPositions.left.y, borderPositions.left.z);
        borders.push(leftBorder);
        
        // Right border
        const rightBorder = BABYLON.MeshBuilder.CreatePlane(`${name}-border-right`, {
            width: borderDimensions.vertical.width,
            height: borderDimensions.vertical.height
        }, scene);
        rightBorder.position.set(borderPositions.right.x, borderPositions.right.y, borderPositions.right.z);
        borders.push(rightBorder);
        
        // Apply border material
        const borderMaterial = createSharpMaterial(`${name}-border-mat`, new BABYLON.Color3(1, 1, 0)); // Yellow
        borders.forEach(border => {
            border.material = borderMaterial;
        });
        
        console.log(`Created element ${name}:`, {
            elementSize: `${elementWidth.toFixed(3)} x ${elementHeight.toFixed(3)}`,
            borderWidth: snappedBorderWidth.toFixed(6),
            pixelScale: pixelToWorldScale.toFixed(6),
            borderDimensions: {
                horizontal: `${borderDimensions.horizontal.width.toFixed(3)} x ${borderDimensions.horizontal.height.toFixed(6)}`,
                vertical: `${borderDimensions.vertical.width.toFixed(6)} x ${borderDimensions.vertical.height.toFixed(3)}`
            }
        });
        
        return { mainElement, borders };
    }
    
    // Create test elements with different border widths
    
    // Element 1: 2px border (similar to our box1)
    createElement("element1", 10, 4, 2 * pixelToWorldScale, -8, 3, 0.1);
    
    // Element 2: 1px border for comparison
    createElement("element2", 10, 4, 1 * pixelToWorldScale, 8, 3, 0.1);
    
    // Element 3: 3px border to see the effect more clearly
    createElement("element3", 10, 4, 3 * pixelToWorldScale, -8, -3, 0.1);
    
    // Element 4: Non-pixel-aligned border width (1.5px) to show sub-pixel issues
    createElement("element4", 10, 4, 1.5 * pixelToWorldScale, 8, -3, 0.1);
    
    // Add text info (optional, for debugging)
    console.log("Pixel to world scale:", pixelToWorldScale);
    console.log("Canvas dimensions:", canvas.width, "x", canvas.height);
    console.log("Viewport dimensions:", viewportWidth.toFixed(3), "x", viewportHeight.toFixed(3));
    
    return scene;
};

// Instructions to paste into BabylonJS Playground:
/*
1. Go to https://playground.babylonjs.com/
2. Replace the default code with this entire script
3. Run the playground
4. You should see 4 rectangular elements with yellow borders
5. Look closely at the border corners and edges for sub-pixel blurring
6. Try toggling wireframe mode to see the mesh boundaries clearly
7. Experiment with different border widths and positioning

Key things to observe:
- Are the border corners perfectly aligned?
- Do you see any anti-aliasing/blurring on the border edges?
- How do different border widths (1px, 2px, 3px, 1.5px) look?
- Are there gaps or overlaps at the corners?

This simplified example should reproduce the same border rendering issues
we're experiencing in the main application.
*/
