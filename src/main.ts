import { invoke } from "@tauri-apps/api/core";
import "./styles.css";

type Language = "zh" | "en";
type RequestFormat = "images" | "responses";
type ConfigSource = "manual" | "codex";

type Settings = {
  language?: Language;
  base_url: string;
  api_key: string;
  config_source?: ConfigSource;
  request_format?: RequestFormat;
  model: string;
  size: string;
  quality: string;
  output_format: string;
  output_dir?: string;
};

type ImageItem = {
  id: string;
  prompt: string;
  revised_prompt?: string | null;
  model: string;
  size: string;
  quality: string;
  output_format: string;
  file_name: string;
  file_path: string;
  created_at: string;
  data_url: string;
};

type ReferenceImage = {
  name: string;
  mime_type: string;
  data_url: string;
};

type Notice = {
  type: "error" | "success" | "info";
  message: string;
};

type LocalCodexConfig = {
  found: boolean;
  api_key: string;
  base_url: string;
  model: string;
  source: string;
  message: string;
};

type GenerationStep = {
  phase: string;
  message: string;
  time: string;
};

type HistoryContextMenu = {
  id: string;
  x: number;
  y: number;
};

type CanvasImageEntry = {
  src: string;
  bitmap: HTMLImageElement;
  loaded: boolean;
};

type CanvasPan = {
  x: number;
  y: number;
};

type CanvasPanDrag = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  panX: number;
  panY: number;
  moved: boolean;
};

const defaultSettings: Settings = {
  language: "zh",
  base_url: "https://api.openai.com/v1",
  api_key: "",
  config_source: "manual",
  request_format: "images",
  model: "gpt-image-2",
  size: "1024x1024",
  quality: "auto",
  output_format: "png",
  output_dir: "",
};

const sizePresets = ["1024x1024", "2048x2048", "3072x3072", "4096x4096"];
const sizePresetLabels: Record<string, string> = {
  "1024x1024": "1K",
  "2048x2048": "2K",
  "3072x3072": "3K",
  "4096x4096": "4K",
};
const imageModelPresets = ["gpt-image-2", "gpt-image-1", "custom"];
const responseModelPresets = ["gpt-5.5", "custom"];
const baseUrlPresets = ["https://api.openai.com/v1", "https://api.openai.com/v1/images/generations", "https://api.openai.com/v1/images/edits", "custom"];
const qualityPresets = ["auto", "low", "medium", "high", "standard", "hd"];
const outputFormats = ["png", "webp", "jpeg"];

const copy = {
  zh: {
    appName: "GPT Image Local",
    newImage: "新图片",
    history: "历史生图",
    refresh: "刷新",
    imageGeneration: "图片生成",
    emptyTitle: "想让 GPT 生成什么图片？",
    emptyText: "输入提示词，必要时拖入参考图，然后开始生成。",
    promptPlaceholder: "描述你想生成或改造的图片",
    generate: "生成",
    generating: "正在作图",
    status: "生成状态",
    settings: "设置",
    autoSaved: "已自动应用",
    language: "语言",
    configSource: "配置来源",
    manualInput: "手动填写",
    localCodex: "本地 Codex",
    loadCodex: "重新读取",
    codexDetail: "本地配置详情",
    codexReady: "已读取到本地 API Key",
    codexMissing: "没有读取到本地 API Key",
    keyStatus: "Key 状态",
    found: "已找到",
    notFound: "未找到",
    source: "来源",
    basePreset: "地址预设",
    baseUrl: "Base URL",
    manualDetail: "手动配置",
    baseHint: "支持根地址或完整路径；根地址会自动补成图片或 Responses 路径。",
    apiKey: "API Key",
    getApiKey: "获取 key",
    requestFormat: "请求格式",
    model: "模型",
    size: "图片尺寸",
    custom: "自定义",
    width: "宽",
    height: "高",
    quality: "质量",
    format: "格式",
    outputFolder: "保存目录",
    defaultFolder: "默认本地目录",
    chooseFolder: "选择目录",
    clearFolder: "使用默认",
    openOutput: "打开资源目录",
    imageDetails: "图片详情",
    file: "文件",
    path: "路径",
    openFile: "打开图片位置",
    deleteImage: "删除图片",
    deletedImage: "图片已删除",
    confirmDelete: "确定删除这张历史图片吗？本地文件也会一起删除。",
    expandImage: "放大查看",
    close: "关闭",
    collapseStatus: "收起状态",
    expandStatus: "展开状态",
    dropTitle: "拖入图片做图生图",
    dropHint: "支持 PNG、JPG、WEBP；多图会作为编辑参考上传。",
    chooseImages: "选择图片",
    clearImages: "清空参考图",
    useCurrentImage: "使用当前图修改",
    editMode: "图生图",
    textMode: "文生图",
    needBase: "请先填写 Base URL。",
    needKey: "请先填写 API Key，或切换到本地 Codex 配置。",
    needPrompt: "请输入提示词。",
    generatingNotice: "正在生成图片...",
    savedAs: "图片已保存",
    outputSaved: "保存目录已更新。",
    outputDefault: "已切回默认保存目录。",
    loadingCodexOnlyDesktop: "只有桌面应用可以读取本地 Codex 配置。",
    openOnlyDesktop: "打开目录需要在桌面应用中使用。",
    browserGenerate: "浏览器预览不能稳定调用图片 API，请使用 Tauri 桌面应用。",
    selectImagesPreview: "浏览器预览已选择参考图。",
    unsupportedFile: "只支持图片文件。",
    tooManyRefs: "最多上传 8 张参考图。",
    startMessage: "准备生成请求...",
    useDefaultBase: "已套用地址预设。",
    liveHint: "设置会实时应用到下一次生成。",
    composing: "构思画面",
    uploadingRefs: "上传参考图",
    callingApi: "连接图片模型",
    savingLocal: "保存到本地",
  },
  en: {
    appName: "GPT Image Local",
    newImage: "New image",
    history: "History",
    refresh: "Refresh",
    imageGeneration: "Image generation",
    emptyTitle: "What image should GPT create?",
    emptyText: "Enter a prompt, optionally drop reference images, then generate.",
    promptPlaceholder: "Describe the image you want to create or edit",
    generate: "Generate",
    generating: "Creating",
    status: "Generation status",
    settings: "Settings",
    autoSaved: "Auto applied",
    language: "Language",
    configSource: "Config source",
    manualInput: "Manual input",
    localCodex: "Local Codex",
    loadCodex: "Reload",
    codexDetail: "Local config details",
    codexReady: "Local API key found",
    codexMissing: "No local API key found",
    keyStatus: "Key status",
    found: "Found",
    notFound: "Not found",
    source: "Source",
    basePreset: "Base preset",
    baseUrl: "Base URL",
    manualDetail: "Manual config",
    baseHint: "Root URLs and full paths are both supported. Root URLs are completed automatically.",
    apiKey: "API Key",
    getApiKey: "Get key",
    requestFormat: "Request format",
    model: "Model",
    size: "Image size",
    custom: "Custom",
    width: "Width",
    height: "Height",
    quality: "Quality",
    format: "Format",
    outputFolder: "Output folder",
    defaultFolder: "Default local folder",
    chooseFolder: "Choose folder",
    clearFolder: "Use default",
    openOutput: "Open resource folder",
    imageDetails: "Image details",
    file: "File",
    path: "Path",
    openFile: "Open image location",
    deleteImage: "Delete image",
    deletedImage: "Image deleted",
    confirmDelete: "Delete this image from history and local storage?",
    expandImage: "Expand image",
    close: "Close",
    collapseStatus: "Collapse status",
    expandStatus: "Expand status",
    dropTitle: "Drop images for image-to-image",
    dropHint: "PNG, JPG, and WEBP are supported. Multiple files are uploaded as edit references.",
    chooseImages: "Choose images",
    clearImages: "Clear references",
    useCurrentImage: "Use current image",
    editMode: "Image-to-image",
    textMode: "Text-to-image",
    needBase: "Base URL is required.",
    needKey: "API Key is required, unless you use local Codex config.",
    needPrompt: "Prompt is required.",
    generatingNotice: "Generating image...",
    savedAs: "Image saved",
    outputSaved: "Output folder saved.",
    outputDefault: "Using the default output folder.",
    loadingCodexOnlyDesktop: "Local Codex config can only be read in the desktop app.",
    openOnlyDesktop: "Opening folders is available in the desktop app.",
    browserGenerate: "Browser preview cannot call the image API reliably. Please use the Tauri desktop app.",
    selectImagesPreview: "Reference images selected in preview.",
    unsupportedFile: "Only image files are supported.",
    tooManyRefs: "Attach no more than 8 reference images.",
    startMessage: "Preparing generation request...",
    useDefaultBase: "Base URL preset applied.",
    liveHint: "Settings apply to the next generation automatically.",
    composing: "Composing scene",
    uploadingRefs: "Uploading references",
    callingApi: "Calling image model",
    savingLocal: "Saving locally",
  },
} satisfies Record<Language, Record<string, string>>;

