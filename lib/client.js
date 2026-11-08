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
			refresh: "刷新",
			usageLabel: "用法",
			addEntry: "新增条目",
			addTitle: "新增条目",
			addHint: "只写\"可用软件工具\"的使用说明:是什么、何时用、第一条命令。面板只写用户目录(不会覆盖内置条目);调优/排障细节写进该工具自己的文档。",
			fieldName: "名称",
			fieldNamePh: "显示名,如 ffmpeg (音视频处理)",
			fieldDesc: "说明",
			fieldDescPh: "一句话说明它是什么 / 何时用(只显示在面板,不注入)",
			fieldUsage: "用法",
			fieldUsagePh: "可直接执行的命令 + 必要前提(会注入每轮请求,保持精简)",
			fieldCategory: "分类",
			save: "保存",
			cancel: "取消",
			delete: "删除",
			confirmDelete: "确认删除",
			readonlyHint: "内置条目不可删除",
			builtinBadge: "内置",
			userBadge: "用户",
			overrideBadge: "覆盖内置",
			addedWithId: "已新增「{name}」(自动生成 id: {id})",
			idLabel: "id",
			removed: "已删除条目",
			selectionCleaned: "已同步取消勾选",
			requiredHint: "名称 / 说明 / 用法为必填",
			catalogError: "用户目录 catalog.json 无法解析:新增与删除已停用,请先修复或移走该文件",
			catalogWarnings: "用户目录有 {n} 行无法使用(仍保留在文件里):新增与删除已停用,修好后才能编辑",
			errIdConflict: "该 id 已存在,请换一个名称",
			errBuiltinReadonly: "内置条目不可删除",
			errUnknownId: "条目不存在(可能已被删除)",
			errCatalogUnreadable: "用户目录文件无法解析,请先修复 catalog.json",
			errCatalogInvalid: "catalog.json 里有无法解析的行,请先修好或删除这些行(已阻止写入,避免丢数据)",
			errBadRequest: "请求参数不合法",
			addFailed: "新增失败",
			deleteFailed: "删除失败"
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
			refresh: "Refresh",
			usageLabel: "Usage",
			addEntry: "Add entry",
			addTitle: "Add entry",
			addHint: "Usage instructions only: what it is, when to use it, the first command. The panel writes user entries only (never overrides a built-in); tuning/troubleshooting detail belongs in the tool’s own docs.",
			fieldName: "Name",
			fieldNamePh: "Display name, e.g. ffmpeg (audio/video)",
			fieldDesc: "Description",
			fieldDescPh: "One line: what it is / when to use it (panel only, not injected)",
			fieldUsage: "Usage",
			fieldUsagePh: "Runnable command + prerequisites (injected on every request — keep it short)",
			fieldCategory: "Category",
			save: "Save",
			cancel: "Cancel",
			delete: "Delete",
			confirmDelete: "Confirm delete",
			readonlyHint: "Built-in entries cannot be deleted",
			builtinBadge: "Built-in",
			userBadge: "User",
			overrideBadge: "Overrides built-in",
			addedWithId: "Added “{name}” (auto-generated id: {id})",
			idLabel: "id",
			removed: "Entry deleted",
			selectionCleaned: "also unchecked",
			requiredHint: "Name, description and usage are required",
			catalogError: "User catalog.json is unreadable: add/remove are disabled until it is fixed or moved away",
			catalogWarnings: "{n} row(s) in the user catalog cannot be used (kept in the file); editing is disabled until they are fixed",
			errIdConflict: "That id already exists — choose another name",
			errBuiltinReadonly: "Built-in entries cannot be deleted",
			errUnknownId: "Entry not found (it may have been deleted)",
			errCatalogUnreadable: "User catalog.json is unreadable; fix it first",
			errCatalogInvalid: "catalog.json has unusable rows; fix or remove them first (writes are blocked to avoid data loss)",
			errBadRequest: "Invalid request",
			addFailed: "Add failed",
			deleteFailed: "Delete failed"
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
		*
		* The same panel is the inventory's editor: a user entry can be deleted
		* (inline confirmation; built-in rows are read-only), and the footer's
		* 「新增条目」 form adds one through the host's validated `add` endpoint
		* (catalog.json + backup + atomic rename on the host side).
		*/
		const EMPTY_DRAFT = {
			name: "",
			desc: "",
			usage: "",
			category: "misc"
		};
		/** Host error codes → panel dictionary keys. */
		const ERROR_KEYS = {
			"id-conflict": "errIdConflict",
			"builtin-readonly": "errBuiltinReadonly",
			"unknown-id": "errUnknownId",
			"catalog-unreadable": "errCatalogUnreadable",
			"catalog-invalid": "errCatalogInvalid",
			"bad-request": "errBadRequest",
			"gateway/bad-request": "errBadRequest"
		};
		function envelope(raw) {
			return raw ?? {};
		}
		/** Localized text for a failed envelope (falls back to the host message). */
		function errorText(res, t) {
			const key = res.error?.code !== void 0 ? ERROR_KEYS[res.error.code] : void 0;
			if (key !== void 0) return t(key);
			return res.error?.message ?? t("loadFailed");
		}
		function loadData(call) {
			return call("list", {}).then((raw) => {
				const r = envelope(raw);
				if (!r.ok || r.value === void 0 || !Array.isArray(r.value.catalog)) throw new Error(r.error?.message ?? "load failed");
				return {
					catalog: r.value.catalog,
					categoryLabels: r.value.categoryLabels ?? {},
					selected: Array.isArray(r.value.selected) ? r.value.selected : [],
					section: typeof r.value.section === "string" ? r.value.section : "",
					...typeof r.value.catalogError === "string" ? { catalogError: r.value.catalogError } : {},
					...Array.isArray(r.value.catalogWarnings) && r.value.catalogWarnings.length > 0 ? { catalogWarnings: r.value.catalogWarnings.filter((w) => typeof w === "string") } : {}
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
			const [notice, setNotice] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [filter, setFilter] = (0, react.useState)("all");
			const [formOpen, setFormOpen] = (0, react.useState)(false);
			const [draft, setDraft] = (0, react.useState)(EMPTY_DRAFT);
			const [pendingDelete, setPendingDelete] = (0, react.useState)(null);
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
				setNotice(null);
				try {
					const res = envelope(await call("set", { ids: next }));
					if (!res.ok) {
						setError(errorText(res, t));
						return;
					}
					await refresh();
				} catch {
					setError(t("loadFailed"));
				} finally {
					setBusy(false);
				}
			};
			const submit = async () => {
				if (busy) return;
				const payload = {
					name: draft.name.trim(),
					desc: draft.desc.trim(),
					usage: draft.usage.trim(),
					category: draft.category
				};
				if (payload.name === "" || payload.desc === "" || payload.usage === "") {
					setError(t("requiredHint"));
					return;
				}
				setBusy(true);
				setError(null);
				setNotice(null);
				try {
					const res = envelope(await call("add", payload));
					if (!res.ok || res.value === void 0) {
						setError(errorText(res, t));
						return;
					}
					setDraft(EMPTY_DRAFT);
					setFormOpen(false);
					setNotice(t("addedWithId").replace("{name}", payload.name).replace("{id}", res.value.id));
					await refresh();
				} catch {
					setError(t("addFailed"));
				} finally {
					setBusy(false);
				}
			};
			const remove = async (id) => {
				if (busy) return;
				setBusy(true);
				setError(null);
				setNotice(null);
				try {
					const res = envelope(await call("remove", { id }));
					if (!res.ok) {
						setError(errorText(res, t));
						return;
					}
					setPendingDelete(null);
					const extra = res.value?.selectionUpdated === true ? ` · ${t("selectionCleaned")}` : "";
					setNotice(`${t("removed")}${extra}`);
					await refresh();
				} catch {
					setError(t("deleteFailed"));
				} finally {
					setBusy(false);
				}
			};
			const categories = ["all", ...new Set((data?.catalog ?? []).map((entry) => entry.category))];
			const visible = data === null ? [] : filter === "all" ? data.catalog : data.catalog.filter((entry) => entry.category === filter);
			const categoryOptions = Object.keys(data?.categoryLabels ?? {});
			const catalogWarnings = data?.catalogWarnings ?? [];
			const readOnlyCatalog = data?.catalogError !== void 0 || catalogWarnings.length > 0;
			const canSubmit = !busy && !readOnlyCatalog && draft.name.trim() !== "" && draft.desc.trim() !== "" && draft.usage.trim() !== "";
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
							data?.catalogError !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dst_warn",
								children: t("catalogError")
							}) : null,
							catalogWarnings.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dst_warn",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: t("catalogWarnings").replace("{n}", String(catalogWarnings.length)) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: "dst_warnList",
									children: catalogWarnings.map((warning, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: warning }, `${index}-${warning}`))
								})]
							}) : null,
							error !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dst_error",
								children: error
							}) : null,
							notice !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dst_notice",
								children: notice
							}) : null,
							data !== null && visible.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dst_empty",
								children: t("empty")
							}) : null,
							data !== null ? visible.map((tool, rowIndex) => {
								const on = data.selected.includes(tool.id);
								const readonly = tool.readonly === true;
								const originBadge = tool.origin === "user" ? {
									cls: "dst_badgeUser",
									label: t("userBadge")
								} : tool.origin === "override" ? {
									cls: "dst_badgeOverride",
									label: t("overrideBadge")
								} : tool.origin === "builtin" ? {
									cls: "dst_badge",
									label: t("builtinBadge")
								} : null;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dst_tool",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "dst_toolText",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "dst_toolHeader",
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: "dst_toolName",
															children: tool.name
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: "dst_toolId",
															title: `${t("idLabel")}: ${tool.id}`,
															children: tool.id
														}),
														originBadge !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: originBadge.cls,
															children: originBadge.label
														}) : null,
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: "dst_badge",
															children: data.categoryLabels[tool.category] ?? tool.category
														})
													]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: "dst_toolDesc",
													children: tool.desc
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
													className: "dst_usage",
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("usageLabel") }), tool.usage]
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "dst_toolActions",
											children: readonly || readOnlyCatalog ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dst_del",
												disabled: true,
												title: t("readonlyHint"),
												children: t("delete")
											}) : pendingDelete === tool.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dst_del dst_delConfirm",
												disabled: busy,
												onClick: () => {
													remove(tool.id);
												},
												children: t("confirmDelete")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dst_del",
												disabled: busy,
												onClick: () => setPendingDelete(null),
												children: t("cancel")
											})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dst_del",
												disabled: busy,
												onClick: () => {
													setNotice(null);
													setError(null);
													setPendingDelete(tool.id);
												},
												children: t("delete")
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
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
										})
									]
								}, `${tool.id}-${rowIndex}`);
							}) : null
						]
					}),
					formOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dst_form",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dst_formTitle",
								children: t("addTitle")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dst_formHint",
								children: t("addHint")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dst_formGrid",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "dst_field",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("fieldName") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: "dst_input",
											value: draft.name,
											maxLength: 200,
											placeholder: t("fieldNamePh"),
											onChange: (event) => setDraft({
												...draft,
												name: event.target.value
											})
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "dst_field",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("fieldCategory") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
											className: "dst_input",
											value: draft.category,
											onChange: (event) => setDraft({
												...draft,
												category: event.target.value
											}),
											children: (categoryOptions.length > 0 ? categoryOptions : ["misc"]).map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: c,
												children: data?.categoryLabels[c] ?? c
											}, c))
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "dst_field dst_fieldWide",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("fieldDesc") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: "dst_input",
											value: draft.desc,
											maxLength: 1e3,
											placeholder: t("fieldDescPh"),
											onChange: (event) => setDraft({
												...draft,
												desc: event.target.value
											})
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "dst_field dst_fieldWide",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("fieldUsage") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
											className: "dst_input",
											value: draft.usage,
											maxLength: 2e3,
											rows: 4,
											placeholder: t("fieldUsagePh"),
											onChange: (event) => setDraft({
												...draft,
												usage: event.target.value
											})
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dst_formActions",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dst_footBtn",
									disabled: busy,
									onClick: () => {
										setFormOpen(false);
										setDraft(EMPTY_DRAFT);
										setError(null);
									},
									children: t("cancel")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dst_footBtn dst_footBtnPrimary",
									disabled: !canSubmit,
									onClick: () => void submit(),
									children: t("save")
								})]
							})
						]
					}) : null,
					data !== null && data.section !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: "dst_section",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("sectionLabel") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: "dst_sectionPre",
							children: data.section
						})]
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dst_foot",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dst_footBtn dst_footBtnPrimary",
							disabled: readOnlyCatalog,
							onClick: () => {
								setError(null);
								setNotice(null);
								setFormOpen((open) => !open);
							},
							children: t("addEntry")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dst_footBtn",
							onClick: refresh,
							children: t("refresh")
						})]
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