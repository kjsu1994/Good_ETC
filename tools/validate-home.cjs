const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const homePath = path.join(rootDir, "home.html");
const html = fs.readFileSync(homePath, "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const scriptStart = html.indexOf("<script>");
const scriptEnd = html.lastIndexOf("</script>");
assert(
  scriptStart >= 0 && scriptEnd > scriptStart,
  "home.html must contain one script block.",
);

const markup = html.slice(0, scriptStart);
const script = html.slice(scriptStart + "<script>".length, scriptEnd);

function hasAttributeValue(attribute, value) {
  return new RegExp(
    `\\b${escapeRegExp(attribute)}="${escapeRegExp(value)}"(?=[\\s>])`,
  ).test(markup);
}

function hasId(id) {
  return hasAttributeValue("id", id);
}

new Function(script);

const markdownRuntimeStart = script.indexOf(
  "    let Ee = null;\n    function markdownSafeUrl",
);
const markdownRuntimeEnd = script.indexOf(
  "    const markdownInput =",
  markdownRuntimeStart,
);
assert(
  markdownRuntimeStart >= 0 && markdownRuntimeEnd > markdownRuntimeStart,
  "Markdown runtime block is missing.",
);
const markdownRuntimeSource = script.slice(
  markdownRuntimeStart,
  markdownRuntimeEnd,
);
const markdownEscapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
const { renderMarkdownOffline } = new Function(
  "Me",
  "window",
  "DOMPurify",
  `${markdownRuntimeSource}\nreturn { renderMarkdownOffline };`,
)(markdownEscapeHtml, {}, undefined);
const markdownFixture = renderMarkdownOffline(`# 제목

| 항목 | 상태 |
| --- | --- |
| 오프라인 | 완료 |

- [x] 작업 완료

<script>alert(1)</script>

[위험](javascript:alert(1))`);
assert(markdownFixture.includes("<h1>제목</h1>"), "Markdown heading failed.");
assert(markdownFixture.includes("<table>"), "Markdown table failed.");
assert(
  markdownFixture.includes('type="checkbox" disabled checked'),
  "Markdown task list failed.",
);
assert(
  markdownFixture.includes("&lt;script&gt;alert(1)&lt;/script&gt;"),
  "Markdown HTML escaping failed.",
);
assert(
  !markdownFixture.includes('href="javascript:'),
  "Unsafe Markdown URL allowed.",
);
[
  "clock",
  "xl",
  "x1o",
  "uiDock",
  "uiPanel",
  "uiMasterToggle",
  "masterToolToggle",
  "x2n",
  "charCodeToggle",
  "jsonToggle",
  "markdownToggle",
  "markdownPanel",
  "markdownHelp",
  "markdownEditMode",
  "markdownPreviewMode",
  "markdownFullscreen",
  "markdownEditView",
  "markdownInput",
  "markdownPreviewView",
  "markdownPreviewShell",
  "markdownFullscreenExit",
  "markdownPreview",
  "dateToggle",
  "regexToggle",
  "diffToggle",
  "textToolToggle",
  "wpfToggle",
  "logToggle",
  "gameToggle",
  "lanMasterToggle",
  "lanToolMenu",
  "lanCenterToggle",
  "lanDropToggle",
  "chatToggle",
  "lanCenterPanel",
  "lanName",
  "lanHost",
  "lanPort",
  "lanShareUrl",
  "lanConnect",
  "lanDisconnect",
  "lanCopyShare",
  "lanStatus",
  "lanRoomList",
  "lanPeerList",
  "lanDropPanel",
  "dropRoomName",
  "dropRoomPin",
  "dropRoomId",
  "dropShareUrl",
  "dropCreateRoom",
  "dropJoinRoom",
  "dropCopyShare",
  "dropStatus",
  "dropRoomSummary",
  "dropZone",
  "dropFileInput",
  "dropSendList",
  "dropReceiveList",
  "charCodePanel",
  "jsonPanel",
  "datePanel",
  "regexPanel",
  "diffPanel",
  "textToolPanel",
  "wpfPanel",
  "wpfHelp",
  "wpfTabBinding",
  "wpfTabResource",
  "wpfTabLayout",
  "wpfTabMvvm",
  "wpfTabProject",
  "wpfPaneBinding",
  "wpfPaneResource",
  "wpfPaneLayout",
  "wpfPaneMvvm",
  "wpfPaneProject",
  "wpfBindingInput",
  "wpfBindingAnalyze",
  "wpfBindingCopy",
  "wpfBindingDownload",
  "wpfBindingStats",
  "wpfBindingOutput",
  "wpfResourceInput",
  "wpfResourceAnalyze",
  "wpfResourceCopy",
  "wpfResourceDownload",
  "wpfResourceStats",
  "wpfResourceOutput",
  "wpfLayoutWidth",
  "wpfLayoutHeight",
  "wpfLayoutAuto",
  "wpfLayoutDpi",
  "wpfLayoutColumns",
  "wpfLayoutRows",
  "wpfLayoutRun",
  "wpfLayoutCopy",
  "wpfLayoutDownload",
  "wpfLayoutStats",
  "wpfLayoutOutput",
  "wpfSnippetClass",
  "wpfSnippetStyle",
  "wpfSnippetProperties",
  "wpfSnippetCommands",
  "wpfSnippetRun",
  "wpfSnippetCopy",
  "wpfSnippetDownload",
  "wpfSnippetStats",
  "wpfSnippetOutput",
  "wpfProjectInput",
  "wpfProjectRun",
  "wpfProjectCopy",
  "wpfProjectDownload",
  "wpfProjectStats",
  "wpfProjectOutput",
  "wpfClear",
  "logPanel",
  "gamePanel",
  "gameHelpButton",
  "gameTabArena",
  "gameTabFortress",
  "gameArenaPane",
  "gameFortressPane",
  "chatPanel",
  "section-search",
  "section-todo",
  "section-memo",
  "favAdd",
  "favEditMode",
  "favDeleteMode",
  "favSave",
  "favCancel",
  "favIconToggle",
  "favIconMenu",
  "favName",
  "favUrl",
  "favKey",
  "favIcon",
  "x2e",
  "x2m",
  "todoDue",
  "todoPriority",
  "todoHelp",
  "x2q",
  "ch",
  "x0",
  "memo",
  "x2d",
  "x2b",
  "x2c",
  "memoHelp",
  "memoSearchHits",
  "xn",
  "x1c",
  "xo",
  "x1p",
  "x2p",
  "x28",
  "xf",
  "x12",
  "x1f",
  "x2i",
  "x9",
  "x23",
  "x24",
  "x25",
  "textToolHelp",
  "textToolInput",
  "textToolRun",
  "textToolCopy",
  "textToolDownload",
  "textToolClear",
  "textToolStats",
  "textToolOutput",
  "gameHelp",
  "gameHost",
  "gamePort",
  "gameOpenServer",
  "gameOpenLocal",
  "gameOpenSolo",
  "gameRemoteIp",
  "gameRuleName",
  "gameFirewallCommand",
  "gameCopyFirewall",
  "gameDownloadFirewall",
  "gameStatus",
  "fortressHelp",
  "x2h",
  "x1i",
  "x1x",
  "x16",
  "x1g",
  "x17",
].forEach((id) => assert(hasId(id), `Missing required element id: ${id}`));

[
  "theme",
  "ui_prefs_v1",
  "ui_section_hidden_v1",
  "ui_custom_preset_v1",
  "collapsed_v5",
  "section_order_v5",
  "smart_todo_v5",
  "smart_memo_notes_v32",
  "smart_memo_active_v32",
  "ollama_chat_messages_v1",
  "markdown_viewer_draft_v1",
  "lan_socket_name_v1",
  "lan_socket_last_room_v1",
  "favorite_links_v1",
  "analysis_error_kb_v1",
  "analysis_log_input",
  "analysis_log_keyword",
  "analysis_pattern_keywords",
  "analysis_char_input",
  "analysis_hex_spec",
  "analysis_structured_input",
  "analysis_structured_search",
  "wpf_binding_input_v1",
  "wpf_resource_input_v1",
  "wpf_layout_columns_v1",
  "wpf_layout_rows_v1",
  "wpf_layout_width_v1",
  "wpf_layout_height_v1",
  "wpf_layout_auto_v1",
  "wpf_layout_dpi_v1",
  "wpf_project_input_v1",
  "wpf_snippet_class_v1",
  "wpf_snippet_style_v1",
  "wpf_snippet_properties_v1",
  "wpf_snippet_commands_v1",
  "analysis_log_",
  "analysis_pattern_",
  "analysis_timeline_",
].forEach((key) => assert(html.includes(key), `Missing storage key: ${key}`));

[
  ["data-sec", ["section-search", "section-todo", "section-memo"]],
  ["data-a", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg".split("")],
  ["data-c", ["D", "F", "h", "i", "j", "k"]],
  ["data-ui-theme", ["light", "dark"]],
  ["data-ui-accent", ["#4CAF50", "#2563eb", "#7c3aed", "#f97316", "#ef4444"]],
  ["data-ui-preset", ["default", "focus", "wide", "compact"]],
  ["data-ui-memo-mode", ["default", "wide", "focus"]],
  ["data-section-visible", ["section-search", "section-todo", "section-memo"]],
  [
    "data-help-target",
    [
      "todoHelp",
      "memoHelp",
      "textToolHelp",
      "wpfHelp",
      "gameHelp",
      "markdownHelp",
    ],
  ],
  ["data-game-tab", ["arena", "fortress"]],
  ["data-game-pane", ["arena", "fortress"]],
].forEach(([attribute, values]) => {
  values.forEach((value) =>
    assert(
      hasAttributeValue(attribute, value),
      `Missing ${attribute}="${value}"`,
    ),
  );
});

[
  'closest("[data-sec]")',
  'closest("[data-td]")',
  'closest("[data-copy]")',
  'closest("[data-a]")',
  'matches("[data-tt]")',
  'matches("[data-tp]")',
  'matches("[data-tdue]")',
  "e.target.dataset.c",
  "[data-command-index]",
  "[data-fav-icon]",
  "[data-help-target]",
  ".favorite-card",
  "todoClean",
  "memoMatches",
  "encodeBase64Text",
  "decodeBase64Text",
  "runTextTool",
  "textToolMode",
  "renderMarkdownOffline",
  "renderMarkdownHtml",
  "markdownEnterFullscreen",
].forEach((marker) =>
  assert(script.includes(marker), `Missing event wiring marker: ${marker}`),
);

[
  "Ct",
  "It",
  "linkStore",
  "linkDefaults",
  "linkClean",
  "linkLoad",
  "linkSaveAll",
  "linkRender",
  "linkBuildIconMenu",
].forEach((symbol) =>
  assert(
    !new RegExp(`\\b${escapeRegExp(symbol)}\\b`).test(script),
    `Stale favorite-link symbol remains: ${symbol}`,
  ),
);

console.log("home.html validation passed");