let settings: Settings = { ...defaultSettings };
let images: ImageItem[] = [];
let selectedImageId = "";
let busy = false;
let notice: Notice | null = null;
let promptDraft = "";
let generationSteps: GenerationStep[] = [];
let referenceImages: ReferenceImage[] = [];
let dragActive = false;
let localCodexConfig: LocalCodexConfig | null = null;
let saveTimer: number | undefined;
let progressCollapsed = true;
let lightboxImageId = "";
let historyContextMenu: HistoryContextMenu | null = null;
let canvasZoomById: Record<string, number> = {};
let canvasPanById: Record<string, CanvasPan> = {};
let canvasImageCache = new Map<string, CanvasImageEntry>();
let activeCanvasPanDrag: CanvasPanDrag | null = null;
let suppressCanvasClickUntil = 0;
let canvasResizeTimer: number | undefined;

const isTauri = Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root not found");
const root = app;

function t(key: keyof typeof copy.zh) {
  return copy[settings.language || "zh"][key] || copy.zh[key] || key;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function maskSecret(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return t("notFound");
  if (trimmed.length <= 10) return "••••";
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(settings.language === "en" ? "en-US" : "zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function splitSize(size: string) {
  const match = /^(\d+)x(\d+)$/i.exec(size);
  return { width: match ? match[1] : "1024", height: match ? match[2] : "1024" };
}

function selectedSizeChoice(size: string) {
  return sizePresets.includes(size) ? size : "custom";
}

function formatSizeOption(size: string) {
  return sizePresetLabels[size] ? `${sizePresetLabels[size]} - ${size}` : size;
}

function modelPresetsFor(format: RequestFormat) {
  return format === "responses" ? responseModelPresets : imageModelPresets;
}

function defaultModelForFormat(format: RequestFormat) {
  return format === "responses" ? "gpt-5.5" : "gpt-image-2";
}

function normalizeModelForFormat(model: string, format: RequestFormat) {
  const value = model.trim();
  if (!value) return defaultModelForFormat(format);
  if (format === "responses" && value.startsWith("gpt-image")) return "gpt-5.5";
  if (format === "images" && value === "gpt-5.5") return "gpt-image-2";
  return value;
}

function selectedModelChoice(model: string, format: RequestFormat) {
  const presets = modelPresetsFor(format);
  return presets.includes(model) ? model : "custom";
}

function selectedBaseChoice(baseUrl: string) {
  return baseUrlPresets.includes(baseUrl) ? baseUrl : "custom";
}

function selectedImage() {
  return images.find((image) => image.id === selectedImageId) ?? images[0];
}

function openHistoryContextMenu(event: MouseEvent, id: string) {
  if (!id) return;
  const menuWidth = 210;
  const menuHeight = 104;
  selectedImageId = id;
  historyContextMenu = {
    id,
    x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
    y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)),
  };
  render();
}

function normalizeSettings(value: Settings): Settings {
  const requestFormat = (value.request_format || defaultSettings.request_format) as RequestFormat;
  const normalized = {
    ...defaultSettings,
    ...value,
    language: value.language || defaultSettings.language,
    config_source: value.config_source || defaultSettings.config_source,
    request_format: requestFormat,
  };
  return {
    ...normalized,
    model: normalizeModelForFormat(normalized.model, normalized.request_format as RequestFormat),
  };
}

function showNotice(type: Notice["type"], message: string) {
  notice = { type, message };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri) return browserFallback<T>(command, args);
  return invoke<T>(command, args);
}

async function browserFallback<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (command === "load_settings") {
    const raw = localStorage.getItem("gpt-image-local-settings");
    return normalizeSettings(raw ? JSON.parse(raw) : defaultSettings) as T;
  }
  if (command === "save_settings") {
    localStorage.setItem("gpt-image-local-settings", JSON.stringify(args?.settings));
    return undefined as T;
  }
  if (command === "list_images") {
    const raw = localStorage.getItem("gpt-image-local-gallery");
    return (raw ? JSON.parse(raw) : []) as T;
  }
  if (command === "load_local_codex_config") {
    return {
      found: false,
      api_key: "",
      base_url: defaultSettings.base_url,
      model: defaultSettings.model,
      source: "browser preview",
      message: t("loadingCodexOnlyDesktop"),
    } as T;
  }
  if (command === "generate_image") throw new Error(t("browserGenerate"));
  if (command === "get_output_dir") return (settings.output_dir || "") as T;
  if (command === "read_reference_images") throw new Error(t("loadingCodexOnlyDesktop"));
  if (command === "open_external_url") {
    window.open(String(args?.url || ""), "_blank", "noopener,noreferrer");
    return undefined as T;
  }
  if (command === "delete_image") {
    const raw = localStorage.getItem("gpt-image-local-gallery");
    const current = raw ? JSON.parse(raw) as ImageItem[] : [];
    localStorage.setItem("gpt-image-local-gallery", JSON.stringify(current.filter((image) => image.id !== args?.id)));
    return undefined as T;
  }
  if (command === "open_file_location" || command === "open_output_dir") {
    showNotice("info", t("openOnlyDesktop"));
    return undefined as T;
  }
  throw new Error(`Unknown command: ${command}`);
}

