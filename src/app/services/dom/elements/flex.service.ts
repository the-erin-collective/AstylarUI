import { Injectable } from '@angular/core';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { BabylonRender } from '../interfaces/render.types';
import { BabylonDOM } from '../interfaces/dom.types';
import { Mesh } from '@babylonjs/core';

interface FlexItem {
  element: DOMElement;
  style?: StyleRule;
  flexGrow: number;
  flexShrink: number;
  flexBasis: number;
  order: number;
  alignSelf: string;
  baseWidth: number;
  baseHeight: number;
  margins: { top: number; right: number; bottom: number; left: number };
  originalIndex: number;
}

interface FlexLine {
  items: FlexItem[];
  mainSize: number;
  crossSize: number;
}

interface LayoutResult {
  element: DOMElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FlexContainer {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  border: { top: number; right: number; bottom: number; left: number };
}

@Injectable({ providedIn: 'root' })
export class FlexService {
  /**
   * Main entry: Calculate flexbox layout in CSS coordinate space
   */
  public calculateLayout(
    children: DOMElement[],
    containerStyle: StyleRule,
    containerDimensions: FlexContainer,
    render: BabylonRender,
    styles: StyleRule[]
  ): LayoutResult[] {
    console.log('[FLEX DEBUG] === PASS 1: Build processing order (reverse queue) ===');
    // Pass 1: Build processing order (reverse queue)
    // For flat children, this is just the array order; for trees, would be post-order traversal
    const processingOrder = [...children];
    console.log('[FLEX DEBUG] Processing order:', processingOrder.map(e => e.id));

    console.log('[FLEX DEBUG] === PASS 2: Resolve automatic sizing ===');
    // Pass 2: Resolve base sizes for each item
    const flexItems: FlexItem[] = processingOrder.map((child, idx) => {
      const style = render.actions.style.findStyleForElement(child, styles);
      const flexGrow = style?.flexGrow ? parseFloat(style.flexGrow) : 0;
      const flexShrink = style?.flexShrink ? parseFloat(style.flexShrink) : 1;
      const flexBasis = style?.flexBasis && style.flexBasis !== 'auto'
        ? this.parseFlexBasis(style.flexBasis, containerStyle.flexDirection, containerDimensions)
        : 0;
      const order = style?.order ? parseFloat(style.order) : 0;
      const alignSelf = style?.alignSelf || containerStyle.alignItems || 'auto';
      // Cross size: use explicit height (row) or width (column) if present
      let baseWidth = 0, baseHeight = 0;
      if ((containerStyle.flexDirection || 'row').startsWith('row')) {
        baseWidth = flexBasis > 0 ? flexBasis : 0;
        baseHeight = style?.height ? this.parseLength(style.height) : 0;
      } else {
        baseWidth = style?.width ? this.parseLength(style.width) : 0;
        baseHeight = flexBasis > 0 ? flexBasis : 0;
      }
      const margins = this.parseMargins(style);
      return {
        element: child,
        style,
        flexGrow,
        flexShrink,
        flexBasis,
        order,
        alignSelf,
        baseWidth,
        baseHeight,
        margins,
        originalIndex: idx
      };
    });
    console.log('[FLEX DEBUG] Flex items:', flexItems.map(i => ({ id: i.element.id, flexGrow: i.flexGrow, flexShrink: i.flexShrink, flexBasis: i.flexBasis, baseWidth: i.baseWidth, baseHeight: i.baseHeight })));

    console.log('[FLEX DEBUG] === PASS 3: Flex calculation (main/cross axis, wrapping, shrink/grow, align) ===');
    // Pass 3: Flex calculation
    const isRow = (containerStyle.flexDirection || 'row').startsWith('row');
    const canWrap = (containerStyle.flexWrap || 'nowrap').startsWith('wrap');
    const mainAxisSize = isRow ? containerDimensions.width : containerDimensions.height;
    const crossAxisSize = isRow ? containerDimensions.height : containerDimensions.width;
    const gap = this.parseLength(containerStyle.gap || '0px');

    // Sort by order
    const sortedItems = [...flexItems].sort((a, b) => a.order - b.order || a.originalIndex - b.originalIndex);

    // Organize into lines
    const lines: FlexLine[] = [];
    let currentLine: FlexItem[] = [];
    let currentLineMainSize = 0;
    sortedItems.forEach((item, idx) => {
      const itemMainSize = isRow ? (item.baseWidth || 0) : (item.baseHeight || 0);
      const itemWithMargin = itemMainSize + (isRow ? (item.margins.left + item.margins.right) : (item.margins.top + item.margins.bottom));
      const gapToAdd = currentLine.length > 0 ? gap : 0;
      if (canWrap && currentLine.length > 0 && (currentLineMainSize + itemWithMargin + gapToAdd) > mainAxisSize + 0.01) {
        // Start new line
        lines.push({ items: currentLine, mainSize: currentLineMainSize, crossSize: 0 });
        currentLine = [item];
        currentLineMainSize = itemWithMargin;
      } else {
        currentLine.push(item);
        currentLineMainSize += itemWithMargin + gapToAdd;
      }
    });
    if (currentLine.length > 0) {
      lines.push({ items: currentLine, mainSize: currentLineMainSize, crossSize: 0 });
    }
    // Calculate cross size for each line
    lines.forEach(line => {
      line.crossSize = Math.max(...line.items.map(i => isRow ? (i.baseHeight || 0) : (i.baseWidth || 0)));
    });
    console.log('[FLEX DEBUG] Lines:', lines.map((l, idx) => ({ line: idx, items: l.items.map(i => i.element.id), mainSize: l.mainSize, crossSize: l.crossSize })));

    // Flex grow/shrink for each line
    const layoutResults: LayoutResult[] = [];
    let crossAxisOffset = 0;
    lines.forEach((line, lineIdx) => {
      // Calculate total main size and flex factors
      const totalBaseMain = line.items.reduce((sum, i) => sum + (isRow ? (i.baseWidth || 0) : (i.baseHeight || 0)), 0);
      const totalGrow = line.items.reduce((sum, i) => sum + i.flexGrow, 0);
      const totalShrink = line.items.reduce((sum, i) => sum + i.flexShrink, 0);
      const totalGaps = (line.items.length - 1) * gap;
      const availableSpace = mainAxisSize - totalBaseMain - totalGaps;
      // Distribute space
      const itemMainSizes = line.items.map(i => {
        if (availableSpace > 0 && totalGrow > 0) {
          // Grow
          return (isRow ? (i.baseWidth || 0) : (i.baseHeight || 0)) + availableSpace * (i.flexGrow / totalGrow);
        } else if (availableSpace < 0 && totalShrink > 0) {
          // Shrink
          return (isRow ? (i.baseWidth || 0) : (i.baseHeight || 0)) + availableSpace * (i.flexShrink / totalShrink);
        } else {
          // No grow/shrink
          return isRow ? (i.baseWidth || 0) : (i.baseHeight || 0);
        }
      });
      // Layout positions
      let mainAxisPos = 0;
      line.items.forEach((item, idx) => {
        const mainSize = itemMainSizes[idx];
        const crossSize = line.crossSize;
        const x = isRow ? mainAxisPos : crossAxisOffset;
        const y = isRow ? crossAxisOffset : mainAxisPos;
        layoutResults.push({
          element: item.element,
          x,
          y,
          width: isRow ? mainSize : crossSize,
          height: isRow ? crossSize : mainSize
        });
        mainAxisPos += mainSize + gap;
      });
      crossAxisOffset += line.crossSize + gap;
    });
    console.log('[FLEX DEBUG] Layout results:', layoutResults.map(r => ({ id: r.element.id, x: r.x, y: r.y, width: r.width, height: r.height })));
    return layoutResults;
  }

