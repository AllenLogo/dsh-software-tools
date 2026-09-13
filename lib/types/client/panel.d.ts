export interface PanelProps {
    call: (endpoint: string, payload?: unknown) => Promise<unknown>;
    t: (k: string) => string;
    onClose: () => void;
}
export declare function SoftwareToolsPanel({ call, t, onClose }: PanelProps): import("react").JSX.Element;
export declare function ensureStyles(): void;
