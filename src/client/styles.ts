/**
 * Self-contained styles for the software-tools entry + panel (dst_ prefix).
 * Visual values mirror the dsh shell design language used by the
 * skill-explorer / task-board family (dsw-alias-* theme tokens, same
 * spacing/radius/type scale, switch-style toggles).
 */
export const entryCss = `
#dst-sidebar-entry{width:100%;height:32px;color:var(--dsw-alias-label-secondary,#8a8f9c);cursor:pointer;white-space:nowrap;background:0 0;border:none;border-radius:8px;align-items:center;gap:8px;padding:0 12px;font-size:13px;display:flex}
#dst-sidebar-entry:hover{background:var(--dsw-specific-sidebar-nav-item-hover,#eef1f5);color:var(--dsw-alias-label-primary,#1c1e26)}
#dst-sidebar-entry>span:first-child{flex:none;justify-content:center;align-items:center;display:inline-flex}
#dst-sidebar-entry>span:last-child{text-overflow:ellipsis;overflow:hidden}
[data-dsh-frame][data-sidebar-collapsed] #dst-sidebar-entry{justify-content:center;width:100%;padding:0}
[data-dsh-frame][data-sidebar-collapsed] #dst-sidebar-entry>span:last-child{display:none}
`

export const css = `
.dst_overlay{position:fixed;inset:0;z-index:9999;background:var(--dsw-alias-bg-mask-2,#080a1073);display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.dst_card{background:var(--dsw-alias-bg-overlay,#fdfdfd);color:var(--dsw-alias-label-primary,#1c1e26);width:min(780px,92vw);max-height:84vh;border-radius:12px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.35)}
.dst_head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,#e5e7eb);background:var(--dsw-alias-bg-layer-1,#f7f8fa)}
.dst_headTitle{margin:0;font-size:15px;font-weight:600}
.dst_headHint{color:var(--dsw-alias-label-secondary,#8a8f9c);font-size:11px;flex:1;min-width:0}
.dst_count{color:var(--dsw-alias-label-secondary,#8a8f9c);font-size:11px;white-space:nowrap}
.dst_close{border:1px solid var(--dsw-alias-border-l1,#d7dae0);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-secondary,#5f6672);cursor:pointer;border-radius:6px;padding:3px 8px;font-size:11px;line-height:1.4}
.dst_close:hover{background:var(--dsw-alias-interactive-bg-hover,#eef1f5);color:var(--dsw-alias-label-primary)}
.dst_tabs{display:flex;gap:4px;padding:8px 16px 0;background:var(--dsw-alias-bg-layer-1,#f7f8fa);flex-wrap:wrap}
.dst_tab{border:1px solid var(--dsw-alias-border-l1,#d7dae0);color:var(--dsw-alias-label-secondary,#5f6672);cursor:pointer;background:var(--dsw-alias-bg-base,#fff);border-bottom:none;border-radius:8px 8px 0 0;padding:5px 12px;font-size:12px}
.dst_tabActive{color:var(--dsw-alias-label-primary,#1c1e26);font-weight:600}
.dst_body{flex:1;overflow:auto;padding:12px 16px}
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
.dst_section{margin:0 16px 8px}
.dst_section summary{font-size:11px;color:var(--dsw-alias-label-secondary,#8a8f9c);cursor:pointer}
.dst_sectionPre{margin:6px 0 0;padding:8px;background:var(--dsw-alias-bg-layer-1,#f7f8fa);border:1px solid var(--dsw-alias-border-l1,#e5e7eb);border-radius:6px;font-size:11px;line-height:1.6;white-space:pre-wrap;word-break:break-all;max-height:180px;overflow:auto}
.dst_foot{display:flex;justify-content:flex-end;gap:8px;padding:10px 16px;border-top:1px solid var(--dsw-alias-border-l1,#e5e7eb)}
.dst_footBtn{border:1px solid var(--dsw-alias-border-l1,#d7dae0);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#3a3f4b);cursor:pointer;border-radius:6px;padding:5px 14px;font-size:12px}
.dst_footBtn:hover{background:var(--dsw-alias-interactive-bg-hover,#eef1f5)}
.dst_error{color:#d64545;font-size:12px;padding:8px 0}
.dst_empty{color:var(--dsw-alias-label-tertiary,#a2a7b3);font-size:12px;text-align:center;padding:24px 0}
`
