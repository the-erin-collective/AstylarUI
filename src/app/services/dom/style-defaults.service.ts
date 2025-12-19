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
    // Flexbox defaults (match browser spec)
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
    // No default for width/height (auto)
    // No default for flex properties (handled by flex container)
};

const defaults: { [key: string]: Partial<StyleRule> } = {
    div: {
        // No difference from global default
    },
    section: {
        // No difference from global default
    },
    article: {
        // No difference from global default
    },
    header: {
        // No difference from global default
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
    a: {
        // color: '#0000ee', // Default link color (blue) - not in StyleRule
        // textDecoration: 'underline', // Not in StyleRule, but would be default
        // display: inline by default, but not in StyleRule
    }
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