function renderSelectOptions(values: string[], selected: string, formatter = (value: string) => value) {
  return values.map((value) => `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(formatter(value))}</option>`).join("");
}

function renderLanguageSwitch() {
  return `
    <label class="language-switch" for="language-switch">
      <span>${t("language")}</span>
      <select id="language-switch" name="language-switch">
        <option value="zh" ${settings.language !== "en" ? "selected" : ""}>中文</option>
        <option value="en" ${settings.language === "en" ? "selected" : ""}>English</option>
      </select>
    </label>
  `;
}

function renderConfigSourcePicker() {
  return `
    <div class="source-picker" role="group" aria-label="${t("configSource")}">
      <button type="button" class="${settings.config_source !== "codex" ? "active" : ""}" data-source="manual">${t("manualInput")}</button>
      <button type="button" class="${settings.config_source === "codex" ? "active" : ""}" data-source="codex">${t("localCodex")}</button>
    </div>
  `;
}

function renderManualConfig() {
  const baseChoice = selectedBaseChoice(settings.base_url);
  return `
    <section class="settings-card">
      <div class="card-title">
        <h3>${t("manualDetail")}</h3>
        <span>${settings.config_source !== "codex" ? t("autoSaved") : ""}</span>
      </div>
      <label class="field" for="base_preset">
        <span>${t("basePreset")}</span>
        <select id="base_preset" name="base_preset">
          ${renderSelectOptions(baseUrlPresets, baseChoice, (value) => value === "custom" ? t("custom") : value)}
        </select>
      </label>
      <label class="field" for="base_url">
        <span>${t("baseUrl")}</span>
        <input id="base_url" name="base_url" value="${escapeHtml(settings.base_url)}" placeholder="https://api.openai.com/v1" autocomplete="off" />
        <small>${t("baseHint")}</small>
      </label>
      <label class="field" for="api_key">
        <span class="field-title">
          ${t("apiKey")}
          <button class="key-help" type="button" data-open-key-url title="${t("getApiKey")}" aria-label="${t("getApiKey")}">?</button>
        </span>
        <input id="api_key" name="api_key" value="${escapeHtml(settings.api_key)}" placeholder="sk-..." type="password" autocomplete="off" />
      </label>
    </section>
  `;
}

function renderCodexConfig() {
  const local = localCodexConfig;
  return `
    <section class="settings-card codex-card">
      <div class="card-title">
        <h3>${t("codexDetail")}</h3>
        <button id="load-codex-config" type="button">${t("loadCodex")}</button>
      </div>
      <div class="config-summary ${local?.found ? "ready" : "missing"}">
        <strong>${local?.found ? t("codexReady") : t("codexMissing")}</strong>
        <span>${local?.message || t("loadingCodexOnlyDesktop")}</span>
      </div>
      <dl class="config-dl">
        <div><dt>${t("baseUrl")}</dt><dd>${escapeHtml(local?.base_url || defaultSettings.base_url)}</dd></div>
        <div><dt>${t("apiKey")}</dt><dd>${escapeHtml(maskSecret(local?.api_key || ""))}</dd></div>
        <div><dt>${t("model")}</dt><dd>${escapeHtml(local?.model || defaultSettings.model)}</dd></div>
        <div><dt>${t("source")}</dt><dd>${escapeHtml(local?.source || t("notFound"))}</dd></div>
      </dl>
    </section>
  `;
}

function renderGenerationSettings() {
  const sizeChoice = selectedSizeChoice(settings.size);
  const requestFormat = (settings.request_format || defaultSettings.request_format) as RequestFormat;
  const model = normalizeModelForFormat(settings.model, requestFormat);
  const modelChoice = selectedModelChoice(model, requestFormat);
  const modelPresets = modelPresetsFor(requestFormat);
  const { width, height } = splitSize(settings.size);
  return `
    <section class="settings-card">
      <div class="card-title">
        <h3>${t("imageGeneration")}</h3>
        <span>${referenceImages.length ? t("editMode") : t("textMode")}</span>
      </div>
      <div class="field-row">
        <label class="field" for="request_format">
          <span>${t("requestFormat")}</span>
          <select id="request_format" name="request_format">
            <option value="images" ${settings.request_format === "images" ? "selected" : ""}>OpenAI Images</option>
            <option value="responses" ${settings.request_format === "responses" ? "selected" : ""}>Responses / 5.5</option>
          </select>
        </label>
        <label class="field" for="model_choice">
          <span>${t("model")}</span>
          <select id="model_choice" name="model_choice">
            ${renderSelectOptions(modelPresets, modelChoice, (value) => value === "custom" ? t("custom") : value)}
          </select>
        </label>
      </div>
      <label class="field ${modelChoice === "custom" ? "" : "is-hidden"}" for="model">
        <span>${t("model")}</span>
        <input id="model" name="model" value="${escapeHtml(model)}" placeholder="${defaultModelForFormat(requestFormat)}" autocomplete="off" />
      </label>
      <label class="field" for="size_choice">
        <span>${t("size")}</span>
        <select id="size_choice" name="size_choice">
          ${renderSelectOptions(sizePresets, sizeChoice, formatSizeOption)}
          <option value="custom" ${sizeChoice === "custom" ? "selected" : ""}>${t("custom")}</option>
        </select>
      </label>
      <div class="size-grid ${sizeChoice === "custom" ? "" : "is-muted"}">
        <label class="field" for="custom_width">
          <span>${t("width")}</span>
          <input id="custom_width" name="custom_width" value="${escapeHtml(width)}" inputmode="numeric" />
        </label>
        <label class="field" for="custom_height">
          <span>${t("height")}</span>
          <input id="custom_height" name="custom_height" value="${escapeHtml(height)}" inputmode="numeric" />
        </label>
      </div>
      <div class="field-row">
        <label class="field" for="quality">
          <span>${t("quality")}</span>
          <select id="quality" name="quality">${renderSelectOptions(qualityPresets, settings.quality)}</select>
        </label>
        <label class="field" for="output_format">
          <span>${t("format")}</span>
          <select id="output_format" name="output_format">${renderSelectOptions(outputFormats, settings.output_format, (value) => value.toUpperCase())}</select>
        </label>
      </div>
    </section>
  `;
}

