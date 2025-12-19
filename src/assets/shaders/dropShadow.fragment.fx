precision highp float;

// Varying
varying vec2 vUV;

// Uniforms
uniform vec2 elementSize;
uniform float shadowBlur;
uniform vec3 shadowColor;
uniform vec2 shadowOffset;

// Distance function for rounded rectangle
float roundedRectSDF(vec2 p, vec2 size, float radius) {
    vec2 d = abs(p) - size + radius;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - radius;
}

void main(void) {
    // Convert UV to centered coordinates (-0.5 to 0.5)
    vec2 coord = vUV - 0.5;
    
    // Scale coordinates to element size
    vec2 scaledCoord = coord * (elementSize + shadowBlur * 2.0);
    
    // Apply shadow offset
    vec2 shadowCoord = scaledCoord - shadowOffset;
    
    // Calculate distance to element rectangle
    float elementDist = roundedRectSDF(shadowCoord, elementSize * 0.5, 0.0);
    
    // Create shadow falloff
    float shadowFalloff = 1.0 - smoothstep(0.0, shadowBlur, elementDist);
    
    // Only show shadow outside the element
    float elementMask = step(0.0, elementDist);
    
    // Final shadow alpha
    float shadowAlpha = shadowFalloff * elementMask * 0.3;
    
    gl_FragColor = vec4(shadowColor, shadowAlpha);
}