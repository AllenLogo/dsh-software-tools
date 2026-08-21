/** zh/en dictionaries for the software-tools panel. */
export const zh = {
  title: '软件工具',
  panelTitle: '软件工具',
  panelHint: '勾选的工具会注入当前会话的模型上下文(系统提示段落),模型即可按需调用。',
  category_all: '全部',
  selected: '已选',
  selectHint: '已勾选 {n} 个工具',
  sectionLabel: '注入段落预览',
  close: '关闭',
  loadFailed: '加载失败',
  empty: '暂无可选工具',
  refresh: '刷新',
} as const

export const en = {
  title: 'Software Tools',
  panelTitle: 'Software Tools',
  panelHint: 'Checked tools are injected into the model context (system prompt section) so the model can use them on demand.',
  category_all: 'All',
  selected: 'Selected',
  selectHint: '{n} tool(s) selected',
  sectionLabel: 'Injected section preview',
  close: 'Close',
  loadFailed: 'Failed to load',
  empty: 'No tools available',
  refresh: 'Refresh',
} as const