function renderOutputSettings() {
  return `
    <section class="settings-card">
      <div class="card-title"><h3>${t("outputFolder")}</h3></div>
      <label class="field" for="output_dir">
        <span>${t("path")}</span>
        <input id="output_dir" name="output_dir" value="${escapeHtml(settings.output_dir || "")}" placeholder="${t("defaultFolder")}" autocomplete="off" />
      </label>
      <div class="button-row">
        <button id="choose-output-dir" type="button">${t("chooseFolder")}</button>
        <button id="clear-output-dir" type="button">${t("clearFolder")}</button>
      </div>
      <button id="open-output-dir" type="button">${t("openOutput")}</button>
    </section>
  `;
}

function renderImageDetailPanel(detail?: ImageItem) {
  if (!detail) return "";
  return `
    <section class="detail">
      <div class="detail-body">
        <h2>${t("imageDetails")}</h2>
        <p>${escapeHtml(detail.prompt)}</p>
        ${detail.revised_prompt ? `<p class="muted">${escapeHtml(detail.revised_prompt)}</p>` : ""}
        <dl>
          <div><dt>${t("file")}</dt><dd>${escapeHtml(detail.file_name)}</dd></div>
          <div><dt>${t("model")}</dt><dd>${escapeHtml(detail.model)}</dd></div>
          <div><dt>${t("size")}</dt><dd>${escapeHtml(detail.size)}</dd></div>
          <div><dt>${t("path")}</dt><dd>${escapeHtml(detail.file_path)}</dd></div>
        </dl>
        <button class="primary" type="button" data-open-location="${detail.id}">${t("openFile")}</button>
      </div>
    </section>
  `;
}

function renderSettingsPanel(detail?: ImageItem) {
  return `
    <form id="settings-form" class="settings-panel">
      <div class="panel-title">
        <div>
          <h2>${t("settings")}</h2>
          <p>${t("liveHint")}</p>
        </div>
        <div class="panel-actions">
          ${renderLanguageSwitch()}
          <span>${t("autoSaved")}</span>
        </div>
      </div>
      <div class="settings-scroll">
        ${renderConfigSourcePicker()}
        ${settings.config_source === "codex" ? renderCodexConfig() : renderManualConfig()}
        ${renderGenerationSettings()}
        ${renderOutputSettings()}
        ${renderImageDetailPanel(detail)}
      </div>
    </form>
  `;
}

function renderReferencePanel() {
  return `
    <section id="drop-zone" class="drop-zone ${dragActive ? "is-dragging" : ""} ${referenceImages.length ? "has-files" : ""}">
      <div class="drop-copy">
        <strong>${t("dropTitle")}</strong>
        <span>${t("dropHint")}</span>
      </div>
      <div class="drop-actions">
        <label class="file-button reference-file-input">
          ${t("chooseImages")}
          <input id="reference-file" type="file" accept="image/*" multiple />
        </label>
        <button id="choose-reference-images" type="button">${t("chooseImages")}</button>
        ${referenceImages.length ? `<button id="clear-reference-images" type="button">${t("clearImages")}</button>` : ""}
      </div>
      ${
        referenceImages.length
          ? `<div class="reference-strip">
              ${referenceImages.map((image, index) => `
                <figure>
                  <img src="${image.data_url}" alt="${escapeHtml(image.name)}" />
                  <figcaption>${escapeHtml(image.name)}</figcaption>
                  <button type="button" data-remove-ref="${index}" title="Remove">x</button>
                </figure>
              `).join("")}
            </div>`
          : ""
      }
    </section>
  `;
}

