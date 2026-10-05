import type { CallFn } from './context-types.ts';
export interface PanelProps {
    call: CallFn;
    t: (key: string) => string;
    close: () => void;
}
/**
 * Rail glyph. The sidebar supplies the pixel size it wants for the current
 * column state (18 expanded, 16 collapsed) and owns the button, the label and
 * the tooltip around this node.
 */
export declare function SoftwareToolsGlyph({ size }: {
    size?: number;
}): import("react").JSX.Element;
export declare function SoftwareToolsPanel({ call, t, close }: PanelProps): import("react").JSX.Element;
export declare function ensureStyles(): void;