  /**
   * Integration: Process flex children, create meshes, and recurse (Babylon integration)
   */
  public processFlexChildren(
    dom: BabylonDOM,
    render: BabylonRender,
    children: DOMElement[],
    parent: Mesh,
    styles: StyleRule[],
    parentElement: DOMElement
  ): void {
    const parentStyle = render.actions.style.findStyleForElement(parentElement, styles);
    if (!parentStyle) {
      throw new Error('FlexService: parentStyle is undefined in processFlexChildren. A valid StyleRule must be provided.');
    }
    // Get container dimensions from Babylon mesh (as in old service)
    const parentBounds = parent.getBoundingInfo().boundingBox;
    const width = Math.abs(parentBounds.maximum.x - parentBounds.minimum.x);
    const height = Math.abs(parentBounds.maximum.y - parentBounds.minimum.y);
    const containerDimensions = {
      width,
      height,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      border: { top: 0, right: 0, bottom: 0, left: 0 }
    };
    // Calculate layout
    const layout = this.calculateLayout(children, parentStyle, containerDimensions, render, styles);
    // Create and position child elements according to layout
    layout.forEach((childLayout, index) => {
      const child = children[index];
      const position = { x: childLayout.x, y: childLayout.y, z: 0.01 + index * 0.01 };
      const size = { width: childLayout.width, height: childLayout.height };
      const childMesh = dom.actions.createElement(dom, render, child, parent, styles, position, size);
      if (child.children && child.children.length > 0) {
        dom.actions.processChildren(dom, render, child.children, childMesh, styles, child);
      }
    });
  }

  /**
   * Utility: Check if a parent element is a flex container (compatibility signature)
   */
  public isFlexContainer(render: BabylonRender, parentElement: DOMElement, styles: StyleRule[]): boolean {
    const style = render.actions.style.findStyleForElement(parentElement, styles);
    return style?.display === 'flex';
  }

  private parseFlexBasis(flexBasis: string, flexDirection: string | undefined, containerDimensions: FlexContainer): number {
    if (flexBasis.endsWith('%')) {
      const percent = parseFloat(flexBasis.replace('%', ''));
      return (flexDirection && flexDirection.startsWith('row'))
        ? (containerDimensions.width * percent) / 100
        : (containerDimensions.height * percent) / 100;
    }
    if (flexBasis.endsWith('px')) {
      return parseFloat(flexBasis.replace('px', ''));
    }
    return parseFloat(flexBasis) || 0;
  }

  private parseLength(value: string): number {
    if (!value) return 0;
    if (value.endsWith('px')) return parseFloat(value.replace('px', ''));
    if (value.endsWith('%')) return 0; // Percentages not supported for gap
    return parseFloat(value) || 0;
  }

  private parseMargins(style?: StyleRule): { top: number; right: number; bottom: number; left: number } {
    return {
      top: style?.marginTop ? this.parseLength(style.marginTop) : 0,
      right: style?.marginRight ? this.parseLength(style.marginRight) : 0,
      bottom: style?.marginBottom ? this.parseLength(style.marginBottom) : 0,
      left: style?.marginLeft ? this.parseLength(style.marginLeft) : 0
    };
  }
} 