function renderGeneratingVisual() {
  if (!busy) return "";
  const activeIndex = Math.min(3, Math.max(0, generationSteps.length - 1));
  const labels = [t("composing"), referenceImages.length ? t("uploadingRefs") : t("callingApi"), t("callingApi"), t("savingLocal")];
  return `
    <article class="generation-loader">
      <div class="loader-canvas" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
        <div class="loader-glow"></div>
      </div>
      <div class="loader-copy">
        <h2>${t("generating")}</h2>
        <p>${escapeHtml(generationSteps[generationSteps.length - 1]?.message || t("startMessage"))}</p>
        <div class="loader-steps">
          ${labels.map((label, index) => `<b class="${index <= activeIndex ? "active" : ""}">${escapeHtml(label)}</b>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function renderProgressPanel() {
  if (!busy || !generationSteps.length) return "";
  const current = generationSteps[generationSteps.length - 1];
  return `
    <section class="progress-panel ${busy ? "is-running" : ""} ${progressCollapsed ? "is-collapsed" : ""}">
      <div class="progress-head">
        <div class="pulse-ring"><span></span></div>
        <div>
          <h2>${t("status")}</h2>
          <p>${escapeHtml(current?.message || t("startMessage"))}</p>
        </div>
        <button id="toggle-progress" type="button">${progressCollapsed ? t("expandStatus") : t("collapseStatus")}</button>
      </div>
      <div class="progress-track"><span style="width: ${busy ? Math.min(88, 18 + generationSteps.length * 12) : 100}%"></span></div>
      <div class="progress-log" ${progressCollapsed ? "hidden" : ""}>
        ${generationSteps.map((step) => `
          <div class="progress-row">
            <span>${escapeHtml(step.time)}</span>
            <strong>${escapeHtml(step.phase)}</strong>
            <p>${escapeHtml(step.message)}</p>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderHistory() {
  return `
    <div class="history-title">
      <span>${t("history")}</span>
      <strong>${images.length}</strong>
    </div>
    <div class="nav-list">
      ${images.slice(0, 24).map((image) => `
        <button type="button" class="history-link ${image.id === selectedImageId ? "active" : ""}" draggable="true" data-drag-image="${image.id}" data-id="${image.id}">
          <img src="${image.data_url}" alt="" />
          <span>${escapeHtml(image.prompt || image.file_name)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderMainImage(detail?: ImageItem) {
  if (!detail) {
    return !busy
      ? `<div class="empty-state">
          <h2>${t("emptyTitle")}</h2>
          <p>${t("emptyText")}</p>
        </div>`
      : "";
  }

  return `
    <article class="focus-card">
      <div class="focus-media-wrap">
        <button class="focus-media" type="button" data-zoom="${detail.id}" title="${t("expandImage")}">
          <canvas class="image-canvas" data-canvas-image="${detail.id}" aria-label="${escapeHtml(detail.prompt)}"></canvas>
        </button>
        <div class="focus-footer">
          <p class="focus-info">${escapeHtml(detail.prompt)} - ${escapeHtml(detail.size)} - ${escapeHtml(detail.output_format.toUpperCase())} - ${formatDate(detail.created_at)}</p>
          <button type="button" class="focus-use-current" data-use-current="${detail.id}">${t("useCurrentImage")}</button>
        </div>
      </div>
    </article>
  `;
}

function renderLightbox() {
  const image = images.find((item) => item.id === lightboxImageId);
  if (!image) return "";
  return `
    <div class="lightbox" role="dialog" aria-modal="true">
      <button class="lightbox-backdrop" type="button" data-close-lightbox></button>
      <figure class="lightbox-panel">
        <button class="lightbox-close" type="button" data-close-lightbox>${t("close")}</button>
        <img src="${image.data_url}" alt="${escapeHtml(image.prompt)}" />
        <figcaption>${escapeHtml(image.prompt)}</figcaption>
      </figure>
    </div>
  `;
}

function renderHistoryContextMenu() {
  if (!historyContextMenu || !images.some((image) => image.id === historyContextMenu?.id)) return "";
  return `
    <div class="history-menu" style="left: ${historyContextMenu.x}px; top: ${historyContextMenu.y}px;">
      <button type="button" data-history-open-location="${historyContextMenu.id}">${t("openFile")}</button>
      <button type="button" class="danger" data-history-delete="${historyContextMenu.id}">${t("deleteImage")}</button>
    </div>
  `;
}

function canvasZoom(id: string) {
  return canvasZoomById[id] || 1;
}

function setCanvasZoom(id: string, nextZoom: number) {
  canvasZoomById[id] = Math.min(4, Math.max(1, nextZoom));
  drawCanvasImage(id);
}

function canvasPan(id: string) {
  return canvasPanById[id] || { x: 0, y: 0 };
}

function clampCanvasPan(pan: CanvasPan, imageWidth: number, imageHeight: number, canvasWidth: number, canvasHeight: number) {
  const maxX = Math.max(0, (imageWidth - canvasWidth) / 2);
  const maxY = Math.max(0, (imageHeight - canvasHeight) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}

function setCanvasPan(id: string, nextPan: CanvasPan) {
  canvasPanById[id] = nextPan;
  drawCanvasImage(id);
}

function resetCanvasView(id: string) {
  canvasZoomById[id] = 1;
  canvasPanById[id] = { x: 0, y: 0 };
  drawCanvasImage(id);
}

function canvasImageEntry(image: ImageItem) {
  const cached = canvasImageCache.get(image.id);
  if (cached?.src === image.data_url) return cached;

  const entry: CanvasImageEntry = {
    src: image.data_url,
    bitmap: new Image(),
    loaded: false,
  };
  entry.bitmap.decoding = "async";
  entry.bitmap.onload = () => {
    entry.loaded = true;
    drawCanvasImage(image.id);
  };
  entry.bitmap.src = image.data_url;
  canvasImageCache.set(image.id, entry);
  return entry;
}

function pruneCanvasImageCache() {
  const ids = new Set(images.map((image) => image.id));
  canvasImageCache.forEach((_, id) => {
    if (!ids.has(id)) canvasImageCache.delete(id);
  });
  Object.keys(canvasPanById).forEach((id) => {
    if (!ids.has(id)) delete canvasPanById[id];
  });
  Object.keys(canvasZoomById).forEach((id) => {
    if (!ids.has(id)) delete canvasZoomById[id];
  });
}

function drawCanvasImages() {
  document.querySelectorAll<HTMLCanvasElement>("[data-canvas-image]").forEach((canvas) => {
    drawCanvasImage(canvas.dataset.canvasImage || "");
  });
}

function drawCanvasImage(id: string) {
  if (!id) return;
  const canvas = document.querySelector<HTMLCanvasElement>(`[data-canvas-image="${CSS.escape(id)}"]`);
  const image = images.find((item) => item.id === id);
  if (!canvas || !image) return;

  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = window.devicePixelRatio || 1;
  const widthPx = Math.round(rect.width * ratio);
  const heightPx = Math.round(rect.height * ratio);
  if (canvas.width !== widthPx) canvas.width = widthPx;
  if (canvas.height !== heightPx) canvas.height = heightPx;

  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  const entry = canvasImageEntry(image);
  if (!entry.loaded || !entry.bitmap.naturalWidth || !entry.bitmap.naturalHeight) {
    context.clearRect(0, 0, rect.width, rect.height);
    return;
  }

  const bitmap = entry.bitmap;
  const baseScale = Math.min(rect.width / bitmap.naturalWidth, rect.height / bitmap.naturalHeight);
  const scale = baseScale * canvasZoom(id);
  const width = bitmap.naturalWidth * scale;
  const height = bitmap.naturalHeight * scale;
  const pan = clampCanvasPan(canvasPan(id), width, height, rect.width, rect.height);
  canvasPanById[id] = pan;
  const x = (rect.width - width) / 2 + pan.x;
  const y = (rect.height - height) / 2 + pan.y;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.clearRect(0, 0, rect.width, rect.height);
  context.drawImage(bitmap, x, y, width, height);
}

function render() {
  const detail = selectedImage();
  const modeLabel = referenceImages.length ? t("editMode") : t("textMode");

  root.innerHTML = `
    <section class="app-shell">
      <aside class="nav">
        <div class="brand">
          <span class="brand-mark">GI</span>
          <span>${t("appName")}</span>
        </div>
        <button id="new-prompt" class="nav-action" type="button">${t("newImage")}</button>
        ${renderHistory()}
      </aside>

      <main class="chat">
        <header class="topbar">
          <div class="topbar-titleblock">
            <h1>${t("imageGeneration")}</h1>
            <div class="topbar-meta">
              <span>${modeLabel}</span>
              <span>${settings.request_format === "responses" ? "Responses / 5.5" : "OpenAI Images"}</span>
              <span>${escapeHtml(settings.model)}</span>
            </div>
          </div>
          <div class="topbar-actions">
            <button id="refresh" type="button">${t("refresh")}</button>
          </div>
        </header>

        ${notice ? `
          <div class="notice ${notice.type}" role="status">
            <span>${escapeHtml(notice.message)}</span>
            <button class="notice-close" type="button" data-close-notice aria-label="${t("close")}">&times;</button>
          </div>
        ` : ""}
        ${renderProgressPanel()}

        <section class="conversation">
          ${renderGeneratingVisual()}
          ${renderMainImage(detail)}
        </section>

        <form id="generate-form" class="composer">
          <div class="composer-shell">
            ${renderReferencePanel()}
            <textarea name="prompt" placeholder="${t("promptPlaceholder")}">${escapeHtml(promptDraft)}</textarea>
            <div class="composer-bar">
              <span>${modeLabel} - ${escapeHtml(settings.size)} - ${escapeHtml(settings.output_format.toUpperCase())}</span>
              <button id="generate-button" class="primary" type="button" ${busy ? "disabled" : ""}>
                ${busy ? `<span class="mini-spinner"></span>${t("generating")}` : t("generate")}
              </button>
            </div>
          </div>
        </form>
      </main>

      <aside class="inspector">
        ${renderSettingsPanel(detail)}
      </aside>
    </section>
    ${renderLightbox()}
    ${renderHistoryContextMenu()}
  `;

  bindEvents();
  requestAnimationFrame(drawCanvasImages);
}

function bindEvents() {
  document.querySelector<HTMLFormElement>("#settings-form")?.addEventListener("submit", (event) => event.preventDefault());
  document.querySelector<HTMLFormElement>("#generate-form")?.addEventListener("submit", generateImage);
  document.querySelector<HTMLButtonElement>("#generate-button")?.addEventListener("click", generateImage);
  document.querySelector<HTMLTextAreaElement>("#generate-form textarea")?.addEventListener("input", (event) => {
    promptDraft = (event.currentTarget as HTMLTextAreaElement).value;
  });
  document.querySelector<HTMLButtonElement>("[data-close-notice]")?.addEventListener("click", () => {
    notice = null;
    render();
  });
  document.querySelector<HTMLButtonElement>("#refresh")?.addEventListener("click", loadImages);
  document.querySelector<HTMLButtonElement>("#new-prompt")?.addEventListener("click", focusPrompt);
  document.querySelector<HTMLButtonElement>("#choose-output-dir")?.addEventListener("click", chooseOutputDir);
  document.querySelector<HTMLButtonElement>("#clear-output-dir")?.addEventListener("click", clearOutputDir);
  document.querySelector<HTMLButtonElement>("#open-output-dir")?.addEventListener("click", openOutputDir);
  document.querySelector<HTMLButtonElement>("#load-codex-config")?.addEventListener("click", () => refreshLocalCodexConfig(true));
  document.querySelector<HTMLButtonElement>("[data-open-key-url]")?.addEventListener("click", async () => {
    try {
      await call<void>("open_external_url", { url: "https://zorapi.xyz/" });
    } catch (error) {
      showNotice("error", errorMessage(error));
      render();
    }
  });
  document.querySelector<HTMLButtonElement>("#toggle-progress")?.addEventListener("click", () => {
    progressCollapsed = !progressCollapsed;
    render();
  });
  document.querySelector<HTMLSelectElement>("#language-switch")?.addEventListener("change", async (event) => {
    settings.language = (event.currentTarget as HTMLSelectElement).value as Language;
    await saveSettingsNow();
    render();
  });
  document.querySelectorAll<HTMLButtonElement>("[data-source]").forEach((button) => {
    button.addEventListener("click", async () => {
      settings = { ...(await currentFormSettings()), config_source: (button.dataset.source || "manual") as ConfigSource };
      await saveSettingsNow();
      if (settings.config_source === "codex" && !localCodexConfig) await refreshLocalCodexConfig(false);
      render();
    });
  });
  bindSettingsAutoSave();
  document.querySelectorAll<HTMLButtonElement>(".image-pick, .history-link").forEach((button) => {
    button.addEventListener("click", () => {
      selectedImageId = button.dataset.id || "";
      historyContextMenu = null;
      render();
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openHistoryContextMenu(event, button.dataset.id || "");
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-history-open-location]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.historyOpenLocation || "";
      historyContextMenu = null;
      await openFileLocation(id);
      render();
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-history-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.historyDelete || "";
      historyContextMenu = null;
      render();
      await deleteImage(id);
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      if (Date.now() < suppressCanvasClickUntil) return;
      lightboxImageId = button.dataset.zoom || "";
      render();
    });
  });
  document.querySelectorAll<HTMLCanvasElement>("[data-canvas-image]").forEach((canvas) => {
    canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const id = canvas.dataset.canvasImage || "";
      const pan = canvasPan(id);
      activeCanvasPanDrag = {
        id,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX: pan.x,
        panY: pan.y,
        moved: false,
      };
      canvas.classList.add("is-panning");
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!activeCanvasPanDrag || activeCanvasPanDrag.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - activeCanvasPanDrag.startX;
      const deltaY = event.clientY - activeCanvasPanDrag.startY;
      if (!activeCanvasPanDrag.moved && Math.hypot(deltaX, deltaY) < 4) return;
      activeCanvasPanDrag.moved = true;
      event.preventDefault();
      event.stopPropagation();
      suppressCanvasClickUntil = Date.now() + 250;
      setCanvasPan(activeCanvasPanDrag.id, {
        x: activeCanvasPanDrag.panX + deltaX,
        y: activeCanvasPanDrag.panY + deltaY,
      });
    });
    canvas.addEventListener("pointerup", (event) => {
      if (!activeCanvasPanDrag || activeCanvasPanDrag.pointerId !== event.pointerId) return;
      if (activeCanvasPanDrag.moved) suppressCanvasClickUntil = Date.now() + 350;
      activeCanvasPanDrag = null;
      canvas.classList.remove("is-panning");
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointercancel", (event) => {
      if (!activeCanvasPanDrag || activeCanvasPanDrag.pointerId !== event.pointerId) return;
      activeCanvasPanDrag = null;
      canvas.classList.remove("is-panning");
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = canvas.dataset.canvasImage || "";
      const direction = event.deltaY < 0 ? 1.12 : 0.88;
      setCanvasZoom(id, canvasZoom(id) * direction);
    }, { passive: false });
    canvas.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      suppressCanvasClickUntil = Date.now() + 350;
      resetCanvasView(canvas.dataset.canvasImage || "");
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-close-lightbox]").forEach((button) => {
    button.addEventListener("click", () => {
      lightboxImageId = "";
      render();
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-open-location]").forEach((button) => {
    button.addEventListener("click", () => openFileLocation(button.dataset.openLocation || ""));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-use-current]").forEach((button) => {
    button.addEventListener("click", async () => {
      await addGeneratedImageReference(button.dataset.useCurrent || "");
    });
  });
  document.querySelector<HTMLInputElement>("#reference-file")?.addEventListener("change", async (event) => {
    await addReferenceFiles((event.currentTarget as HTMLInputElement).files);
  });
  document.querySelector<HTMLButtonElement>("#choose-reference-images")?.addEventListener("click", chooseReferenceImages);
  document.querySelector<HTMLButtonElement>("#clear-reference-images")?.addEventListener("click", () => {
    referenceImages = [];
    render();
  });
  document.querySelectorAll<HTMLButtonElement>("[data-remove-ref]").forEach((button) => {
    button.addEventListener("click", () => {
      referenceImages = referenceImages.filter((_, index) => index !== Number(button.dataset.removeRef));
      render();
    });
  });
  document.querySelectorAll<HTMLElement>("[data-drag-image]").forEach((element) => {
    element.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("application/x-gpt-image-id", element.dataset.dragImage || "");
      event.dataTransfer?.setData("text/plain", element.dataset.dragImage || "");
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
    });
  });
  const dropZone = document.querySelector<HTMLElement>("#drop-zone");
  dropZone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    if (!dragActive) {
      dragActive = true;
      dropZone.classList.add("is-dragging");
    }
  });
  dropZone?.addEventListener("dragleave", () => {
    dragActive = false;
    dropZone.classList.remove("is-dragging");
  });
  dropZone?.addEventListener("drop", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragActive = false;
    dropZone.classList.remove("is-dragging");
    await addReferenceDrop(event.dataTransfer);
  });
}

