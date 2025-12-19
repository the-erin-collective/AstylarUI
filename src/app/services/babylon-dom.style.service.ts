import { Injectable } from '@angular/core';
import { StyleRule } from '../types/style-rule';
import { DOMElement } from '../types/dom-element';
import { Color3, Mesh } from '@babylonjs/core';

@Injectable({ providedIn: 'root' })
export class BabylonDOMStyleService {
  /**
   * Clears all tracked element styles for the DOM scene.
   * Migrated from pre-refactored BabylonDOMService.clearElementStyles.
   */
  private elementStyles: Map<string, { normal: StyleRule, hover?: StyleRule }> = new Map();

  public parseStyles(styles: StyleRule[]): void {
    styles.forEach(style => {
      if (style.selector.includes(':hover')) {
        const baseSelector = style.selector.replace(':hover', '');
        const elementId = baseSelector.replace('#', '');
        if (!this.elementStyles.has(elementId)) {
          this.elementStyles.set(elementId, { normal: {} as StyleRule });
        }
        this.elementStyles.get(elementId)!.hover = style;
      } else if (style.selector.startsWith('#')) {
        const elementId = style.selector.replace('#', '');
        if (!this.elementStyles.has(elementId)) {
          this.elementStyles.set(elementId, { normal: style });
        } else {
          this.elementStyles.get(elementId)!.normal = style;
        }
      }
    });
  }

  public getElementStyle(id: string): { normal: StyleRule, hover?: StyleRule } | undefined {
    return this.elementStyles.get(id);
  }

  public setElementStyle(id: string, style: { normal: StyleRule, hover?: StyleRule }): void {
    this.elementStyles.set(id, style);
  }


  public getElementStyles(): Map<string, { normal: StyleRule, hover?: StyleRule }> {
    return this.elementStyles;
  }

  public clearElementStyles(): void {
    this.elementStyles.clear();
  }

  // ...other style parsing methods from pre-refactored version...
}
