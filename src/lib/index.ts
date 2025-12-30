/**
 * Astylar UI Library
 * 
 * A 3D UI rendering library that renders HTML-like structures in BabylonJS scenes.
 * 
 * @packageDocumentation
 */

// Main service and types
export { AstylarService } from './astylar';
export type { AstylarRenderResult, AstylarRenderOptions } from './astylar';

// Types for consumers
export type { SiteData } from '../app/types/site-data';
export type { StyleRule } from '../app/types/style-rule';
export type { DOMElement, DOMElementType } from '../app/types/dom-element';
export type { BabylonRender, BabylonRenderActions, MeshActions, StyleActions, CameraActions, TextureActions } from '../app/services/dom/interfaces/render.types';