function bindSettingsAutoSave() {
  const form = document.querySelector<HTMLFormElement>("#settings-form");
  if (!form) return;
  form.querySelector<HTMLInputElement>("#base_url")?.addEventListener("input", () => {
    const preset = form.querySelector<HTMLSelectElement>("#base_preset");
    if (preset) preset.value = "custom";
  });
  form.addEventListener("input", () => {
    scheduleSettingsSave(false);
  });
  form.addEventListener("change", async (event) => {
    const target = event.target as HTMLElement;
    if (target.id === "base_preset") {
      const value = (target as HTMLSelectElement).value;
      if (value !== "custom") {
        const input = form.querySelector<HTMLInputElement>("#base_url");
        if (input) input.value = value;
        showNotice("info", t("useDefaultBase"));
      }
    }
    await scheduleSettingsSave(true);
  });
}

async function currentFormSettings() {
  const formElement = document.querySelector<HTMLFormElement>("#settings-form");
  if (!formElement) return settings;
  const form = new FormData(formElement);
  const sizeChoice = String(form.get("size_choice") || settings.size);
  const requestFormat = String(form.get("request_format") || settings.request_format || defaultSettings.request_format) as RequestFormat;
  const currentModel = normalizeModelForFormat(settings.model, requestFormat);
  const modelChoice = String(form.get("model_choice") || selectedModelChoice(currentModel, requestFormat));
  const baseChoice = String(form.get("base_preset") || selectedBaseChoice(settings.base_url));
  const customWidth = String(form.get("custom_width") || "").replace(/[^\d]/g, "");
  const customHeight = String(form.get("custom_height") || "").replace(/[^\d]/g, "");
  const size = sizeChoice === "custom" ? `${customWidth || 1024}x${customHeight || 1024}` : sizeChoice;
  const model = normalizeModelForFormat(
    modelChoice === "custom" ? String(form.get("model") || "").trim() || currentModel : modelChoice,
    requestFormat,
  );
  const baseUrl = settings.config_source === "codex"
    ? settings.base_url
    : baseChoice === "custom"
      ? String(form.get("base_url") || "").trim()
      : baseChoice;

  return normalizeSettings({
    language: settings.language || defaultSettings.language,
    base_url: baseUrl,
    api_key: settings.config_source === "codex" ? settings.api_key : String(form.get("api_key") || "").trim(),
    config_source: settings.config_source || defaultSettings.config_source,
    request_format: requestFormat,
    model,
    size,
    quality: String(form.get("quality") || settings.quality || defaultSettings.quality),
    output_format: String(form.get("output_format") || settings.output_format || defaultSettings.output_format),
    output_dir: String(form.get("output_dir") || settings.output_dir || "").trim(),
  });
}

