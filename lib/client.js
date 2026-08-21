window.__ModuleLoader__.load({
	id: "dsh-software-tools",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_dom_client = require("react-dom/client");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/locales.ts
		/** zh/en dictionaries for the software-tools panel. */
		const zh = {
			title: "软件工具",
			panelTitle: "软件工具",
			panelHint: "勾选的工具会注入当前会话的模型上下文(系统提示段落),模型即可按需调用。",
			category_all: "全部",
			selected: "已选",
			selectHint: "已勾选 {n} 个工具",
			sectionLabel: "注入段落预览",
			close: "关闭",
			loadFailed: "加载失败",
			empty: "暂无可选工具",
			refresh: "刷新"
		};
		const en = {
			title: "Software Tools",
			panelTitle: "Software Tools",
			panelHint: "Checked tools are injected into the model context (system prompt section) so the model can use them on demand.",
			category_all: "All",
			selected: "Selected",
			selectHint: "{n} tool(s) selected",
			sectionLabel: "Injected section preview",
			close: "Close",
			loadFailed: "Failed to load",
			empty: "No tools available",
			refresh: "Refresh"
		};
		//#endregion
		//#region src/client/styles.ts
		/**
		* Self-contained styles for the software-tools entry + panel (dst_ prefix).
		* Visual values mirror the dsh shell design language used by the
		* skill-explorer / task-board family (dsw-alias-* theme tokens, same
		* spacing/radius/type scale, switch-style toggles).
		*/
		const entryCss = `
#dst-sidebar-entry{width:100%;height:32px;color:var(--dsw-alias-label-secondary,#8a8f9c);cursor:pointer;white-space:nowrap;background:0 0;border:none;border-radius:8px;align-items:center;gap:8px;padding:0 12px;font-size:13px;display:flex}
#dst-sidebar-entry:hover{background:var(--dsw-specific-sidebar-nav-item-hover,#eef1f5);color:var(--dsw-alias-label-primary,#1c1e26)}
#dst-sidebar-entry>span:first-child{flex:none;justify-content:center;align-items:center;display:inline-flex}
#dst-sidebar-entry>span:last-child{text-overflow:ellipsis;overflow:hidden}
[data-dsh-frame][data-sidebar-collapsed] #dst-sidebar-entry{justify-content:center;width:100%;padding:0}
[data-dsh-frame][data-sidebar-collapsed] #dst-sidebar-entry>span:last-child{display:none}
`;
		const css = `
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
`;
		//#endregion
		//#region src/client/panel.tsx
		/**
		* SoftwareToolsPanel — the sidebar 【软件工具】overlay.
		*
		* Lists the curated catalog grouped by category, each row a compact
		* "name + one-line description + checkbox". Toggling writes the whole
		* selection through the loopback RPC channel; the host re-injects the
		* selected tools into the model's system prompt on the next request.
		*/
		function loadData(call) {
			return call("list", {}).then((raw) => {
				const r = raw ?? {};
				if (!r.ok || r.value === void 0 || !Array.isArray(r.value.catalog)) throw new Error(r.error?.message ?? "load failed");
				return {
					catalog: r.value.catalog,
					categoryLabels: r.value.categoryLabels ?? {},
					selected: Array.isArray(r.value.selected) ? r.value.selected : [],
					section: typeof r.value.section === "string" ? r.value.section : ""
				};
			});
		}
		function SoftwareToolsPanel({ call, t, onClose }) {
			const [data, setData] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [filter, setFilter] = (0, react.useState)("all");
			const refresh = () => {
				setError(null);
				loadData(call).then(setData).catch(() => setError(t("loadFailed")));
			};
			(0, react.useEffect)(() => {
				refresh();
			}, []);
			const toggle = async (id) => {
				if (data === null || busy) return;
				const next = data.selected.includes(id) ? data.selected.filter((x) => x !== id) : [...data.selected, id];
				setBusy(true);
				try {
					await call("set", { ids: next });
					await refresh();
				} catch {
					setError(t("loadFailed"));
				} finally {
					setBusy(false);
				}
			};
			const categories = ["all", ...new Set((data?.catalog ?? []).map((t) => t.category))];
			const visible = data === null ? [] : filter === "all" ? data.catalog : data.catalog.filter((t) => t.category === filter);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dst_overlay",
				onClick: (e) => {
					if (e.target === e.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dst_card",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dst_head",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: "dst_headTitle",
									children: t("panelTitle")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dst_headHint",
									children: t("panelHint")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dst_count",
									children: data !== null ? t("selectHint").replace("{n}", String(data.selected.length)) : ""
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dst_footBtn",
									onClick: onClose,
									"aria-label": t("close"),
									children: "✕"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dst_tabs",
							children: categories.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `dst_tab${filter === c ? " dst_tabActive" : ""}`,
								onClick: () => setFilter(c),
								children: c === "all" ? t("category_all") : data?.categoryLabels[c] ?? c
							}, c))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dst_body",
							children: [
								error !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dst_error",
									children: error
								}) : null,
								data !== null && visible.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dst_empty",
									children: t("empty")
								}) : null,
								data !== null ? visible.map((tool) => {
									const on = data.selected.includes(tool.id);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dst_tool",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "dst_toolText",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "dst_toolHeader",
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: "dst_toolName",
														children: tool.name
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: "dst_badge",
														children: data.categoryLabels[tool.category] ?? tool.category
													})]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: "dst_toolDesc",
													children: tool.desc
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
													className: "dst_usage",
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "用法" }), tool.usage]
												})
											]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											role: "switch",
											"aria-checked": on,
											className: "dst_switch",
											disabled: busy,
											"aria-label": tool.name,
											onClick: () => {
												toggle(tool.id);
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dst_switchTrack",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dst_switchThumb" })
											})
										})]
									}, tool.id);
								}) : null
							]
						}),
						data !== null && data.section !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
							className: "dst_section",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("sectionLabel") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
								className: "dst_sectionPre",
								children: data.section
							})]
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dst_foot",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dst_footBtn",
								onClick: refresh,
								children: t("refresh")
							})
						})
					]
				})
			});
		}
		let styleInstalled = false;
		function ensureStyles() {
			if (styleInstalled) return;
			styleInstalled = true;
			const el = document.createElement("style");
			el.setAttribute("data-plugin", "dsh-software-tools");
			el.textContent = css;
			document.head.appendChild(el);
		}
		//#endregion
		//#region src/client/index.tsx
		/**
		* dsh-software-tools — client half.
		*
		* Injects a 【软件工具】entry into the sidebar (DOM-injection pattern shared by
		* the linxin666 family: the official `sidebar` slot replaces the whole
		* column, so external plugins append a nav button after the New Session
		* row). Clicking opens an overlay panel listing the curated tool inventory
		* with checkboxes; toggles persist through the loopback RPC channel and the
		* host injects the checked set into the model's system prompt.
		*/
		const name = "dsh-software-tools-client";
		const inject = [
			"slots",
			"locale",
			"connection"
		];
		const NS = "software-tools";
		const CHANNEL = "/_dsh-software-tools";
		const ENTRY_ID = "dst-sidebar-entry";
		const PANEL_ID = "dst-panel-root";
		/** Find the sidebar shell root (mirrors linxin666's proven selectors). */
		function sidebarRoot() {
			const column = document.querySelector("[data-pane=\"sidebar\"], [class*=\"sidebarCol\"]");
			if (column === null) return void 0;
			return column.querySelector("[class*=\"logoRow\"]")?.parentElement ?? column.firstElementChild;
		}
		function newSessionButton(root) {
			const nested = root.querySelector("button[class*=\"newSession\"]");
			if (nested !== null) return nested;
			for (const child of Array.from(root.children)) if (child.tagName === "BUTTON") return child;
		}
		function buildEntry(label, onToggle) {
			const entry = document.createElement("button");
			entry.type = "button";
			entry.id = ENTRY_ID;
			entry.setAttribute("data-dsh-plugin", "dsh-software-tools");
			entry.setAttribute("data-dsh-part", "sidebar-entry");
			entry.setAttribute("aria-label", label);
			entry.setAttribute("title", label);
			entry.innerHTML = "<span style=\"flex:none;display:inline-flex;justify-content:center;align-items:center\">🔧</span><span>" + label + "</span>";
			entry.addEventListener("click", onToggle);
			return entry;
		}
		function insertEntry(root, entry) {
			const button = newSessionButton(root);
			if (button === void 0) return false;
			if (entry.parentElement === root) return true;
			const row = button.closest("[class*=\"logoRow\"]");
			const base = row instanceof HTMLElement && row.parentElement === root ? row : button;
			const family = Array.from(root.children).filter((el) => el instanceof HTMLElement && el.matches("[data-dsh-part=\"sidebar-entry\"]"));
			const anchor = family.length > 0 ? family[family.length - 1].nextSibling : base.nextSibling;
			root.insertBefore(entry, anchor);
			return true;
		}
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-software-tools: dictionaries");
			ensureStyles();
			const entryStyle = document.createElement("style");
			entryStyle.setAttribute("data-plugin", "dsh-software-tools");
			entryStyle.setAttribute("data-part", "sidebar-entry");
			entryStyle.textContent = entryCss;
			document.head.appendChild(entryStyle);
			const t = ctx.locale.bind(NS);
			const connection = ctx.get("connection");
			const call = (endpoint, payload) => connection.rpc.call(CHANNEL, endpoint, payload);
			let rootRef = null;
			let panelHost = null;
			const closePanel = () => {
				rootRef?.unmount();
				rootRef = null;
				if (panelHost !== null) {
					panelHost.remove();
					panelHost = null;
				}
			};
			const openPanel = () => {
				if (panelHost === null) {
					panelHost = document.createElement("div");
					panelHost.id = PANEL_ID;
					document.body.appendChild(panelHost);
				}
				if (rootRef === null) rootRef = (0, react_dom_client.createRoot)(panelHost);
				rootRef.render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SoftwareToolsPanel, {
					call,
					t: (k) => t(k),
					onClose: closePanel
				}));
			};
			const togglePanel = () => {
				if (panelHost !== null && rootRef !== null) closePanel();
				else openPanel();
			};
			const tryInsert = () => {
				const root = sidebarRoot();
				if (root === void 0) return false;
				let entry = document.getElementById(ENTRY_ID);
				if (entry === null) entry = buildEntry(t("title"), togglePanel);
				if (entry.parentElement === null && !insertEntry(root, entry)) return false;
				return true;
			};
			new MutationObserver(() => {
				tryInsert();
			}).observe(document.body, {
				childList: true,
				subtree: true
			});
			const fallback = window.setInterval(() => {
				if (tryInsert()) window.clearInterval(fallback);
			}, 1500);
			window.setTimeout(() => window.clearInterval(fallback), 6e4);
		}
		//#endregion
		exports.CHANNEL = CHANNEL;
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map