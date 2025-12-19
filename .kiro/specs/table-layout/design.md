# Design Document

## Overview

The Table Layout feature will extend BJSUI's element system to support comprehensive HTML table structures in 3D space. This design builds upon the existing container element architecture while introducing specialized table-specific layout algorithms, positioning systems, and styling capabilities. The implementation will create a hierarchical table structure using BabylonJS meshes with automatic row and column calculations, border management, and content alignment.

## Architecture

### Core Components

#### TableLayoutService
A new service responsible for table-specific layout calculations and positioning logic.

```typescript
interface TableLayoutService {
  calculateTableLayout(tableElement: DomElement): TableLayoutData;
  positionTableCells(cells: TableCell[], layout: TableLayoutData): void;
  handleCellSpanning(cell: TableCell, colspan: number, rowspan: number): void;
  calculateColumnWidths(table: TableElement): number[];
  calculateRowHeights(table: TableElement): number[];
}
```

#### TableElement Types
Extension of existing DomElement types to support table-specific elements:

```typescript
interface TableElement extends DomElement {
  type: 'table' | 'tr' | 'td' | 'th' | 'thead' | 'tbody' | 'tfoot' | 'caption';
  tableProperties?: {
    colspan?: number;
    rowspan?: number;
    borderCollapse?: 'collapse' | 'separate';
    borderSpacing?: number;
    tableLayout?: 'auto' | 'fixed';
  };
}
```

#### TableLayoutData
Data structure to hold calculated table layout information:

```typescript
interface TableLayoutData {
  columnWidths: number[];
  rowHeights: number[];
  cellPositions: Map<string, { x: number; y: number; width: number; height: number }>;
  totalWidth: number;
  totalHeight: number;
  borderSpacing: number;
  borderCollapse: boolean;
}
```

### Integration Points

#### BabylonDomService Extension
The main DOM service will be extended to recognize table elements and delegate to the TableLayoutService:

```typescript
// In babylon-dom.service.ts
private handleTableElement(element: TableElement): BABYLON.Mesh {
  const tableLayout = this.tableLayoutService.calculateTableLayout(element);
  const tableMesh = this.createTableContainer(element, tableLayout);
  this.positionTableChildren(element, tableLayout);
  return tableMesh;
}
```

#### BabylonMeshService Extension
New methods for creating table-specific meshes and handling border collapse:

```typescript
// In babylon-mesh.service.ts
createTableCell(element: TableElement, layout: CellLayout): BABYLON.Mesh;
createTableBorders(element: TableElement, borderCollapse: boolean): BABYLON.Mesh[];
handleBorderCollapse(adjacentCells: TableCell[]): void;
```

## Components and Interfaces

### Table Structure Hierarchy

```
Table (container)
├── Caption (optional)
├── THead (optional)
│   └── TR (rows)
│       └── TH (header cells)
├── TBody (one or more)
│   └── TR (rows)
│       └── TD (data cells)
└── TFoot (optional)
    └── TR (rows)
        └── TD (footer cells)
```

### Layout Algorithm Flow

1. **Parse Table Structure**: Analyze table DOM to identify rows, columns, and spanning cells
2. **Calculate Dimensions**: Determine column widths and row heights based on content and constraints
3. **Handle Spanning**: Adjust layout for cells with colspan/rowspan attributes
4. **Position Elements**: Calculate absolute positions for each cell based on layout data
5. **Apply Styling**: Handle borders, spacing, and alignment according to table properties
6. **Create Meshes**: Generate BabylonJS meshes for table structure and cells

### Column Width Calculation

```typescript
interface ColumnCalculation {
  explicitWidth?: number;    // CSS width property
  minContentWidth: number;   // Minimum width based on content
  maxContentWidth: number;   // Maximum width based on content
  finalWidth: number;        // Calculated final width
}
```

**Auto Layout Algorithm:**
1. Calculate minimum and maximum content widths for each column
2. Distribute available width based on content requirements
3. Handle percentage and fixed widths
4. Adjust for spanning cells

**Fixed Layout Algorithm:**
1. Use widths from first row cells
2. Distribute remaining width equally among unspecified columns
3. Ignore content width requirements

### Row Height Calculation

```typescript
interface RowCalculation {
  explicitHeight?: number;   // CSS height property
  contentHeight: number;     // Height based on cell content
  finalHeight: number;       // Calculated final height
}
```

## Data Models

### TableStyleProperties
Extension of existing StyleRule to include table-specific properties:

