"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => NoteSyncPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");
var import_path5 = __toESM(require("path"));
var import_fs = require("fs");
var fs3 = __toESM(require("fs/promises"));
var import_chokidar = __toESM(require("chokidar"));

// src/conversion/registry.ts
var import_path = __toESM(require("path"));
var ConverterRegistry = class {
  constructor(converters = []) {
    this.converters = [];
    this.converters = converters;
  }
  register(converter) {
    this.converters.push(converter);
  }
  getConverterForFile(filePath) {
    const ext = import_path.default.extname(filePath).toLowerCase().replace(".", "");
    return this.converters.find(
      (converter) => converter.supportedExtensions.includes(ext)
    );
  }
  getSupportedExtensions() {
    const extensions = /* @__PURE__ */ new Set();
    this.converters.forEach(
      (converter) => converter.supportedExtensions.forEach((ext) => extensions.add(ext))
    );
    return Array.from(extensions.values());
  }
};

// src/conversion/pdfConverter.ts
var import_path3 = __toESM(require("path"));
var import_sharp2 = __toESM(require("sharp"));

// src/conversion/utils.ts
var import_promises = __toESM(require("fs/promises"));
var import_path2 = __toESM(require("path"));
var import_sharp = __toESM(require("sharp"));
async function ensureDir(dirPath) {
  await import_promises.default.mkdir(dirPath, { recursive: true });
}
async function scaleImageFile(filePath, maxWidth) {
  if (!maxWidth || maxWidth <= 0) {
    return;
  }
  const metadata = await (0, import_sharp.default)(filePath).metadata();
  if (!metadata.width || metadata.width <= maxWidth) {
    return;
  }
  const tempPath = buildTempPath(filePath);
  await (0, import_sharp.default)(filePath).resize({ width: maxWidth, withoutEnlargement: true }).toFile(tempPath);
  await import_promises.default.rename(tempPath, filePath);
}
function buildTempPath(originalPath) {
  const dir = import_path2.default.dirname(originalPath);
  const base = import_path2.default.basename(originalPath);
  return import_path2.default.join(dir, `.tmp-${base}`);
}

// src/conversion/pdfConverter.ts
var PdfConverter = class {
  constructor() {
    this.supportedExtensions = ["pdf"];
  }
  async convert(filePath, context) {
    const metadata = await (0, import_sharp2.default)(filePath, { pages: 1 }).metadata();
    const pages = metadata.pages ?? 1;
    if (!pages || pages < 1) {
      throw new Error("PDF has no pages");
    }
    const relPath = import_path3.default.relative(context.inputDir, filePath);
    const relDir = import_path3.default.dirname(relPath);
    const baseName = import_path3.default.basename(filePath, import_path3.default.extname(filePath));
    const outputDir = import_path3.default.join(context.cacheDir, relDir);
    await ensureDir(outputDir);
    const images = [];
    for (let page = 0; page < pages; page += 1) {
      const pngPath = import_path3.default.join(outputDir, `${baseName}-page-${page + 1}.png`);
      await (0, import_sharp2.default)(filePath, { page, density: 240 }).png().toFile(pngPath);
      await scaleImageFile(pngPath, context.maxImageWidth);
      images.push({ path: pngPath, page: page + 1 });
    }
    context.logger(`PDF converted to ${images.length} PNG file(s)`);
    return images;
  }
};

// src/conversion/noteStubConverter.ts
var NoteStubConverter = class {
  constructor() {
    this.supportedExtensions = ["note"];
  }
  async convert(filePath, context) {
    context.logger(`.note conversion not implemented yet for ${filePath}`);
    return [];
  }
};

