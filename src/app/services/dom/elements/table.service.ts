import { Injectable } from '@angular/core';
import { Mesh } from '@babylonjs/core';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';

@Injectable({ providedIn: 'root' })
export class TableService {

  public processTable(dom: BabylonDOM, render: BabylonRender, tableChildren: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement: DOMElement): void {
    if (!parentElement.id) {
      throw new Error("Parent table element has no id.");
    }

    console.log(`[TABLE DEBUG] ===== PROCESSING TABLE "${parentElement.id}" =====`);
    console.log(`[TABLE DEBUG] Table has ${tableChildren.length} children`);
    console.log(`[TABLE DEBUG] Table children types: ${JSON.stringify(tableChildren.map(c => c.type))}`);
    console.log(`[TABLE DEBUG] Table children details:`, JSON.stringify(tableChildren.map(c => ({ type: c.type, id: c.id, class: c.class }))));
    console.log(`[TABLE DEBUG] Parent mesh name: ${parent.name}`);
    
    // Debug: Check if styles are being passed correctly
    console.log(`[TABLE DEBUG] Styles passed to processTable:`, styles.length);
    console.log(`[TABLE DEBUG] Available elementStyles keys:`, Array.from(dom.context.elementStyles.keys()));
    
    // Check specific styles we're looking for
    const simpleHeaderStyle = dom.context.elementStyles.get('.simple-header');
    const simpleCellStyle = dom.context.elementStyles.get('.simple-cell');
    const th1Style = dom.context.elementStyles.get('#simple-th-1');
    console.log(`[TABLE DEBUG] .simple-header style:`, JSON.stringify(simpleHeaderStyle));
    console.log(`[TABLE DEBUG] .simple-cell style:`, JSON.stringify(simpleCellStyle));
    console.log(`[TABLE DEBUG] #simple-th-1 style:`, JSON.stringify(th1Style));

    try {
      // First, create the table container mesh and store its dimensions
      const tableMesh = this.createTableContainer(dom, render, parentElement, parent, styles);
      console.log(`[TABLE DEBUG] ===== CREATED TABLE MESH: ${tableMesh.name} =====`);

      // Process column definitions first (col, colgroup) to establish column layout
      const columnDefinitions = this.extractColumnDefinitions(tableChildren);
      console.log(`[TABLE DEBUG] Found ${columnDefinitions.length} column definitions`);

      // Process caption if present
      const captionElement = tableChildren.find(child => child.type === 'caption');
      if (captionElement) {
        console.log(`[TABLE DEBUG] Processing table caption: ${captionElement.id}`);
        this.processCaption(dom, render, captionElement, tableMesh, styles);
      }

      // Check if table has explicit dimensions or needs content-based sizing
      let containerDimensions;
      try {
        console.log(`[TABLE DEBUG] ===== ATTEMPTING TO GET TABLE DIMENSIONS FOR ${parentElement.id} =====`);
        containerDimensions = this.getTableContainerDimensions(dom, tableMesh);
        console.log(`[TABLE DEBUG] ===== SUCCESS: Table container dimensions: ${JSON.stringify(containerDimensions)} =====`);
      } catch (error) {
        console.log(`[TABLE DEBUG] ===== CONTENT-BASED: Table ${parentElement.id} using content-based sizing: ${error} =====`);

        // Debug: Show available elementStyles keys
        console.log(`[TABLE DEBUG] Available elementStyles keys: ${JSON.stringify(Array.from(dom.context.elementStyles.keys()))}`);

        try {
          containerDimensions = this.calculateContentBasedTableDimensions(dom, tableChildren);
          console.log(`[TABLE DEBUG] Content-based table dimensions: ${JSON.stringify(containerDimensions)}`);

          // Validate calculated dimensions
          if (!containerDimensions || containerDimensions.width === null || isNaN(containerDimensions.width) || containerDimensions.height === null || isNaN(containerDimensions.height)) {
            throw new Error(`[TABLE ERROR] Content-based calculation failed for ${parentElement.id}. Result: ${JSON.stringify(containerDimensions)}`);
          }

          // Update the stored table dimensions
          dom.context.elementDimensions.set(tableMesh.name, {
            width: containerDimensions.width,
            height: containerDimensions.height,
            padding: { top: 0, right: 0, bottom: 0, left: 0 }
          });
          console.log(`[TABLE DEBUG] Updated stored dimensions for ${tableMesh.name}: ${JSON.stringify(dom.context.elementDimensions.get(tableMesh.name))}`);
        } catch (contentError) {
          console.error(`[TABLE DEBUG] Content-based calculation failed: ${contentError}`);
          throw contentError;
        }
      }

      // Calculate total row count across all sections for proper row height distribution
      const totalRowCount = this.calculateTotalRowCount(tableChildren);
      const totalColumnCount = this.calculateTotalColumnCount(tableChildren);
      console.log(`[TABLE DEBUG] Total table dimensions - rows: ${totalRowCount}, columns: ${totalColumnCount}`);

      // Calculate shared row height for all sections
      const sharedRowHeight = containerDimensions.height / totalRowCount;
      const sharedColumnWidths = new Array(totalColumnCount).fill(containerDimensions.width / totalColumnCount);
      console.log(`[TABLE DEBUG] Shared dimensions - rowHeight: ${sharedRowHeight}px, columnWidths: ${JSON.stringify(sharedColumnWidths)}`);

      // Filter out column definitions and captions from main table structure processing
      const tableStructureChildren = tableChildren.filter(child => 
        child.type !== 'col' && child.type !== 'colgroup' && child.type !== 'caption'
      );

      // Process table sections with shared dimensions and track Y position
      let currentTableY = 0;
      for (const child of tableStructureChildren) {
        if (child.type === 'tbody' || child.type === 'thead' || child.type === 'tfoot') {
          console.log(`[TABLE DEBUG] Processing table section: ${child.type}#${child.id} at Y: ${currentTableY}`);
          const sectionRowCount = (child.children || []).filter(c => c.type === 'tr').length;
          this.processTableSection(dom, render, child, tableMesh, styles, containerDimensions, parentElement.id, {
            sharedRowHeight,
            sharedColumnWidths,
            sectionStartY: currentTableY
          });
          currentTableY += sectionRowCount * sharedRowHeight;
        } else if (child.type === 'tr') {
          console.log(`[TABLE DEBUG] Processing direct table row: ${child.type}#${child.id}`);
          // Handle direct rows (no tbody wrapper) - create implicit tbody
          this.processDirectTableRows(dom, render, [child], tableMesh, styles, containerDimensions, parentElement.id);
        }
      }

      console.log(`[TABLE DEBUG] Successfully processed table "${parentElement.id}"`);

    } catch (error) {
      console.error(`[TABLE DEBUG] Critical error in processTable for "${parentElement.id}": ${error}`);
      throw error;
    }
  }

