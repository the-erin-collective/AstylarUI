import { Injectable } from '@angular/core';
import { StyleRule } from '../../types/style-rule';

// CSS default styles after a typical reset (e.g., Normalize.css)
const globalDefaultStyle: Partial<StyleRule> = {
    display: 'block',
    margin: '0',
    padding: '0',
    borderWidth: '0',
    borderStyle: 'none',
    borderColor: 'transparent',
    borderRadius: '0',
    background: 'transparent',
    boxShadow: undefined,
    opacity: '1.0',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'normal',
    alignItems: 'left',
    alignContent: 'left',
    order: '0',
    flexGrow: '0',
    flexShrink: '1',
    flexBasis: 'auto',
    alignSelf: 'auto',
    cursor: 'default',
};

const defaults: { [key: string]: Partial<StyleRule> } = {
    div: {
        // No difference from global default
    },
    section: {
        background: '#34495e', // Default section background (dark blue-gray)
    },
    article: {
        background: '#27ae60', // Default article background (green)
    },
    header: {
        background: '#3498db', // Default header background (blue)
    },
    footer: {
        // No difference from global default
    },
    nav: {
        // No difference from global default
    },
    main: {
        // No difference from global default
    },
    ul: {
        display: 'block',
        listStyleType: 'disc',
        paddingLeft: '40px',
        marginTop: '16px', // 1em → 16px
        marginBottom: '16px', // 1em → 16px
    },
    ol: {
        display: 'block',
        listStyleType: 'decimal',
        paddingLeft: '40px',
        marginTop: '16px', // 1em → 16px
        marginBottom: '16px', // 1em → 16px
    },
    li: {
        display: 'list-item',
    },
    img: {
        display: 'inline-block',
        borderStyle: 'none',
        // width/height: auto by default
        objectFit: 'fill', // CSS default
    },
    table: {
        display: 'table',
        width: 'auto',
    },
    thead: {
        display: 'table-header-group',
    },
    tbody: {
        display: 'table-row-group',
    },
    tfoot: {
        display: 'table-footer-group',
    },
    tr: {
        display: 'table-row',
    },
    th: {
        display: 'table-cell',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#888',
    },
    td: {
        display: 'table-cell',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#bbb',
    },
    caption: {
        display: 'table-caption',
        background: '#f9e6ff', // Purple for caption
    },
    col: {
        display: 'table-column',
    },
    colgroup: {
        display: 'table-column-group',
    },
    a: {
        display: 'inline-block',
        background: '#1976d2', // Blue for normal anchor
        borderRadius: '4px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#1976d2',
        cursor: 'pointer',
        // color: '#fff', // Not used, but would be default
    },
    'a:visited': {
        background: '#6a1b9a', // Purple for visited
    },
    'a:hover': {
        background: '#1565c0', // Darker blue for hover
    },
    area: {
        display: 'inline-block',
        background: '#ffb300', // Orange for area
        borderRadius: '4px',
    },
};

@Injectable({
    providedIn: 'root'
})
export class StyleDefaultsService {
    static mergeStyles(base: Partial<StyleRule>, override: Partial<StyleRule>): Partial<StyleRule> {
        const merged = { ...base, ...override };
        // Handle padding
        if (override?.padding) {
            ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(side => {
                if (!(side in override)) {
                    delete merged[side as keyof StyleRule];
                }
            });
        }
        // Handle margin
        if (override?.margin) {
            ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'].forEach(side => {
                if (!(side in override)) {
                    delete merged[side as keyof StyleRule];
                }
            });
        }
        return merged;
    }

    getGlobalDefaultStyle(): Partial<StyleRule> {
        return globalDefaultStyle;
    }

    getElementTypeDefaults(elementType: string): Partial<StyleRule> {
        // Merge global defaults with element-specific defaults (element-specific takes precedence)
        return { ...globalDefaultStyle, ...(defaults[elementType] || {}) };
    }
} 