// src/logger.ts
var StatusLogger = class {
  constructor() {
    this.history = [];
    this.listeners = [];
  }
  log(message) {
    const item = { timestamp: Date.now(), message };
    this.history.push(item);
    if (this.history.length > 100) {
      this.history.shift();
    }
    this.listeners.forEach((listener) => listener(message));
  }
  onMessage(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== listener);
    };
  }
  getHistory(limit = 20) {
    return this.history.slice(-limit);
  }
};

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  inputDir: "",
  outputDir: "",
  llmProvider: "openai",
  llmModel: "gpt-4o-mini",
  apiKey: "",
  apiEndpoint: "https://api.openai.com/v1",
  maxImageWidth: 1800,
  promptPrefix: "",
  autoProcess: true
};
var NoteSyncSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "NoteSync Settings" });
    new import_obsidian.Setting(containerEl).setName("Input directory").setDesc("Absolute path to where handwritten note files appear").addText(
      (text) => text.setPlaceholder("/Users/me/Scans").setValue(this.plugin.settings.inputDir).onChange(async (value) => {
        this.plugin.settings.inputDir = value.trim();
        await this.plugin.handleSettingsUpdated();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Output directory").setDesc("Markdown files and generated PNGs will be stored here (mirrors sub-folders)").addText(
      (text) => text.setPlaceholder("/Users/me/Obsidian/Inbox").setValue(this.plugin.settings.outputDir).onChange(async (value) => {
        this.plugin.settings.outputDir = value.trim();
        await this.plugin.handleSettingsUpdated();
      })
    );
    new import_obsidian.Setting(containerEl).setName("LLM provider").addDropdown(
      (dropdown) => dropdown.addOptions({ openai: "OpenAI", ollama: "Ollama (local)" }).setValue(this.plugin.settings.llmProvider).onChange(async (value) => {
        this.plugin.settings.llmProvider = value;
        if (value === "ollama" && !this.plugin.settings.apiEndpoint) {
          this.plugin.settings.apiEndpoint = "http://localhost:11434";
        }
        if (value === "openai" && !this.plugin.settings.apiEndpoint) {
          this.plugin.settings.apiEndpoint = "https://api.openai.com/v1";
        }
        await this.plugin.handleSettingsUpdated();
        this.display();
      })
    );
    if (this.plugin.settings.llmProvider === "openai") {
      new import_obsidian.Setting(containerEl).setName("OpenAI API key").setDesc("Stored locally only. Required for OpenAI provider.").addText(
        (text) => text.setPlaceholder("sk-...").setValue(this.plugin.settings.apiKey).onChange(async (value) => {
          this.plugin.settings.apiKey = value.trim();
          await this.plugin.handleSettingsUpdated();
        })
      );
      new import_obsidian.Setting(containerEl).setName("OpenAI base URL (optional)").setDesc("Override when using a compatible proxy endpoint.").addText(
        (text) => text.setPlaceholder("https://api.openai.com/v1").setValue(this.plugin.settings.apiEndpoint).onChange(async (value) => {
          this.plugin.settings.apiEndpoint = value.trim();
          await this.plugin.handleSettingsUpdated();
        })
      );
    } else {
      new import_obsidian.Setting(containerEl).setName("Ollama endpoint").setDesc("Defaults to http://localhost:11434").addText(
        (text) => text.setPlaceholder("http://localhost:11434").setValue(this.plugin.settings.apiEndpoint || "http://localhost:11434").onChange(async (value) => {
          this.plugin.settings.apiEndpoint = value.trim();
          await this.plugin.handleSettingsUpdated();
        })
      );
    }
    new import_obsidian.Setting(containerEl).setName("Model").setDesc("Model identifier for the selected provider").addText(
      (text) => text.setPlaceholder("gpt-4o-mini").setValue(this.plugin.settings.llmModel).onChange(async (value) => {
        this.plugin.settings.llmModel = value.trim();
        await this.plugin.handleSettingsUpdated();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Maximum image width (px)").setDesc("PNG pages wider than this will be scaled down to save tokens (0 disables scaling)").addText(
      (text) => text.setPlaceholder("1800").setValue(String(this.plugin.settings.maxImageWidth)).onChange(async (value) => {
        const parsed = Number(value);
        this.plugin.settings.maxImageWidth = Number.isNaN(parsed) ? 0 : parsed;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Prompt helper").setDesc("Optional instruction prepended to every transcription request").addTextArea(
      (text) => text.setPlaceholder("Emphasize TODO extraction...").setValue(this.plugin.settings.promptPrefix).onChange(async (value) => {
        this.plugin.settings.promptPrefix = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Auto process new files").setDesc("If disabled, files are only processed when you hit the Sync button/command").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.autoProcess).onChange(async (value) => {
        this.plugin.settings.autoProcess = value;
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/llm/ollamaClient.ts
var DEFAULT_OLLAMA_URL = "http://localhost:11434";
var OllamaLLMClient = class {
  constructor(config) {
    this.config = config;
  }
  async generateMarkdown(images, context) {
    const endpoint = (this.config.endpoint || DEFAULT_OLLAMA_URL).replace(/\/$/, "");
    const promptInstruction = context.promptPrefix ?? "Transcribe and summarize the handwritten content into Markdown. Keep the note structure intact.";
    const payload = {
      model: this.config.model || "llama3.2-vision",
      prompt: `${promptInstruction}
File name: ${context.fileName}`,
      images: images.map((image) => image.data),
      stream: false
    };
    const response = await fetch(`${endpoint}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Ollama request failed: ${response.status} ${message}`);
    }
    const data = await response.json();
    return (data.response ?? "").trim();
  }
};

// src/llm/openaiClient.ts
var DEFAULT_OPENAI_URL = "https://api.openai.com/v1";
var OpenAILLMClient = class {
  constructor(config) {
    this.config = config;
  }
  async generateMarkdown(images, context) {
    if (!this.config.apiKey) {
      throw new Error("OpenAI API key missing");
    }
    const prompt = context.promptPrefix ?? "Extract the handwritten note content, structure it with Markdown headings when appropriate, and keep bullet/numbered lists intact.";
    const content = [
      {
        type: "text",
        text: `${prompt}
File name: ${context.fileName}`
      },
      ...images.map((image) => ({
        type: "image_url",
        image_url: {
          url: `data:${image.mediaType};base64,${image.data}`
        }
      }))
    ];
    const body = {
      model: this.config.model || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You convert handwritten note images to clean Markdown. Preserve equations and transcribe diagrams descriptively when possible."
        },
        {
          role: "user",
          content
        }
      ],
      temperature: 0.2
    };
    const response = await fetch(`${this.config.baseUrl ?? DEFAULT_OPENAI_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`OpenAI request failed: ${response.status} ${message}`);
    }
    const payload = await response.json();
    const choice = payload.choices?.[0]?.message?.content;
    if (Array.isArray(choice)) {
      return choice.map((piece) => piece.text ?? "").join("\n").trim();
    }
    return (choice ?? "").trim();
  }
};

// src/llm/index.ts
var createLLMClient = (config) => {
  if (config.provider === "ollama") {
    return new OllamaLLMClient({ endpoint: config.endpoint, model: config.model });
  }
  return new OpenAILLMClient({
    apiKey: config.apiKey ?? "",
    model: config.model,
    baseUrl: config.endpoint
  });
};

// src/history.ts
var import_promises2 = __toESM(require("fs/promises"));
var import_path4 = __toESM(require("path"));
var ProcessingHistory = class {
  constructor(filePath) {
    this.data = /* @__PURE__ */ new Map();
    this.filePath = filePath;
  }
  async load() {
    try {
      const content = await import_promises2.default.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(content);
      this.data = new Map(Object.entries(parsed));
    } catch (error) {
      if (error.code === "ENOENT") {
        this.data.clear();
        return;
      }
      console.warn("Failed to load NoteSync history", error);
      this.data.clear();
    }
  }
  getRecord(relativePath) {
    return this.data.get(relativePath);
  }
  isSame(relativePath, signature) {
    const record = this.data.get(relativePath);
    if (!record) {
      return false;
    }
    return record.signature.size === signature.size && Math.abs(record.signature.mtimeMs - signature.mtimeMs) < 1;
  }
  async record(relativePath, signature, outputPath) {
    this.data.set(relativePath, {
      signature,
      processedAt: (/* @__PURE__ */ new Date()).toISOString(),
      outputPath
    });
    await this.save();
  }
  async save() {
    const dir = import_path4.default.dirname(this.filePath);
    await ensureDir(dir);
    const object = Object.fromEntries(this.data.entries());
    await import_promises2.default.writeFile(this.filePath, JSON.stringify(object, null, 2), "utf8");
  }
};

// src/main.ts
var NoteSyncPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.logger = new StatusLogger();
    this.queue = /* @__PURE__ */ new Set();
    this.processing = false;
    this.converterRegistry = new ConverterRegistry([
      new PdfConverter(),
      new NoteStubConverter()
    ]);
  }
  async onload() {
    await this.loadSettings();
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatus("Idle");
    this.refreshLLMClient();
    await this.refreshHistory();
    this.addRibbonIcon("rotate-cw", "Run NoteSync", () => void this.runSync());
    this.addCommand({
      id: "notesync-sync-now",
      name: "Run NoteSync once",
      callback: () => void this.runSync()
    });
    this.addSettingTab(new NoteSyncSettingTab(this.app, this));
    this.logger.onMessage((message) => this.updateStatus(message));
    await this.restartWatcher();
  }
  async onunload() {
    await this.stopWatcher();
  }
  updateStatus(message) {
    if (this.statusBarItem) {
      this.statusBarItem.setText(`NoteSync: ${message}`);
    }
  }
  async loadSettings() {
    const stored = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, stored ?? {});
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async handleSettingsUpdated() {
    await this.saveSettings();
    await this.refreshHistory();
    this.refreshLLMClient();
    await this.restartWatcher();
  }
  async refreshHistory() {
    if (!this.settings.outputDir) {
      this.history = void 0;
      return;
    }
    const cacheDir = import_path5.default.join(this.settings.outputDir, ".notesync-cache");
    await ensureDir(cacheDir);
    const historyPath = import_path5.default.join(cacheDir, "history.json");
    if (this.history && this.history.filePath === historyPath) {
      return;
    }
    this.history = new ProcessingHistory(historyPath);
    await this.history.load();
  }
  refreshLLMClient() {
    try {
      this.llmClient = createLLMClient({
        provider: this.settings.llmProvider,
        model: this.settings.llmModel,
        apiKey: this.settings.apiKey,
        endpoint: this.resolveApiEndpoint()
      });
    } catch (error) {
      console.error("Failed to create LLM client", error);
      this.llmClient = void 0;
    }
  }
  resolveApiEndpoint() {
    if (this.settings.llmProvider === "ollama") {
      return this.settings.apiEndpoint || "http://localhost:11434";
    }
    return this.settings.apiEndpoint || "https://api.openai.com/v1";
  }
  async restartWatcher() {
    await this.stopWatcher();
    if (!this.settings.inputDir) {
      this.logger.log("Set an input directory to enable watching");
      return;
    }
    if (!(0, import_fs.existsSync)(this.settings.inputDir)) {
      this.logger.log("Input directory does not exist");
      new import_obsidian2.Notice("NoteSync input directory missing. Update plugin settings.");
      return;
    }
    this.watcher = import_chokidar.default.watch(this.settings.inputDir, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 800,
        pollInterval: 100
      },
      persistent: true
    });
    this.watcher.on("add", (filePath) => this.handleFileEvent(filePath)).on("change", (filePath) => this.handleFileEvent(filePath)).on("error", (error) => this.logger.log(`Watcher error: ${error}`));
    this.logger.log("Watching for handwritten notes");
  }
  async stopWatcher() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = void 0;
    }
  }
  handleFileEvent(filePath) {
    if (!this.isSupportedFile(filePath)) {
      return;
    }
    this.queue.add(filePath);
    this.logger.log(`Queued ${import_path5.default.basename(filePath)}`);
    if (this.settings.autoProcess) {
      void this.processQueue();
    }
  }
  isSupportedFile(filePath) {
    const converter = this.converterRegistry.getConverterForFile(filePath);
    return Boolean(converter);
  }
  async processQueue() {
    if (this.processing) {
      return;
    }
    this.processing = true;
    try {
      while (this.queue.size > 0) {
        const next = this.queue.values().next().value;
        if (!next) {
          break;
        }
        this.queue.delete(next);
        try {
          await this.processSingleFile(next);
        } catch (error) {
          console.error(error);
          this.logger.log(`Failed: ${import_path5.default.basename(next)}`);
          const message = error instanceof Error ? error.message : String(error);
          new import_obsidian2.Notice(`NoteSync failed for ${next}: ${message}`);
        }
      }
      this.logger.log("Idle");
    } finally {
      this.processing = false;
    }
  }
  async processSingleFile(filePath) {
    const converter = this.converterRegistry.getConverterForFile(filePath);
    if (!converter) {
      this.logger.log(`No converter registered for ${filePath}`);
      return;
    }
    const context = await this.buildConversionContext();
    const signature = await this.buildFileSignature(filePath);
    if (!signature) {
      this.logger.log(`Cannot read ${filePath}`);
      return;
    }
    if (await this.shouldSkipFile(filePath, signature)) {
      return;
    }
    this.logger.log(`Converting ${import_path5.default.basename(filePath)}...`);
    const images = await converter.convert(filePath, context);
    if (!images.length) {
      this.logger.log(`No PNGs produced for ${filePath}`);
      return;
    }
    const encodedImages = await this.encodeImages(images);
    const markdown = await this.generateMarkdown(encodedImages, {
      fileName: import_path5.default.basename(filePath),
      promptPrefix: this.settings.promptPrefix
    });
    const outputPath = await this.writeMarkdownFile(filePath, markdown);
    await this.recordProcessedFile(filePath, signature, outputPath);
    this.logger.log(`Finished ${import_path5.default.basename(filePath)}`);
    new import_obsidian2.Notice(`NoteSync finished ${import_path5.default.basename(filePath)}`);
  }
  async buildConversionContext() {
    if (!this.settings.inputDir || !this.settings.outputDir) {
      throw new Error("Please configure input and output directories in NoteSync settings.");
    }
    const cacheDir = import_path5.default.join(this.settings.outputDir, ".notesync-cache");
    await ensureDir(cacheDir);
    return {
      inputDir: this.settings.inputDir,
      outputDir: this.settings.outputDir,
      cacheDir,
      maxImageWidth: this.settings.maxImageWidth,
      logger: (message) => this.logger.log(message)
    };
  }
  async encodeImages(images) {
    const payload = [];
    for (const image of images) {
      const buffer = await fs3.readFile(image.path);
      payload.push({
        data: buffer.toString("base64"),
        mediaType: "image/png",
        page: image.page
      });
    }
    return payload;
  }
  async generateMarkdown(images, context) {
    if (!this.llmClient) {
      this.refreshLLMClient();
    }
    if (!this.llmClient) {
      throw new Error("LLM client not configured. Check provider settings.");
    }
    this.logger.log("Sending to language model...");
    return this.llmClient.generateMarkdown(images, context);
  }
  async writeMarkdownFile(originalFile, markdown) {
    const relativePath = import_path5.default.relative(this.settings.inputDir, originalFile);
    const baseName = import_path5.default.basename(relativePath, import_path5.default.extname(relativePath));
    const targetDir = import_path5.default.join(
      this.settings.outputDir,
      import_path5.default.dirname(relativePath)
    );
    await ensureDir(targetDir);
    const outputPath = import_path5.default.join(targetDir, `${baseName}.md`);
    const header = `---
source: ${originalFile}
processed: ${(/* @__PURE__ */ new Date()).toISOString()}
---

`;
    await fs3.writeFile(outputPath, `${header}${markdown}
`, "utf8");
    return outputPath;
  }
  async buildFileSignature(filePath) {
    try {
      const stats = await fs3.stat(filePath);
      return { size: stats.size, mtimeMs: stats.mtimeMs };
    } catch (error) {
      console.warn("Unable to stat file", filePath, error);
      return void 0;
    }
  }
  async shouldSkipFile(filePath, signature) {
    if (!this.history) {
      return false;
    }
    const relative = import_path5.default.relative(this.settings.inputDir, filePath);
    if (this.history.isSame(relative, signature)) {
      this.logger.log(`Skipping ${import_path5.default.basename(filePath)} (unchanged)`);
      return true;
    }
    return false;
  }
  async recordProcessedFile(filePath, signature, outputPath) {
    if (!this.history) {
      return;
    }
    const relative = import_path5.default.relative(this.settings.inputDir, filePath);
    await this.history.record(relative, signature, outputPath);
  }
  async runSync() {
    try {
      await this.validateDirectories();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new import_obsidian2.Notice(message);
      return;
    }
    this.logger.log("Scanning for files...");
    await this.collectExistingFiles(this.settings.inputDir);
    await this.processQueue();
  }
  async validateDirectories() {
    if (!this.settings.inputDir || !(0, import_fs.existsSync)(this.settings.inputDir)) {
      throw new Error("Input directory missing or invalid");
    }
    if (!this.settings.outputDir) {
      throw new Error("Output directory is not configured");
    }
    await ensureDir(this.settings.outputDir);
  }
  async collectExistingFiles(dir) {
    let entries;
    try {
      entries = await fs3.readdir(dir, { withFileTypes: true });
    } catch (error) {
      console.warn("Unable to read directory", dir, error);
      return;
    }
    for (const entry of entries) {
      const fullPath = import_path5.default.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.collectExistingFiles(fullPath);
        continue;
      }
      if (this.isSupportedFile(fullPath)) {
        this.queue.add(fullPath);
      }
    }
  }
};
//# sourceMappingURL=main.js.map