  private createTableContainer(dom: BabylonDOM, render: BabylonRender, tableElement: DOMElement, parent: Mesh, styles: StyleRule[]): Mesh {
    console.log(`[TABLE CREATE] ===== CREATING TABLE CONTAINER FOR ${tableElement.id} =====`);
    console.log(`[TABLE CREATE] Parent mesh: ${parent.name}`);

    // Check parent dimensions before creating table
    const parentDimensions = dom.context.elementDimensions.get(parent.name);
    console.log(`[TABLE CREATE] Parent (${parent.name}) dimensions: ${JSON.stringify(parentDimensions)}`);
    
    // Fix: For tables, if parent is the table itself, look for the actual container parent
    let actualParentDimensions = parentDimensions;
    if (parent.name === tableElement.id) {
      console.log(`[TABLE CREATE] Table parent is itself, looking for actual container parent`);
      // Look for the container that should be the real parent
      const containerName = tableElement.id?.replace('-table', '-container') || 'complex-container';
      actualParentDimensions = dom.context.elementDimensions.get(containerName);
      console.log(`[TABLE CREATE] Actual parent container (${containerName}) dimensions: ${JSON.stringify(actualParentDimensions)}`);
      
      // Debug: Check what the container's parent dimensions are
      const rootDimensions = dom.context.elementDimensions.get('root-body');
      console.log(`[TABLE CREATE] Root body dimensions: ${JSON.stringify(rootDimensions)}`);
      if (rootDimensions) {
        const containerExpectedHeight = rootDimensions.height * 0.7;
        console.log(`[TABLE CREATE] Container expected height (70% of ${rootDimensions.height}px): ${containerExpectedHeight}px`);
        console.log(`[TABLE CREATE] Container actual height: ${actualParentDimensions?.height}px`);
      }
    }
    
    // Check what the table's CSS height should resolve to
    if (actualParentDimensions && tableElement.id === 'complex-table') {
      const expectedHeight = actualParentDimensions.height * 0.7;
      console.log(`[TABLE CREATE] Expected table height (70% of ${actualParentDimensions.height}px): ${expectedHeight}px`);
    }

    // Create the main table mesh using existing createElement
    const tableMesh = dom.actions.createElement(dom, render, tableElement, parent, styles);

    // Check if table dimensions were properly stored after creation
    const tableDimensions = dom.context.elementDimensions.get(tableMesh.name);
    console.log(`[TABLE CREATE] Table (${tableMesh.name}) dimensions after creation: ${JSON.stringify(tableDimensions)}`);

    console.log(`📊 Created table container: ${tableMesh.name}, dimensions stored in elementDimensions`);
    return tableMesh;
  }

  private processTableSection(dom: BabylonDOM, render: BabylonRender, sectionElement: DOMElement, tableMesh: Mesh, styles: StyleRule[], containerDimensions: { width: number; height: number }, tableId: string, sharedDimensions?: { sharedRowHeight: number; sharedColumnWidths: number[]; sectionStartY: number }): void {
    console.log(`[TABLE DEBUG] Processing table section: ${sectionElement.type}#${sectionElement.id}`);

    // Calculate section-specific dimensions
    const sectionRows = (sectionElement.children || []).filter(c => c.type === 'tr');
    const sectionHeight = sharedDimensions ? sectionRows.length * sharedDimensions.sharedRowHeight : containerDimensions.height;
    const sectionDimensions = {
      width: containerDimensions.width,
      height: sectionHeight
    };

    // Create tbody/thead/tfoot mesh with proportional dimensions
    const sectionMesh = this.createTableSectionContainer(dom, render, sectionElement, tableMesh, styles, sectionDimensions, tableId);
    console.log(`[TABLE DEBUG] Created section mesh: ${sectionMesh.name}`);

    console.log(`[TABLE DEBUG] Found ${sectionRows.length} rows in ${sectionElement.type}`);
    console.log(`[TABLE DEBUG] Row IDs: ${JSON.stringify(sectionRows.map(r => r.id))}`);

    if (sectionRows.length > 0) {
      if (sharedDimensions) {
        console.log(`[TABLE DEBUG] Using shared dimensions for ${sectionElement.type} - rowHeight: ${sharedDimensions.sharedRowHeight}, startY: ${sharedDimensions.sectionStartY}`);
        this.processTableRowsWithSharedDimensions(dom, render, sectionRows, sectionMesh, styles, sharedDimensions, sectionElement.id || `${tableId}-${sectionElement.type}`);
      } else {
        this.processTableRows(dom, render, sectionRows, sectionMesh, styles, sectionDimensions, sectionElement.id || `${tableId}-${sectionElement.type}`);
      }
    }
  }

  private processDirectTableRows(dom: BabylonDOM, render: BabylonRender, rows: DOMElement[], tableMesh: Mesh, styles: StyleRule[], containerDimensions: { width: number; height: number }, tableId: string): void {
    console.log(`📝 Processing ${rows.length} direct table rows (no tbody)`);
    this.processTableRows(dom, render, rows, tableMesh, styles, containerDimensions, tableId);
  }