```typescript
interface TableStyleProperties extends StyleRule {
  // Table-level properties
  borderCollapse?: 'collapse' | 'separate';
  borderSpacing?: string;
  tableLayout?: 'auto' | 'fixed';
  captionSide?: 'top' | 'bottom';
  
  // Cell-level properties
  colspan?: number;
  rowspan?: number;
  verticalAlign?: 'top' | 'middle' | 'bottom' | 'baseline';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  
  // Spacing properties
  cellPadding?: string;
  cellSpacing?: string;
}
```

### TableCellData
Data structure for individual table cells:

```typescript
interface TableCellData {
  element: TableElement;
  row: number;
  column: number;
  colspan: number;
  rowspan: number;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  mesh?: BABYLON.Mesh;
  borders?: BABYLON.Mesh[];
}
```

## Error Handling

### Table Structure Validation
- Validate proper nesting of table elements
- Handle missing or malformed table structures
- Provide fallback rendering for invalid tables

### Spanning Conflicts
- Detect overlapping cell spans
- Resolve conflicts with defined precedence rules
- Log warnings for invalid spanning configurations

### Layout Constraints
- Handle tables wider than container
- Manage minimum cell size constraints
- Graceful degradation for extreme aspect ratios

```typescript
interface TableErrorHandler {
  validateTableStructure(table: TableElement): ValidationResult;
  resolveSpanningConflicts(cells: TableCellData[]): TableCellData[];
  handleLayoutOverflow(layout: TableLayoutData, container: DomElement): TableLayoutData;
}
```

## Testing Strategy

### Visual Testing with Example Sites
Testing will be conducted through example sites created in `src/app/services/site-data.service.ts` with documented expected visual outcomes for manual verification.

### Test Site Categories

#### Basic Table Test Sites
- Simple 3x3 table with equal column widths
- Table with mixed content to test auto-sizing
- Empty cells and content overflow scenarios

#### Advanced Layout Test Sites
- Complex tables with colspan/rowspan combinations
- Tables comparing auto vs fixed layout algorithms
- Responsive tables with percentage-based widths

#### Styling Test Sites
- Border collapse vs separate comparison
- Various border styles and spacing configurations
- Background colors and hover state demonstrations

#### Semantic Element Test Sites
- Tables with thead/tbody/tfoot sections
- Caption positioning (top/bottom)
- Proper semantic styling defaults

### Test Site Data Structure
```typescript
const tableTestSites = {
  simpleTable: {
    name: "Basic 3x3 Table",
    expectedBehavior: "Equal column widths, proper cell spacing, basic borders",
    siteData: { /* table structure */ }
  },
  complexTable: {
    name: "Complex Table with Spanning",
    expectedBehavior: "Proper colspan/rowspan rendering, no overlapping cells",
    siteData: { /* complex table structure */ }
  }
  // Additional test sites...
};
```

### Visual Validation Process
1. Load test site in BJSUI application
2. Compare rendered output against documented expected behavior
3. Verify interaction states (hover, click) work correctly
4. Confirm responsive behavior with container size changes

## Performance Considerations

### Mesh Optimization
- Reuse materials for similar cell styles
- Batch border creation for collapsed borders
- Implement mesh pooling for dynamic tables

### Layout Caching
- Cache calculated layouts for static tables
- Invalidate cache only when table structure changes
- Optimize recalculation for content-only changes

### Memory Management
- Dispose unused table meshes properly
- Manage texture resources for cell backgrounds
- Implement lazy loading for large tables

## Implementation Phases

### Phase 1: Core Table Structure
- Basic table, tr, td, th element support
- Simple layout algorithm (equal column widths)
- Basic positioning and mesh creation

### Phase 2: Advanced Layout
- Auto and fixed table layout algorithms
- Column width and row height calculations
- Cell spanning (colspan/rowspan) support

### Phase 3: Styling and Borders
- Border collapse/separate modes
- Border spacing implementation
- Cell padding and alignment

### Phase 4: Semantic Elements
- thead, tbody, tfoot support
- Caption element positioning
- Proper semantic styling defaults

### Phase 5: Integration and Polish
- Integration with existing hover/interaction systems
- Performance optimization
- Comprehensive testing and bug fixes

## Dependencies

### Existing BJSUI Services
- BabylonDomService: Core DOM element handling
- BabylonMeshService: Mesh creation and management
- BabylonStyleService: Style parsing and application
- BabylonCameraService: Viewport and positioning

### New Dependencies
- TableLayoutService: Table-specific layout calculations
- TableBorderService: Border management and rendering
- TableValidationService: Structure validation and error handling

### BabylonJS Features
- Mesh creation and positioning
- Material management for cell styling
- VertexData manipulation for custom borders
- Scene graph management for table hierarchy