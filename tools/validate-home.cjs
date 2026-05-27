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

function hasId(id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\bid="${escaped}"(?=[\\s>])`).test(html);
}

const scriptStart = html.indexOf("<script>");
const scriptEnd = html.lastIndexOf("</script>");
assert(
  scriptStart >= 0 && scriptEnd > scriptStart,
  "home.html must contain one script block.",
);

const script = html.slice(scriptStart + "<script>".length, scriptEnd);
new Function(script);

[
  "uiDock",
  "uiPanel",
  "masterToolToggle",
  "chatPanel",
  "section-search",
  "section-todo",
  "section-memo",
  "favAdd",
  "favEditMode",
  "favDeleteMode",
  "x2e",
  "x2m",
  "memo",
  "x2p",
  "x12",
  "x2i",
].forEach((id) => assert(hasId(id), `Missing required element id: ${id}`));

[
  "ui_prefs_v1",
  "ui_section_hidden_v1",
  "ui_custom_preset_v1",
  "collapsed_v5",
  "section_order_v5",
  "smart_todo_v5",
  "smart_memo_notes_v32",
  "smart_memo_active_v32",
  "ollama_chat_messages_v1",
  "favorite_links_v1",
  "analysis_error_kb_v1",
].forEach((key) => assert(html.includes(key), `Missing storage key: ${key}`));

console.log("home.html validation passed");