async function scheduleSettingsSave(rerender: boolean) {
  settings = await currentFormSettings();
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(async () => {
    await saveSettingsNow();
    if (rerender) render();
  }, rerender ? 20 : 220);
}

async function saveSettingsNow() {
  await call<void>("save_settings", { settings });
}

async function refreshLocalCodexConfig(showMessage = true) {
  try {
    localCodexConfig = await call<LocalCodexConfig>("load_local_codex_config");
    if (showMessage) showNotice(localCodexConfig.found ? "success" : "error", `${localCodexConfig.message}\nSource: ${localCodexConfig.source}`);
  } catch (error) {
    showNotice("error", errorMessage(error));
  }
  render();
}

async function chooseOutputDir() {
  settings = await currentFormSettings();
  if (isTauri) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true, multiple: false, title: t("chooseFolder") });
    if (typeof selected === "string") {
      settings.output_dir = selected;
      await saveSettingsNow();
      showNotice("success", t("outputSaved"));
    }
  } else {
    const selected = window.prompt(t("outputFolder"), settings.output_dir || "");
    if (selected !== null) {
      settings.output_dir = selected.trim();
      showNotice("info", t("outputSaved"));
    }
  }
  render();
}

async function clearOutputDir() {
  settings = { ...(await currentFormSettings()), output_dir: "" };
  await saveSettingsNow();
  showNotice("success", t("outputDefault"));
  render();
}

async function openOutputDir() {
  try {
    settings = await currentFormSettings();
    await saveSettingsNow();
    await call<void>("open_output_dir");
  } catch (error) {
    showNotice("error", errorMessage(error));
    render();
  }
}

