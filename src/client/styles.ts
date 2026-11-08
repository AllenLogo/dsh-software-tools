/**
 * Self-contained styles for the software-tools panel (dst_ prefix).
 *
 * The rail row's own chrome belongs to ui-sidebar (it renders the button and
 * resolves the label), so only the `main`-slot panel is styled here. Visual
 * values mirror the dsh shell design language used by the skill-explorer /
 * task-board family (dsw-alias-* theme tokens, same spacing/radius/type scale).
 */
export const css = `
.dst_panel{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#1c1e26);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.dst_head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,#e5e7eb);background:var(--dsw-alias-bg-layer-1,#f7f8fa);flex:none}
.dst_headTitle{margin:0;font-size:15px;font-weight:600}
.dst_headHint{color:var(--dsw-alias-label-secondary,#8a8f9c);font-size:11px;flex:1;min-width:0}
.dst_count{color:var(--dsw-alias-label-secondary,#8a8f9c);font-size:11px;white-space:nowrap}
.dst_close{border:1px solid var(--dsw-alias-border-l1,#d7dae0);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-secondary,#5f6672);cursor:pointer;border-radius:6px;padding:3px 10px;font-size:11px;line-height:1.4;white-space:nowrap}
.dst_close:hover{background:var(--dsw-alias-interactive-bg-hover,#eef1f5);color:var(--dsw-alias-label-primary)}
.dst_tabs{display:flex;gap:4px;padding:8px 16px 0;background:var(--dsw-alias-bg-layer-1,#f7f8fa);flex-wrap:wrap;flex:none}
.dst_tab{border:1px solid var(--dsw-alias-border-l1,#d7dae0);color:var(--dsw-alias-label-secondary,#5f6672);cursor:pointer;background:var(--dsw-alias-bg-base,#fff);border-bottom:none;border-radius:8px 8px 0 0;padding:5px 12px;font-size:12px}
.dst_tabActive{color:var(--dsw-alias-label-primary,#1c1e26);font-weight:600}
.dst_body{flex:1;min-height:0;overflow:auto;padding:12px 16px}
.dst_tool{border:1px solid var(--dsw-alias-border-l1,#e5e7eb);background:var(--dsw-alias-bg-base,#fff);border-radius:8px;margin-bottom:8px;padding:10px 12px;display:flex;align-items:flex-start;gap:10px}
.dst_toolText{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.dst_toolHeader{display:flex;align-items:center;gap:8px;min-width:0}
.dst_toolName{font-family:ui-monospace,Consolas,monospace;font-size:13px;font-weight:600}
.dst_badge{background:var(--dsw-alias-state-business-secondary,#eef2ff);color:var(--dsw-alias-state-business-primary,#4353a3);border:1px solid var(--dsw-alias-state-business-tertiary,#dde3f8);border-radius:99px;padding:1px 6px;font-size:10px;flex:none}
.dst_toolDesc{font-size:12px;color:var(--dsw-alias-label-secondary,#5f6672);line-height:1.5}
.dst_usage{margin:4px 0 0;font-size:11px;color:var(--dsw-alias-label-tertiary,#a2a7b3);line-height:1.6;white-space:pre-wrap;word-break:break-all}
.dst_switch{cursor:pointer;background:0 0;border:none;border-radius:99px;align-items:center;margin-left:auto;padding:2px;display:inline-flex;flex:none}
.dst_switchTrack{background:var(--dsw-alias-border-l2,#d1d5db);border-radius:99px;flex:none;width:30px;height:16px;transition:background .18s;position:relative}
.dst_switchThumb{background:var(--dsw-alias-bg-base,#fff);border-radius:50%;width:12px;height:12px;transition:left .18s;position:absolute;top:2px;left:2px;box-shadow:0 1px 2px rgba(0,0,0,.4)}
.dst_switch[aria-checked=true] .dst_switchTrack{background:var(--dsw-alias-state-success-primary,#10b981)}
.dst_switch[aria-checked=true] .dst_switchThumb{left:16px}
.dst_section{margin:0 16px 8px;flex:none}
.dst_section summary{font-size:11px;color:var(--dsw-alias-label-secondary,#8a8f9c);cursor:pointer}
.dst_sectionPre{margin:6px 0 0;padding:8px;background:var(--dsw-alias-bg-layer-1,#f7f8fa);border:1px solid var(--dsw-alias-border-l1,#e5e7eb);border-radius:6px;font-size:11px;line-height:1.6;white-space:pre-wrap;word-break:break-all;max-height:180px;overflow:auto}
.dst_foot{display:flex;justify-content:flex-end;gap:8px;padding:10px 16px;border-top:1px solid var(--dsw-alias-border-l1,#e5e7eb);flex:none}
.dst_footBtn{border:1px solid var(--dsw-alias-border-l1,#d7dae0);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#3a3f4b);cursor:pointer;border-radius:6px;padding:5px 14px;font-size:12px}
.dst_footBtn:hover{background:var(--dsw-alias-interactive-bg-hover,#eef1f5)}
.dst_error{color:#d64545;font-size:12px;padding:8px 0}
.dst_empty{color:var(--dsw-alias-label-tertiary,#a2a7b3);font-size:12px;text-align:center;padding:24px 0}
.dst_toolActions{display:flex;flex-direction:row;gap:6px;align-items:center;flex:none}
.dst_del{border:1px solid var(--dsw-alias-border-l1,#d7dae0);background:var(--dsw-alias-bg-base,#fff);color:#b03a3a;cursor:pointer;border-radius:6px;padding:3px 8px;font-size:11px;line-height:1.4;white-space:nowrap}
.dst_del:hover{background:var(--dsw-alias-interactive-bg-hover,#fdeeee);border-color:#e0b4b4}
.dst_del:disabled{color:var(--dsw-alias-label-tertiary,#a2a7b3);cursor:not-allowed;opacity:.6}
.dst_del:disabled:hover{background:var(--dsw-alias-bg-base,#fff);border-color:var(--dsw-alias-border-l1,#d7dae0)}
.dst_delConfirm{background:#d64545;border-color:#c03a3a;color:#fff}
.dst_delConfirm:hover{background:#c03a3a;border-color:#a83434}
.dst_toolId{font-family:ui-monospace,Consolas,monospace;font-size:10px;color:var(--dsw-alias-label-tertiary,#a2a7b3);background:var(--dsw-alias-bg-layer-1,#f7f8fa);border:1px solid var(--dsw-alias-border-l1,#e5e7eb);border-radius:4px;padding:0 4px;flex:none;line-height:1.5}
.dst_warnList{margin:4px 0 0;padding-left:16px;font-size:11px;line-height:1.5}
.dst_badgeUser{background:var(--dsw-alias-state-success-secondary,#e9f8f1);color:var(--dsw-alias-state-success-primary,#0f8a5f);border-color:#c9ecdd;border-radius:99px;padding:1px 6px;font-size:10px;flex:none;border:1px solid #c9ecdd}
.dst_badgeOverride{background:var(--dsw-alias-state-warning-secondary,#fdf3e2);color:#9a6412;border:1px solid #f0dfc0;border-radius:99px;padding:1px 6px;font-size:10px;flex:none}
.dst_notice{color:var(--dsw-alias-state-success-primary,#0f8a5f);font-size:12px;padding:2px 0 8px}
.dst_warn{color:#9a6412;background:var(--dsw-alias-state-warning-secondary,#fdf3e2);border:1px solid #f0dfc0;border-radius:6px;font-size:12px;padding:7px 10px;margin-bottom:8px;line-height:1.5}
.dst_form{border-top:1px solid var(--dsw-alias-border-l1,#e5e7eb);background:var(--dsw-alias-bg-layer-1,#f7f8fa);padding:10px 16px;display:flex;flex-direction:column;gap:8px;flex:none;max-height:46%;overflow:auto}
.dst_formTitle{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#1c1e26)}
.dst_formHint{font-size:11px;color:var(--dsw-alias-label-tertiary,#a2a7b3);line-height:1.5}
.dst_formGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dst_field{display:flex;flex-direction:column;gap:4px;font-size:11px;color:var(--dsw-alias-label-secondary,#5f6672);min-width:0}
.dst_fieldWide{grid-column:1/-1}
.dst_input{border:1px solid var(--dsw-alias-border-l1,#d7dae0);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#1c1e26);border-radius:6px;padding:5px 8px;font-size:12px;font-family:inherit;line-height:1.5;width:100%;box-sizing:border-box}
.dst_input:focus{outline:2px solid var(--dsw-alias-state-business-tertiary,#dde3f8);outline-offset:0;border-color:var(--dsw-alias-state-business-primary,#4353a3)}
textarea.dst_input{resize:vertical;min-height:52px}
.dst_formActions{display:flex;justify-content:flex-end;gap:8px}
.dst_footBtnPrimary{border:1px solid var(--dsw-alias-state-business-primary,#4353a3);background:var(--dsw-alias-state-business-primary,#4353a3);color:#fff}
.dst_footBtnPrimary:hover{background:#3a4890;border-color:#3a4890}
.dst_footBtn:disabled{opacity:.5;cursor:not-allowed}
`