  private createTableSectionContainer(dom: BabylonDOM, render: BabylonRender, sectionElement: DOMElement, tableMesh: Mesh, styles: StyleRule[], containerDimensions: { width: number; height: number }, tableId: string): Mesh {
    console.log(`[TABLE DEBUG] Creating section container for ${sectionElement.type}#${sectionElement.id} with dimensions: ${containerDimensions.width}x${containerDimensions.height}px`);

    // tbody/thead/tfoot should inherit table dimensions unless explicitly styled
    const elementStyles = sectionElement.id ? dom.context.elementStyles.get(sectionElement.id) : undefined;
    const explicitStyle = elementStyles?.normal;
    const typeDefaults = render.actions.style.getElementTypeDefaults(sectionElement.type);

    // Create style that inherits from table dimensions
    const inheritedStyle: StyleRule = {
      selector: sectionElement.id ? `#${sectionElement.id}` : sectionElement.type,
      ...typeDefaults,
      ...explicitStyle,
      // Use the calculated section dimensions
      width: explicitStyle?.width || `${containerDimensions.width}px`,
      height: explicitStyle?.height || `${containerDimensions.height}px`,
      top: explicitStyle?.top || '0px',
      left: explicitStyle?.left || '0px'
    };

    console.log(`[TABLE DEBUG] Section ${sectionElement.type} style height: ${inheritedStyle.height}`);

    // Temporarily store the inherited style
    const tempStyles = sectionElement.id ? dom.context.elementStyles.get(sectionElement.id) : undefined;
    if (sectionElement.id) {
      dom.context.elementStyles.set(sectionElement.id, {
        normal: inheritedStyle,
        hover: tempStyles?.hover
      });
    }

    // Create the section element
    const sectionMesh = dom.actions.createElement(dom, render, sectionElement, tableMesh, styles);

    // Store section dimensions for row calculations - CRITICAL for rows to find parent dimensions
    // Use the actual mesh name (which might be generated if no ID exists)
    dom.context.elementDimensions.set(sectionMesh.name, {
      width: containerDimensions.width,
      height: containerDimensions.height,
      padding: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    console.log(`📋 Stored section dimensions for ${sectionMesh.name}: ${containerDimensions.width}x${containerDimensions.height}px`);

    // Restore original styles
    if (sectionElement.id && tempStyles) {
      dom.context.elementStyles.set(sectionElement.id, tempStyles);
    }

    console.log(`📋 Created table section container: ${sectionElement.type}#${sectionElement.id}, inheriting dimensions: ${containerDimensions.width}x${containerDimensions.height}px`);
    return sectionMesh;
  }

  private getTableContainerDimensions(dom: BabylonDOM, tableMesh: Mesh): { width: number; height: number } {
    const tableId = this.getElementIdFromMeshName(tableMesh.name);
    console.log(`[TABLE DEBUG] Getting table container dimensions for: ${tableMesh.name}, extracted ID: ${tableId}`);
    console.log(`[TABLE DEBUG] Available elementDimensions keys: ${JSON.stringify(Array.from(dom.context.elementDimensions.keys()))}`);

    if (!tableId) {
      throw new Error(`[TABLE ERROR] Could not extract table ID from mesh name: ${tableMesh.name}`);
    }

    const containerDimensions = dom.context.elementDimensions.get(tableId);
    console.log(`[TABLE DEBUG] Table dimensions for ${tableId}: ${JSON.stringify(containerDimensions)}`);

    // Debug: Check parent container dimensions for percentage calculation validation
    const parentContainerDimensions = dom.context.elementDimensions.get('complex-container');
    console.log(`[TABLE DEBUG] Parent container (complex-container) dimensions: ${JSON.stringify(parentContainerDimensions)}`);

    if (parentContainerDimensions && containerDimensions) {
      const expectedHeight = parentContainerDimensions.height * 0.7;
      console.log(`[TABLE DEBUG] Expected table height (70% of ${parentContainerDimensions.height}px): ${expectedHeight}px`);
      console.log(`[TABLE DEBUG] Actual table height: ${containerDimensions.height}px`);
      console.log(`[TABLE DEBUG] Height difference: ${Math.abs(expectedHeight - containerDimensions.height)}px`);
    }

    if (!containerDimensions) {
      throw new Error(`[TABLE ERROR] No dimensions found for table ID: ${tableId}. Available keys: ${JSON.stringify(Array.from(dom.context.elementDimensions.keys()))}`);
    }

    console.log(`[TABLE DEBUG] Checking width: ${containerDimensions.width}, type: ${typeof containerDimensions.width}, isNull: ${containerDimensions.width === null}, isUndefined: ${containerDimensions.width === undefined}, isNaN: ${isNaN(containerDimensions.width)}`);

    if (containerDimensions.width === null || containerDimensions.width === undefined || isNaN(containerDimensions.width)) {
      throw new Error(`[TABLE ERROR] Table ${tableId} has null/undefined/NaN width: ${containerDimensions.width} (type: ${typeof containerDimensions.width}). Dimensions: ${JSON.stringify(containerDimensions)}`);
    }

    if (containerDimensions.height === null || containerDimensions.height === undefined) {
      throw new Error(`[TABLE ERROR] Table ${tableId} has null/undefined height. Dimensions: ${JSON.stringify(containerDimensions)}`);
    }

    const padding = containerDimensions.padding || { top: 0, right: 0, bottom: 0, left: 0 };
    const availableWidth = containerDimensions.width - padding.left - padding.right;
    const availableHeight = containerDimensions.height - padding.top - padding.bottom;

    if (availableWidth <= 0) {
      throw new Error(`[TABLE ERROR] Table ${tableId} has invalid available width: ${availableWidth}. Original width: ${containerDimensions.width}, padding: ${JSON.stringify(padding)}`);
    }

    if (availableHeight <= 0) {
      throw new Error(`[TABLE ERROR] Table ${tableId} has invalid available height: ${availableHeight}. Original height: ${containerDimensions.height}, padding: ${JSON.stringify(padding)}`);
    }

    return {
      width: availableWidth,
      height: availableHeight
    };
  }

  private processTableRowsWithSharedDimensions(dom: BabylonDOM, render: BabylonRender, tableRows: DOMElement[], parentMesh: Mesh, styles: StyleRule[], sharedDimensions: { sharedRowHeight: number; sharedColumnWidths: number[]; sectionStartY: number }, parentId: string): void {
    console.log(`[TABLE DEBUG] Processing ${tableRows.length} table rows with shared dimensions in container "${parentId}"`);
    console.log(`[TABLE DEBUG] Shared rowHeight: ${sharedDimensions.sharedRowHeight}, sectionStartY: ${sharedDimensions.sectionStartY}`);

    if (tableRows.length === 0) {
      console.warn(`[TABLE DEBUG] No table rows to process`);
      return;
    }

    // Use shared dimensions instead of calculating per-section
    const { sharedRowHeight, sharedColumnWidths, sectionStartY } = sharedDimensions;

    // Process each row sequentially starting from the section's Y position
    let currentY = sectionStartY;
    tableRows.forEach((row, rowIndex) => {
      console.log(`[TABLE DEBUG] Processing row ${rowIndex + 1}/${tableRows.length}: ${row.type}#${row.id} at Y: ${currentY}`);

      try {
        // Ensure unique row identification
        const originalId = row.id;
        if (!row.id) {
          row.id = `${parentMesh.name}-tr-${rowIndex}`;
          console.log(`[TABLE DEBUG] Assigned temporary row ID: ${row.id}`);
        }

        const rowMesh = this.createTableRow(dom, render, row, parentMesh, styles, currentY, sharedRowHeight, parentMesh.name);
        console.log(`[TABLE DEBUG] Created row mesh: ${rowMesh.name} at Y: ${currentY}`);

        // Restore original ID
        row.id = originalId;

        // Process cells in this row with shared column widths
        this.processTableCells(dom, render, row.children || [], rowMesh, styles, sharedColumnWidths, row);

        // Move to next row position
        currentY += sharedRowHeight;
        console.log(`[TABLE DEBUG] Updated currentY to: ${currentY}`);

      } catch (error) {
        console.error(`[TABLE DEBUG] Error processing table row ${row.type}#${row.id}: ${error}`);
        throw error;
      }
    });
  }

  private processTableRows(dom: BabylonDOM, render: BabylonRender, tableRows: DOMElement[], parentMesh: Mesh, styles: StyleRule[], containerDimensions: { width: number; height: number }, parentId: string): void {
    console.log(`[TABLE DEBUG] Processing ${tableRows.length} table rows in container "${parentId}"`);
    console.log(`[TABLE DEBUG] Parent mesh name: ${parentMesh.name}`);

    if (tableRows.length === 0) {
      console.warn(`[TABLE DEBUG] No table rows to process`);
      return;
    }

    // Calculate automatic row and column dimensions
    const { rowHeight, columnWidths } = this.calculateTableDimensions(tableRows, containerDimensions);
    console.log(`[TABLE DEBUG] Calculated dimensions - rowHeight: ${rowHeight}px, columnWidths: ${JSON.stringify(columnWidths)}`);

    // Process each row sequentially (like list items)
    let currentY = 0;
    tableRows.forEach((row, rowIndex) => {
      console.log(`[TABLE DEBUG] Processing row ${rowIndex + 1}/${tableRows.length}: ${row.type}#${row.id}`);
      console.log(`[TABLE DEBUG] Row currentY: ${currentY}, rowHeight: ${rowHeight}`);

      try {
        // Ensure unique row identification by temporarily setting an ID if none exists
        const originalId = row.id;
        if (!row.id) {
          row.id = `${parentMesh.name}-tr-${rowIndex}`;
          console.log(`[TABLE DEBUG] Assigned temporary row ID: ${row.id}`);
        }

        const rowMesh = this.createTableRow(dom, render, row, parentMesh, styles, currentY, rowHeight, parentMesh.name);
        console.log(`[TABLE DEBUG] Created row mesh: ${rowMesh.name}`);

        // Restore original ID
        row.id = originalId;

        // Process cells in this row
        this.processTableCells(dom, render, row.children || [], rowMesh, styles, columnWidths, row);

        // Move to next row position
        currentY += rowHeight;
        console.log(`[TABLE DEBUG] Updated currentY to: ${currentY}`);

      } catch (error) {
        console.error(`[TABLE DEBUG] Error processing table row ${row.type}#${row.id}: ${error}`);
        throw error;
      }
    });
  }

  private calculateTableDimensions(tableRows: DOMElement[], containerDimensions: { width: number; height: number }): { rowHeight: number; columnWidths: number[] } {
    const numRows = tableRows.length;
    const numCols = this.getMaxColumnsInTable(tableRows);

    console.log(`🧮 Table dimensions calculation:`);
    console.log(`   Container: ${containerDimensions.width}x${containerDimensions.height}px`);
    console.log(`   Rows: ${numRows}, Columns: ${numCols}`);
    console.log(`   ⚠️  WARNING: This calculation is per-section, not per-table!`);

    // Calculate automatic row height (distribute evenly)
    const rowHeight = Math.floor(containerDimensions.height / numRows);
    console.log(`   Row height: ${containerDimensions.height}px ÷ ${numRows} = ${rowHeight}px`);

    // Calculate automatic column widths (distribute evenly)
    if (containerDimensions.width === null || containerDimensions.width === undefined || isNaN(containerDimensions.width)) {
      throw new Error(`[TABLE ERROR] Cannot calculate column widths - container width is invalid: ${containerDimensions.width}`);
    }

    if (numCols <= 0) {
      throw new Error(`[TABLE ERROR] Cannot calculate column widths - invalid number of columns: ${numCols}`);
    }

    const columnWidth = Math.floor(containerDimensions.width / numCols);
    const columnWidths = new Array(numCols).fill(columnWidth);
    console.log(`[TABLE DEBUG] Column width: ${containerDimensions.width}px ÷ ${numCols} = ${columnWidth}px each`);

    return { rowHeight, columnWidths };
  }

  private calculateTotalRowCount(tableChildren: DOMElement[]): number {
    let totalRows = 0;
    for (const child of tableChildren) {
      if (child.type === 'tbody' || child.type === 'thead' || child.type === 'tfoot') {
        const sectionRows = (child.children || []).filter(c => c.type === 'tr');
        totalRows += sectionRows.length;
      } else if (child.type === 'tr') {
        totalRows += 1;
      }
    }
    return totalRows;
  }

  private calculateTotalColumnCount(tableChildren: DOMElement[]): number {
    // First check if we have column definitions
    const columnDefinitions = this.extractColumnDefinitions(tableChildren);
    if (columnDefinitions.length > 0) {
      console.log(`[TABLE DEBUG] Using column definitions for column count: ${columnDefinitions.length}`);
      return columnDefinitions.length;
    }

    // Fall back to analyzing table structure
    let maxCols = 0;
    for (const child of tableChildren) {
      if (child.type === 'tbody' || child.type === 'thead' || child.type === 'tfoot') {
        const sectionRows = (child.children || []).filter(c => c.type === 'tr');
        for (const row of sectionRows) {
          const cells = (row.children || []).filter(c => c.type === 'td' || c.type === 'th');
          maxCols = Math.max(maxCols, cells.length);
        }
      } else if (child.type === 'tr') {
        const cells = (child.children || []).filter(c => c.type === 'td' || c.type === 'th');
        maxCols = Math.max(maxCols, cells.length);
      }
    }
    return maxCols;
  }

  private getMaxColumnsInTable(tableRows: DOMElement[]): number {
    let maxCols = 0;

    for (const row of tableRows) {
      const cells = (row.children || []).filter(c => c.type === 'td' || c.type === 'th');
      maxCols = Math.max(maxCols, cells.length);
    }

    return Math.max(maxCols, 1); // At least 1 column
  }

  private createTableRow(dom: BabylonDOM, render: BabylonRender, rowElement: DOMElement, parent: Mesh, styles: StyleRule[], yOffset: number, rowHeight: number, parentId: string): Mesh {
    console.log(`[TABLE DEBUG] Creating table row ${rowElement.id}, parent: ${parent.name}, parentId: ${parentId}`);
    console.log(`[TABLE DEBUG] Available elementDimensions keys: ${JSON.stringify(Array.from(dom.context.elementDimensions.keys()))}`);

    // Get parent container dimensions (could be table or tbody)
    const containerDimensions = dom.context.elementDimensions.get(parentId);
    console.log(`[TABLE DEBUG] Container dimensions for ${parentId}: ${JSON.stringify(containerDimensions)}`);

    const containerPadding = containerDimensions?.padding || { left: 0, right: 0, top: 0, bottom: 0 };

    // Calculate row dimensions
    if (!containerDimensions) {
      throw new Error(`[TABLE ERROR] No container dimensions found for parent: ${parentId}`);
    }

    if (containerDimensions.width === null || containerDimensions.width === undefined || isNaN(containerDimensions.width)) {
      throw new Error(`[TABLE ERROR] Container ${parentId} has invalid width: ${containerDimensions.width}. Full dimensions: ${JSON.stringify(containerDimensions)}`);
    }

    const rowWidth = containerDimensions.width - containerPadding.left - containerPadding.right;

    if (rowWidth <= 0) {
      throw new Error(`[TABLE ERROR] Calculated row width is invalid: ${rowWidth}. Container width: ${containerDimensions.width}, padding: ${JSON.stringify(containerPadding)}`);
    }

    console.log(`[TABLE DEBUG] Calculated row width: ${rowWidth}, yOffset: ${yOffset}, rowHeight: ${rowHeight}`);

    // Create auto-positioned style for the row
    const elementStyles = rowElement.id ? dom.context.elementStyles.get(rowElement.id) : undefined;
    const explicitStyle = elementStyles?.normal;
    const typeDefaults = render.actions.style.getElementTypeDefaults(rowElement.type);

    const autoPositionedStyle: StyleRule = {
      selector: rowElement.id ? `#${rowElement.id}` : rowElement.type,
      ...typeDefaults,
      ...explicitStyle,
      top: `${yOffset}px`,
      left: `${containerPadding.left}px`,
      width: `${rowWidth}px`,
      height: `${rowHeight}px`
    };

    // Temporarily store the auto-positioned style
    const tempStyles = rowElement.id ? dom.context.elementStyles.get(rowElement.id) : undefined;
    if (rowElement.id) {
      dom.context.elementStyles.set(rowElement.id, {
        normal: autoPositionedStyle,
        hover: tempStyles?.hover
      });
    }

    // Create the row element using existing createElement method
    const rowMesh = dom.actions.createElement(dom, render, rowElement, parent, styles);

    // Store row dimensions for cell calculations - CRITICAL for cells to find parent dimensions
    // Use the actual mesh name (which might be generated if no ID exists)
    dom.context.elementDimensions.set(rowMesh.name, {
      width: rowWidth,
      height: rowHeight,
      padding: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    console.log(`� Stored drow dimensions for ${rowMesh.name}: ${rowWidth}x${rowHeight}px`);

    // Restore original styles
    if (rowElement.id && tempStyles) {
      dom.context.elementStyles.set(rowElement.id, tempStyles);
    }

    return rowMesh;
  }

  private processTableCells(dom: BabylonDOM, render: BabylonRender, cells: DOMElement[], rowMesh: Mesh, styles: StyleRule[], columnWidths: number[], rowElement: DOMElement): void {
    console.log(`[TABLE DEBUG] Processing ${cells.length} cells in row "${rowMesh.name}"`);
    console.log(`[TABLE DEBUG] Cell types: ${JSON.stringify(cells.map(c => c.type))}`);
    console.log(`[TABLE DEBUG] Cell IDs: ${JSON.stringify(cells.map(c => c.id))}`);

    const tableCells = cells.filter(c => c.type === 'td' || c.type === 'th');
    console.log(`[TABLE DEBUG] Filtered to ${tableCells.length} table cells`);

    let currentX = 0;
    let columnIndex = 0;
    
    tableCells.forEach((cell, cellIndex) => {
      console.log(`[TABLE DEBUG] Processing cell ${cellIndex + 1}/${tableCells.length}: ${cell.type}#${cell.id}`);
      
      // Handle colspan
      const colspan = cell.colspan || cell.tableProperties?.colspan || 1;
      const rowspan = cell.rowspan || cell.tableProperties?.rowspan || 1;
      
      console.log(`[TABLE-SPAN] ${cell.id || 'unknown'}: colspan=${colspan} rowspan=${rowspan} class="${cell.class || 'none'}"`);
      if (colspan > 1 || rowspan > 1) {
        console.log(`[TABLE-SPAN] *** SPANNING CELL DETECTED: ${cell.id} spans ${colspan}x${rowspan} ***`);
      }
      
      // Calculate cell width based on colspan
      let cellWidth = 0;
      for (let i = 0; i < colspan && (columnIndex + i) < columnWidths.length; i++) {
        cellWidth += columnWidths[columnIndex + i];
      }
      
      console.log(`[TABLE DEBUG] Cell currentX: ${currentX}, cellWidth: ${cellWidth} (spanning ${colspan} columns)`);

      try {
        if (cellWidth === null || cellWidth === undefined || isNaN(cellWidth)) {
          throw new Error(`[TABLE ERROR] Invalid cell width: ${cellWidth}. Column widths: ${JSON.stringify(columnWidths)}`);
        }
        
        const cellMesh = this.createTableCellWithSpanning(dom, render, cell, rowMesh, styles, currentX, cellWidth, rowMesh.name, colspan, rowspan);
        console.log(`[TABLE DEBUG] Created cell mesh: ${cellMesh.name}`);

        // Process cell children if any
        if (cell.children && cell.children.length > 0) {
          console.log(`[TABLE DEBUG] Cell ${cell.id} has ${cell.children.length} sub-children`);
          console.log(`[TABLE DEBUG] Cell children details: ${JSON.stringify(cell.children.map(c => ({ type: c.type, id: c.id, class: c.class })))}`);

          // Debug: Check if the cell content styles are available
          for (const child of cell.children) {
            console.log(`[TABLE DEBUG] Processing child: type=${child.type}, id=${child.id}, class=${child.class}`);
            if (child.class) {
              const childStyle = dom.context.elementStyles.get('.' + child.class) || dom.context.elementStyles.get(child.class);
              console.log(`[TABLE DEBUG] Child ${child.id} with class ${child.class} style: ${JSON.stringify(childStyle)}`);
            } else {
              console.log(`[TABLE DEBUG] Child ${child.id} has NO CLASS PROPERTY`);
            }
            if (child.id) {
              const childStyle = dom.context.elementStyles.get(child.id);
              console.log(`[TABLE DEBUG] Child ${child.id} style by ID: ${JSON.stringify(childStyle)}`);
            }
          }

          // Final check before processChildren
          console.log(`[TABLE-CHILDREN] Cell ${cell.id} has ${cell.children.length} children:`, cell.children.map(c => ({ type: c.type, id: c.id, class: c.class })));
          dom.actions.processChildren(dom, render, cell.children, cellMesh, styles, cell);
          console.log(`[TABLE-CHILDREN] Completed processing children for cell ${cell.id}`);
        }

        // Move to next cell position, accounting for colspan
        currentX += cellWidth;
        columnIndex += colspan;
        console.log(`[TABLE DEBUG] Updated currentX to: ${currentX}, columnIndex to: ${columnIndex}`);

      } catch (error) {
        console.error(`[TABLE DEBUG] Error processing table cell ${cell.type}#${cell.id}: ${error}`);
        throw error;
      }
    });
  }

  private createTableCell(dom: BabylonDOM, render: BabylonRender, cellElement: DOMElement, rowMesh: Mesh, styles: StyleRule[], xOffset: number, cellWidth: number, rowId: string): Mesh {
    return this.createTableCellWithSpanning(dom, render, cellElement, rowMesh, styles, xOffset, cellWidth, rowId, 1, 1);
  }

  private createTableCellWithSpanning(dom: BabylonDOM, render: BabylonRender, cellElement: DOMElement, rowMesh: Mesh, styles: StyleRule[], xOffset: number, cellWidth: number, rowId: string, colspan: number, rowspan: number): Mesh {
    console.log(`[TABLE DEBUG] Creating cell ${cellElement.id}, rowMesh: ${rowMesh.name}, rowId: ${rowId}`);
    console.log(`[TABLE DEBUG] Cell xOffset: ${xOffset}, cellWidth: ${cellWidth}, colspan: ${colspan}, rowspan: ${rowspan}`);
    console.log(`[TABLE DEBUG] Cell element details: type=${cellElement.type}, id=${cellElement.id}, class=${cellElement.class}`);
    
    // Debug: Check if the cell's styles are available
    if (cellElement.id) {
      const cellIdStyle = dom.context.elementStyles.get(cellElement.id);
      console.log(`[TABLE DEBUG] Cell ${cellElement.id} style by ID:`, JSON.stringify(cellIdStyle));
    }
    if (cellElement.class) {
      const cellClassStyle = dom.context.elementStyles.get('.' + cellElement.class);
      console.log(`[TABLE DEBUG] Cell ${cellElement.id} style by class .${cellElement.class}:`, JSON.stringify(cellClassStyle));
    }

    // Get row dimensions for height calculation
    const rowDimensions = dom.context.elementDimensions.get(rowId);
    console.log(`[TABLE DEBUG] Row dimensions for ${rowId}: ${JSON.stringify(rowDimensions)}`);
    if (!rowDimensions) {
      throw new Error(`[TABLE ERROR] No row dimensions found for row ID: ${rowId}. Available keys: ${JSON.stringify(Array.from(dom.context.elementDimensions.keys()))}`);
    }

    // Calculate cell height based on rowspan
    let cellHeight = rowDimensions.height * rowspan;
    if (cellHeight === null || cellHeight === undefined || isNaN(cellHeight)) {
      throw new Error(`[TABLE ERROR] Invalid cell height from row ${rowId}: ${cellHeight}. Row dimensions: ${JSON.stringify(rowDimensions)}`);
    }
    console.log(`[TABLE DEBUG] Cell height: ${cellHeight} (spanning ${rowspan} rows)`);

    // Create auto-positioned style for the cell
    const elementStyles = cellElement.id ? dom.context.elementStyles.get(cellElement.id) : undefined;
    const explicitStyle = elementStyles?.normal;
    const typeDefaults = render.actions.style.getElementTypeDefaults(cellElement.type);

    const autoPositionedStyle: StyleRule = {
      selector: cellElement.id ? `#${cellElement.id}` : cellElement.type,
      ...typeDefaults,
      ...explicitStyle,
      top: '0px',  // Relative to row
      left: `${xOffset}px`,
      width: `${cellWidth}px`,
      height: `${cellHeight}px`,
      // Add visual indication for spanning cells
      ...(colspan > 1 || rowspan > 1 ? {
        borderWidth: explicitStyle?.borderWidth || '2px',
        borderColor: explicitStyle?.borderColor || '#007acc',
        borderStyle: explicitStyle?.borderStyle || 'solid'
      } : {})
    };

    // Temporarily store the auto-positioned style
    const tempStyles = cellElement.id ? dom.context.elementStyles.get(cellElement.id) : undefined;
    if (cellElement.id) {
      dom.context.elementStyles.set(cellElement.id, {
        normal: autoPositionedStyle,
        hover: tempStyles?.hover
      });
    }

    // Debug: Check what styles are being used for createElement
    console.log(`[TABLE DEBUG] About to create cell mesh with autoPositionedStyle:`, JSON.stringify(autoPositionedStyle));
    
    // Create the cell element using existing createElement method
    const cellMesh = dom.actions.createElement(dom, render, cellElement, rowMesh, styles);
    
    console.log(`[TABLE DEBUG] Cell mesh created: ${cellMesh.name}, material:`, cellMesh.material?.name);

    // Store cell dimensions for potential child elements
    dom.context.elementDimensions.set(cellMesh.name, {
      width: cellWidth,
      height: cellHeight,
      padding: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    // Restore original styles
    if (cellElement.id && tempStyles) {
      dom.context.elementStyles.set(cellElement.id, tempStyles);
    }

    return cellMesh;
  }

  private calculateContentBasedTableDimensions(dom: BabylonDOM, tableChildren: DOMElement[]): { width: number; height: number } {
    console.log(`[TABLE DEBUG] Calculating content-based table dimensions`);

    // Extract all rows from table structure
    const allRows: DOMElement[] = [];
    for (const child of tableChildren) {
      if (child.type === 'tbody' || child.type === 'thead' || child.type === 'tfoot') {
        const sectionRows = (child.children || []).filter((c: DOMElement) => c.type === 'tr');
        allRows.push(...sectionRows);
      } else if (child.type === 'tr') {
        allRows.push(child);
      }
    }
    console.log(`[TABLE DEBUG] Found ${allRows.length} rows for content calculation`);

    if (allRows.length === 0) {
      throw new Error(`[TABLE ERROR] Cannot calculate content-based dimensions - no rows found`);
    }

    // Calculate maximum columns
    const maxCols = this.getMaxColumnsInTable(allRows);
    console.log(`[TABLE DEBUG] Maximum columns: ${maxCols}`);

    // Calculate column widths by examining cell content
    const columnWidths: number[] = [];
    for (let col = 0; col < maxCols; col++) {
      let maxColumnWidth = 0;

      for (const row of allRows) {
        const cells = (row.children || []).filter((c: DOMElement) => c.type === 'td' || c.type === 'th');
        if (cells[col]) {
          const cellContentWidth = this.calculateCellContentWidth(dom, cells[col]);
          maxColumnWidth = Math.max(maxColumnWidth, cellContentWidth);
        }
      }

      columnWidths.push(maxColumnWidth);
      console.log(`[TABLE DEBUG] Column ${col} width: ${maxColumnWidth}px`);
    }

    // Calculate row heights by examining cell content
    let totalHeight = 0;
    for (let rowIndex = 0; rowIndex < allRows.length; rowIndex++) {
      const row = allRows[rowIndex];
      const cells = (row.children || []).filter((c: DOMElement) => c.type === 'td' || c.type === 'th');

      let maxRowHeight = 0;
      for (const cell of cells) {
        const cellContentHeight = this.calculateCellContentHeight(dom, cell);
        maxRowHeight = Math.max(maxRowHeight, cellContentHeight);
      }

      totalHeight += maxRowHeight;
      console.log(`[TABLE DEBUG] Row ${rowIndex} height: ${maxRowHeight}px`);
    }

    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);

    console.log(`[TABLE DEBUG] Calculated table size: ${totalWidth}x${totalHeight}px`);

    if (totalWidth <= 0 || totalHeight <= 0) {
      throw new Error(`[TABLE ERROR] Invalid calculated table dimensions: ${totalWidth}x${totalHeight}px`);
    }

    return {
      width: totalWidth,
      height: totalHeight
    };
  }

  private calculateCellContentWidth(dom: BabylonDOM, cell: DOMElement): number {
    console.log(`[TABLE DEBUG] Calculating content width for cell ${cell.id}`);
    console.log(`[TABLE DEBUG] Cell children: ${JSON.stringify(cell.children?.map(c => ({ type: c.type, id: c.id, class: c.class })))}`);

    // Look for explicit cell content dimensions
    if (cell.children && cell.children.length > 0) {
      const contentChild = cell.children[0];
      console.log(`[TABLE DEBUG] Content child: type=${contentChild.type}, id=${contentChild.id}, class=${contentChild.class}`);

      if (contentChild.class) {
        console.log(`[TABLE DEBUG] Looking for style with class: .${contentChild.class} and ${contentChild.class}`);

        const dotClassStyle = dom.context.elementStyles.get('.' + contentChild.class);
        const classStyle = dom.context.elementStyles.get(contentChild.class);
        console.log(`[TABLE DEBUG] Style with .${contentChild.class}: ${JSON.stringify(dotClassStyle)}`);
        console.log(`[TABLE DEBUG] Style with ${contentChild.class}: ${JSON.stringify(classStyle)}`);

        const contentStyle = dotClassStyle?.normal || classStyle?.normal;
        console.log(`[TABLE DEBUG] Final content style: ${JSON.stringify(contentStyle)}`);

        if (contentStyle?.width) {
          const width = typeof contentStyle.width === 'string' ? parseFloat(contentStyle.width) : contentStyle.width;
          console.log(`[TABLE DEBUG] Cell ${cell.id} content width from class ${contentChild.class}: ${width}px`);
          if (!isNaN(width)) {
            return width;
          } else {
            console.log(`[TABLE DEBUG] Parsed width is NaN: ${contentStyle.width}`);
          }
        } else {
          console.log(`[TABLE DEBUG] No width found in content style`);
        }
      }
      if (contentChild.id) {
        const contentStyle = dom.context.elementStyles.get(contentChild.id)?.normal;
        console.log(`[TABLE DEBUG] Found content style by ID: ${JSON.stringify(contentStyle)}`);
        if (contentStyle?.width) {
          const width = typeof contentStyle.width === 'string' ? parseFloat(contentStyle.width) : contentStyle.width;
          console.log(`[TABLE DEBUG] Cell ${cell.id} content width from ID ${contentChild.id}: ${width}px`);
          return width;
        }
      }
    }

    // Default minimum cell width
    console.log(`[TABLE DEBUG] Cell ${cell.id} using default width: 100px`);
    return 100;
  }

  private calculateCellContentHeight(dom: BabylonDOM, cell: DOMElement): number {
    console.log(`[TABLE DEBUG] Calculating content height for cell ${cell.id}`);

    // Look for explicit cell content dimensions
    if (cell.children && cell.children.length > 0) {
      const contentChild = cell.children[0];
      console.log(`[TABLE DEBUG] Content child for height: type=${contentChild.type}, id=${contentChild.id}, class=${contentChild.class}`);

      if (contentChild.class) {
        const dotClassStyle = dom.context.elementStyles.get('.' + contentChild.class);
        const classStyle = dom.context.elementStyles.get(contentChild.class);
        const contentStyle = dotClassStyle?.normal || classStyle?.normal;

        if (contentStyle?.height) {
          const height = typeof contentStyle.height === 'string' ? parseFloat(contentStyle.height) : contentStyle.height;
          console.log(`[TABLE DEBUG] Cell ${cell.id} content height from class ${contentChild.class}: ${height}px`);
          if (!isNaN(height)) {
            return height;
          }
        }
      }
      if (contentChild.id) {
        const contentStyle = dom.context.elementStyles.get(contentChild.id)?.normal;
        if (contentStyle?.height) {
          const height = typeof contentStyle.height === 'string' ? parseFloat(contentStyle.height) : contentStyle.height;
          console.log(`[TABLE DEBUG] Cell ${cell.id} content height from ID ${contentChild.id}: ${height}px`);
          if (!isNaN(height)) {
            return height;
          }
        }
      }
    }

    // Default minimum cell height
    console.log(`[TABLE DEBUG] Cell ${cell.id} using default height: 30px`);
    return 30;
  }

  private getElementIdFromMeshName(meshName: string): string | null {
    console.log(`🔍 Extracting ID from mesh name: "${meshName}"`);

    // The mesh name should be the same as the element ID
    // If it's not found in elementDimensions, it might be a generated name
    if (meshName) {
      console.log(`� Usintg mesh name as ID: "${meshName}"`);
      return meshName;
    }

    console.log(`⚠️ No mesh name provided`);
    return null;
  }

  private extractColumnDefinitions(tableChildren: DOMElement[]): ColumnDefinition[] {
    const columnDefinitions: ColumnDefinition[] = [];
    
    for (const child of tableChildren) {
      if (child.type === 'colgroup') {
        // Process colgroup and its col children
        const colElements = child.children?.filter(c => c.type === 'col') || [];
        if (colElements.length > 0) {
          // Process individual col elements within colgroup
          for (const col of colElements) {
            const span = col.tableProperties?.span || 1;
            const width = col.tableProperties?.width;
            for (let i = 0; i < span; i++) {
              columnDefinitions.push({ width, span: 1 });
            }
          }
        } else {
          // Colgroup without col children - treat as single column definition
          const span = child.tableProperties?.span || 1;
          const width = child.tableProperties?.width;
          for (let i = 0; i < span; i++) {
            columnDefinitions.push({ width, span: 1 });
          }
        }
      } else if (child.type === 'col') {
        // Direct col element
        const span = child.tableProperties?.span || 1;
        const width = child.tableProperties?.width;
        for (let i = 0; i < span; i++) {
          columnDefinitions.push({ width, span: 1 });
        }
      }
    }
    
    console.log(`[TABLE DEBUG] Extracted column definitions: ${JSON.stringify(columnDefinitions)}`);
    return columnDefinitions;
  }

  private processCaption(dom: BabylonDOM, render: BabylonRender, captionElement: DOMElement, tableMesh: Mesh, styles: StyleRule[]): void {
    console.log(`[TABLE DEBUG] Processing caption: ${captionElement.id}`);
    
    // Get table dimensions for caption positioning
    const tableDimensions = dom.context.elementDimensions.get(tableMesh.name);
    if (!tableDimensions) {
      console.warn(`[TABLE DEBUG] No table dimensions found for caption positioning`);
      return;
    }

    // Create caption with auto-positioning
    const elementStyles = captionElement.id ? dom.context.elementStyles.get(captionElement.id) : undefined;
    const explicitStyle = elementStyles?.normal;
    const typeDefaults = render.actions.style.getElementTypeDefaults(captionElement.type);

    // Position caption above table by default (can be overridden by caption-side CSS property)
    const captionHeight = explicitStyle?.height ? parseFloat(explicitStyle.height) : 30;
    const captionStyle: StyleRule = {
      selector: captionElement.id ? `#${captionElement.id}` : 'caption',
      ...typeDefaults,
      ...explicitStyle,
      top: explicitStyle?.top || `-${captionHeight + 10}px`, // Position above table
      left: explicitStyle?.left || '0px',
      width: explicitStyle?.width || `${tableDimensions.width}px`,
      height: explicitStyle?.height || `${captionHeight}px`
    };

    // Temporarily store the caption style
    const tempStyles = captionElement.id ? dom.context.elementStyles.get(captionElement.id) : undefined;
    if (captionElement.id) {
      dom.context.elementStyles.set(captionElement.id, {
        normal: captionStyle,
        hover: tempStyles?.hover
      });
    }

    // Create the caption element
    const captionMesh = dom.actions.createElement(dom, render, captionElement, tableMesh, styles);
    console.log(`[TABLE DEBUG] Created caption mesh: ${captionMesh.name}`);

    // Process caption children if any
    if (captionElement.children && captionElement.children.length > 0) {
      dom.actions.processChildren(dom, render, captionElement.children, captionMesh, styles, captionElement);
    }

    // Restore original styles
    if (captionElement.id && tempStyles) {
      dom.context.elementStyles.set(captionElement.id, tempStyles);
    }
  }
}

interface ColumnDefinition {
  width?: string;
  span: number;
}