async function chooseReferenceImages() {
  if (!isTauri) {
    document.querySelector<HTMLInputElement>("#reference-file")?.click();
    return;
  }
  try {
    settings = await currentFormSettings();
    await saveSettingsNow();
    const { open } = await import("@tauri-apps/plugin-dialog");
    const defaultPath = await call<string>("get_output_dir");
    const selected = await open({
      multiple: true,
      directory: false,
      title: t("chooseImages"),
      defaultPath: defaultPath || undefined,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    const paths = Array.isArray(selected) ? selected : selected ? [selected] : [];
    if (!paths.length) return;
    const refs = await call<ReferenceImage[]>("read_reference_images", { paths });
    addReferenceImages(refs);
  } catch (error) {
    showNotice("error", errorMessage(error));
    render();
  }
}

function focusPrompt() {
  document.querySelector<HTMLTextAreaElement>("#generate-form textarea")?.focus();
}

function fileToReferenceImage(file: File): Promise<ReferenceImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Cannot read ${file.name}`));
    reader.onload = () => {
      resolve({
        name: file.name,
        mime_type: file.type || "image/png",
        data_url: String(reader.result || ""),
      });
    };
    reader.readAsDataURL(file);
  });
}

async function addReferenceFiles(fileList?: FileList | null) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const accepted = files.filter((file) => file.type.startsWith("image/"));
  if (accepted.length !== files.length) showNotice("error", t("unsupportedFile"));
  if (referenceImages.length + accepted.length > 8) {
    showNotice("error", t("tooManyRefs"));
    render();
    return;
  }
  addReferenceImages(await Promise.all(accepted.map(fileToReferenceImage)), !isTauri);
}

function addReferenceImages(nextImages: ReferenceImage[], previewNotice = false) {
  if (!nextImages.length) return;
  if (referenceImages.length + nextImages.length > 8) {
    showNotice("error", t("tooManyRefs"));
    render();
    return;
  }
  referenceImages = [...referenceImages, ...nextImages].slice(0, 8);
  if (previewNotice) showNotice("info", t("selectImagesPreview"));
  focusPrompt();
  render();
}

async function addGeneratedImageReference(id: string) {
  const image = images.find((item) => item.id === id);
  if (!image) return;
  addReferenceImages([{
    name: image.file_name,
    mime_type: image.data_url.match(/^data:([^;]+);/)?.[1] || `image/${image.output_format}`,
    data_url: image.data_url,
  }]);
}

async function addReferenceDrop(dataTransfer?: DataTransfer | null) {
  if (!dataTransfer) return;
  const imageId = dataTransfer.getData("application/x-gpt-image-id");
  if (imageId) {
    await addGeneratedImageReference(imageId);
    return;
  }
  await addReferenceFiles(dataTransfer.files);
}

async function generateImage(event: Event) {
  event.preventDefault();
  settings = await currentFormSettings();

  const formElement = document.querySelector<HTMLFormElement>("#generate-form");
  if (!formElement) return;
  const form = new FormData(formElement);
  const prompt = String(form.get("prompt") || "").trim();
  promptDraft = String(form.get("prompt") || "");

  if (settings.config_source !== "codex" && !settings.base_url.trim()) {
    showNotice("error", t("needBase"));
    render();
    return;
  }
  if (settings.config_source !== "codex" && !settings.api_key.trim()) {
    showNotice("error", t("needKey"));
    render();
    return;
  }
  if (!prompt) {
    showNotice("error", t("needPrompt"));
    render();
    return;
  }

  await saveSettingsNow();
  busy = true;
  generationSteps = [{ phase: "start", message: t("startMessage"), time: new Date().toLocaleTimeString() }];
  showNotice("info", t("generatingNotice"));
  render();

  try {
    const image = await call<ImageItem>("generate_image", { prompt, referenceImages });
    selectedImageId = image.id;
    images = [image, ...images.filter((item) => item.id !== image.id)];
    referenceImages = [];
    promptDraft = "";
    showNotice("success", `${t("savedAs")}: ${image.file_name}`);
  } catch (error) {
    showNotice("error", errorMessage(error));
  } finally {
    busy = false;
    generationSteps = [];
    render();
  }
}

async function setupStatusListener() {
  if (!isTauri) return;
  const { listen } = await import("@tauri-apps/api/event");
  await listen<{ phase: string; message: string }>("generation-status", (event) => {
    generationSteps = [
      ...generationSteps,
      { phase: event.payload.phase, message: event.payload.message, time: new Date().toLocaleTimeString() },
    ].slice(-10);
    render();
  });
}

async function setupTauriFileDrop() {
  if (!isTauri) return;
  const { getCurrentWebview } = await import("@tauri-apps/api/webview");
  await getCurrentWebview().onDragDropEvent(async (event) => {
    const payload = event.payload as { type: "over" | "drop" | "cancel"; paths?: string[] };
    if (payload.type === "over") {
      if (!dragActive) {
        dragActive = true;
        document.querySelector("#drop-zone")?.classList.add("is-dragging");
      }
      return;
    }
    dragActive = false;
    document.querySelector("#drop-zone")?.classList.remove("is-dragging");
    if (payload.type !== "drop" || !payload.paths?.length) return;
    try {
      const refs = await call<ReferenceImage[]>("read_reference_images", { paths: payload.paths });
      addReferenceImages(refs);
    } catch (error) {
      showNotice("error", errorMessage(error));
      render();
    }
  });
}

async function openFileLocation(id: string) {
  const image = images.find((item) => item.id === id);
  if (!image) return;
  try {
    await call<void>("open_file_location", { path: image.file_path });
  } catch (error) {
    showNotice("error", errorMessage(error));
    render();
  }
}

async function deleteImage(id: string) {
  if (!id) return;
  const image = images.find((item) => item.id === id);
  if (!image) return;
  if (!window.confirm(t("confirmDelete"))) return;
  try {
    await call<void>("delete_image", { id });
    images = images.filter((item) => item.id !== id);
    canvasImageCache.delete(id);
    delete canvasZoomById[id];
    delete canvasPanById[id];
    if (selectedImageId === id) selectedImageId = images[0]?.id || "";
    if (lightboxImageId === id) lightboxImageId = "";
    showNotice("success", t("deletedImage"));
  } catch (error) {
    showNotice("error", errorMessage(error));
  }
  render();
}

async function loadImages() {
  try {
    images = await call<ImageItem[]>("list_images");
    pruneCanvasImageCache();
    if (!images.some((image) => image.id === selectedImageId)) selectedImageId = images[0]?.id || "";
  } catch (error) {
    showNotice("error", errorMessage(error));
  }
  render();
}

function setupWindowDrop() {
  window.addEventListener("dragenter", (event) => {
    event.preventDefault();
    if (dragActive) return;
    dragActive = true;
    document.querySelector("#drop-zone")?.classList.add("is-dragging");
  });
  window.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  });
  window.addEventListener("dragleave", (event) => {
    if (event.clientX > 0 && event.clientY > 0 && event.clientX < window.innerWidth && event.clientY < window.innerHeight) return;
    dragActive = false;
    document.querySelector("#drop-zone")?.classList.remove("is-dragging");
  });
  window.addEventListener("drop", async (event) => {
    event.preventDefault();
    dragActive = false;
    document.querySelector("#drop-zone")?.classList.remove("is-dragging");
    await addReferenceDrop(event.dataTransfer);
  });
}

function setupKeyboardShortcuts() {
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && (lightboxImageId || historyContextMenu)) {
      lightboxImageId = "";
      historyContextMenu = null;
      render();
    }
  });
}

function setupLayerDismissHandlers() {
  window.addEventListener("click", (event) => {
    if (!historyContextMenu) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest(".history-menu")) return;
    historyContextMenu = null;
    render();
  });
  window.addEventListener("contextmenu", (event) => {
    if (!historyContextMenu) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest(".history-menu") || target?.closest(".history-link")) return;
    historyContextMenu = null;
    render();
  });
  window.addEventListener("scroll", () => {
    if (!historyContextMenu) return;
    historyContextMenu = null;
    render();
  }, true);
  window.addEventListener("blur", () => {
    if (!historyContextMenu) return;
    historyContextMenu = null;
    render();
  });
}

function setupCanvasResize() {
  window.addEventListener("resize", () => {
    window.clearTimeout(canvasResizeTimer);
    canvasResizeTimer = window.setTimeout(drawCanvasImages, 80);
  });
}

async function boot() {
  setupWindowDrop();
  setupKeyboardShortcuts();
  setupLayerDismissHandlers();
  setupCanvasResize();
  await setupStatusListener();
  await setupTauriFileDrop();
  settings = normalizeSettings(await call<Settings>("load_settings"));
  if (settings.config_source === "codex") {
    localCodexConfig = await call<LocalCodexConfig>("load_local_codex_config");
  }
  await loadImages();
}

boot().catch((error) => {
  root.innerHTML = `<div class="fatal">${escapeHtml(errorMessage(error))}</div>`;
});
