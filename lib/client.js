window.__ModuleLoader__.load({
	id: "dsh-software-tools",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
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
			backToChat: "返回对话",
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
			backToChat: "Back to chat",
			loadFailed: "Failed to load",
			empty: "No tools available",
			refresh: "Refresh"
		};
		//#endregion
		//#region src/client/styles.ts
		/**
		* Self-contained styles for the software-tools panel (dst_ prefix).
		*
		* The rail row's own chrome belongs to ui-sidebar (it renders the button and
		* resolves the label), so only the `main`-slot panel is styled here. Visual
		* values mirror the dsh shell design language used by the skill-explorer /
		* task-board family (dsw-alias-* theme tokens, same spacing/radius/type scale).
		*/
		const css = `
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
`;
		//#endregion
		//#region src/client/panel.tsx
		/**
		* SoftwareToolsPanel — the `main`-slot occupant (the centre panel the layout
		* renders while this panel is selected) plus SoftwareToolsGlyph, the
		* `sidebar.panellist` rail entry that selects it.
		*
		* Lists the curated catalog grouped by category, each row a compact
		* "name + one-line description + checkbox". Toggling writes the whole
		* selection through the loopback RPC channel; the host re-injects the selected
		* tools into the model's system prompt on the next request.
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
		/**
		* Rail glyph. The sidebar supplies the pixel size it wants for the current
		* column state (18 expanded, 16 collapsed) and owns the button, the label and
		* the tooltip around this node.
		*/
		function SoftwareToolsGlyph({ size = 18 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.4",
				strokeLinecap: "round",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2.5 4.5h2.1M7.4 4.5h6.1M2.5 11.5h6.1M11.4 11.5h2.1" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "6",
						cy: "4.5",
						r: "1.7"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "10",
						cy: "11.5",
						r: "1.7"
					})
				]
			});
		}
		function SoftwareToolsPanel({ call, t, close }) {
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
			const categories = ["all", ...new Set((data?.catalog ?? []).map((entry) => entry.category))];
			const visible = data === null ? [] : filter === "all" ? data.catalog : data.catalog.filter((entry) => entry.category === filter);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dst_panel",
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
								className: "dst_close",
								onClick: close,
								children: t("backToChat")
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
		const name = "dsh-software-tools-client";
		const inject = [
			"slots",
			"locale",
			"connection",
			"layout"
		];
		const NS = "software-tools";
		const CHANNEL = "/_dsh-software-tools";
		/** Identity shared by the rail row and its main-slot occupant. */
		const PANEL_ID = "software-tools";
		/** Rail order: after the shipped panel entries, before the settings foot. */
		const PANEL_ORDER = 20;
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-software-tools: dictionaries");
			ensureStyles();
			const bound = ctx.locale.bind(NS);
			const t = (key) => bound(key);
			const connection = ctx.get("connection");
			const call = (endpoint, payload) => connection.rpc.call(CHANNEL, endpoint, payload);
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: PANEL_ID,
				inject: () => ({
					call,
					t,
					close: () => ctx.layout.selectPanel(null)
				})
			}, SoftwareToolsPanel));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: PANEL_ID,
				order: 20,
				label: () => t("title"),
				locale: NS
			}, SoftwareToolsGlyph));
		}
		//#endregion
		exports.CHANNEL = CHANNEL;
		exports.NS = NS;
		exports.PANEL_ID = PANEL_ID;
		exports.PANEL_ORDER = PANEL_ORDER;
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map