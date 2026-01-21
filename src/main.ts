import { Notice, Plugin } from 'obsidian';
import path from 'path';
import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import chokidar, { FSWatcher } from 'chokidar';
import {
  ConverterRegistry,
  PdfConverter,
  NoteStubConverter,
  ensureDir,
  ConvertedImage,
  ConversionContext,
} from './conversion';
import { StatusLogger } from './logger';
import {
  DEFAULT_SETTINGS,
  NoteSyncSettings,
  NoteSyncSettingTab,
} from './settings';
import {
  createLLMClient,
  EncodedImage,
  LLMClient,
  LLMGenerationContext,
} from './llm';
import { FileSignature, ProcessingHistory } from './history';

export default class NoteSyncPlugin extends Plugin {
  settings: NoteSyncSettings = DEFAULT_SETTINGS;
  private watcher?: FSWatcher;
  private readonly logger = new StatusLogger();
  private readonly queue = new Set<string>();
  private processing = false;
  private statusBarItem?: HTMLElement;
  private converterRegistry = new ConverterRegistry([
    new PdfConverter(),
    new NoteStubConverter(),
  ]);
  private llmClient?: LLMClient;
  private history?: ProcessingHistory;

  async onload() {
    await this.loadSettings();

    this.statusBarItem = this.addStatusBarItem();
    this.updateStatus('Idle');
    this.refreshLLMClient();
    await this.refreshHistory();

    this.addRibbonIcon('rotate-cw', 'Run NoteSync', () => void this.runSync());

    this.addCommand({
      id: 'notesync-sync-now',
      name: 'Run NoteSync once',
      callback: () => void this.runSync(),
    });

    this.addSettingTab(new NoteSyncSettingTab(this.app, this));

    this.logger.onMessage((message) => this.updateStatus(message));
    await this.restartWatcher();
  }

  async onunload() {
    await this.stopWatcher();
  }

  private updateStatus(message: string) {
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

  private async refreshHistory() {
    if (!this.settings.outputDir) {
      this.history = undefined;
      return;
    }
    const cacheDir = path.join(this.settings.outputDir, '.notesync-cache');
    await ensureDir(cacheDir);
    const historyPath = path.join(cacheDir, 'history.json');
    if (this.history && this.history.filePath === historyPath) {
      return;
    }
    this.history = new ProcessingHistory(historyPath);
    await this.history.load();
  }

  private refreshLLMClient() {
    try {
      this.llmClient = createLLMClient({
        provider: this.settings.llmProvider,
        model: this.settings.llmModel,
        apiKey: this.settings.apiKey,
        endpoint: this.resolveApiEndpoint(),
      });
    } catch (error) {
      console.error('Failed to create LLM client', error);
      this.llmClient = undefined;
    }
  }

  private resolveApiEndpoint() {
    if (this.settings.llmProvider === 'ollama') {
      return this.settings.apiEndpoint || 'http://localhost:11434';
    }
    return this.settings.apiEndpoint || 'https://api.openai.com/v1';
  }

  private async restartWatcher() {
    await this.stopWatcher();

    if (!this.settings.inputDir) {
      this.logger.log('Set an input directory to enable watching');
      return;
    }

    if (!existsSync(this.settings.inputDir)) {
      this.logger.log('Input directory does not exist');
      new Notice('NoteSync input directory missing. Update plugin settings.');
      return;
    }

    this.watcher = chokidar.watch(this.settings.inputDir, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 800,
        pollInterval: 100,
      },
      persistent: true,
    });

    this.watcher
      .on('add', (filePath) => this.handleFileEvent(filePath))
      .on('change', (filePath) => this.handleFileEvent(filePath))
      .on('error', (error) => this.logger.log(`Watcher error: ${error}`));

    this.logger.log('Watching for handwritten notes');
  }

  private async stopWatcher() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
    }
  }

  private handleFileEvent(filePath: string) {
    if (!this.isSupportedFile(filePath)) {
      return;
    }
    this.queue.add(filePath);
    this.logger.log(`Queued ${path.basename(filePath)}`);
    if (this.settings.autoProcess) {
      void this.processQueue();
    }
  }

  private isSupportedFile(filePath: string) {
    const converter = this.converterRegistry.getConverterForFile(filePath);
    return Boolean(converter);
  }

  private async processQueue() {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.size > 0) {
        const next = this.queue.values().next().value as string | undefined;
        if (!next) {
          break;
        }
        this.queue.delete(next);
        try {
          await this.processSingleFile(next);
        } catch (error) {
          console.error(error);
          this.logger.log(`Failed: ${path.basename(next)}`);
          const message =
            error instanceof Error ? error.message : String(error);
          new Notice(`NoteSync failed for ${next}: ${message}`);
        }
      }
      this.logger.log('Idle');
    } finally {
      this.processing = false;
    }
  }

  private async processSingleFile(filePath: string) {
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
    this.logger.log(`Converting ${path.basename(filePath)}...`);
    const images = await converter.convert(filePath, context);
    if (!images.length) {
      this.logger.log(`No PNGs produced for ${filePath}`);
      return;
    }

    const encodedImages = await this.encodeImages(images);
    const markdown = await this.generateMarkdown(encodedImages, {
      fileName: path.basename(filePath),
      promptPrefix: this.settings.promptPrefix,
    });
    const outputPath = await this.writeMarkdownFile(filePath, markdown);
    await this.recordProcessedFile(filePath, signature, outputPath);
    this.logger.log(`Finished ${path.basename(filePath)}`);
    new Notice(`NoteSync finished ${path.basename(filePath)}`);
  }

  private async buildConversionContext(): Promise<ConversionContext> {
    if (!this.settings.inputDir || !this.settings.outputDir) {
      throw new Error('Please configure input and output directories in NoteSync settings.');
    }

    const cacheDir = path.join(this.settings.outputDir, '.notesync-cache');
    await ensureDir(cacheDir);

    return {
      inputDir: this.settings.inputDir,
      outputDir: this.settings.outputDir,
      cacheDir,
      maxImageWidth: this.settings.maxImageWidth,
      logger: (message: string) => this.logger.log(message),
    };
  }

  private async encodeImages(images: ConvertedImage[]): Promise<EncodedImage[]> {
    const payload: EncodedImage[] = [];
    for (const image of images) {
      const buffer = await fs.readFile(image.path);
      payload.push({
        data: buffer.toString('base64'),
        mediaType: 'image/png',
        page: image.page,
      });
    }
    return payload;
  }

  private async generateMarkdown(images: EncodedImage[], context: LLMGenerationContext) {
    if (!this.llmClient) {
      this.refreshLLMClient();
    }
    if (!this.llmClient) {
      throw new Error('LLM client not configured. Check provider settings.');
    }
    this.logger.log('Sending to language model...');
    return this.llmClient.generateMarkdown(images, context);
  }

  private async writeMarkdownFile(originalFile: string, markdown: string) {
    const relativePath = path.relative(this.settings.inputDir, originalFile);
    const baseName = path.basename(relativePath, path.extname(relativePath));
    const targetDir = path.join(
      this.settings.outputDir,
      path.dirname(relativePath)
    );
    await ensureDir(targetDir);
    const outputPath = path.join(targetDir, `${baseName}.md`);
    const header = `---\nsource: ${originalFile}\nprocessed: ${new Date().toISOString()}\n---\n\n`;
    await fs.writeFile(outputPath, `${header}${markdown}\n`, 'utf8');
    return outputPath;
  }

  private async buildFileSignature(filePath: string): Promise<FileSignature | undefined> {
    try {
      const stats = await fs.stat(filePath);
      return { size: stats.size, mtimeMs: stats.mtimeMs };
    } catch (error) {
      console.warn('Unable to stat file', filePath, error);
      return undefined;
    }
  }

  private async shouldSkipFile(filePath: string, signature: FileSignature) {
    if (!this.history) {
      return false;
    }
    const relative = path.relative(this.settings.inputDir, filePath);
    if (this.history.isSame(relative, signature)) {
      this.logger.log(`Skipping ${path.basename(filePath)} (unchanged)`);
      return true;
    }
    return false;
  }

  private async recordProcessedFile(
    filePath: string,
    signature: FileSignature,
    outputPath: string
  ) {
    if (!this.history) {
      return;
    }
    const relative = path.relative(this.settings.inputDir, filePath);
    await this.history.record(relative, signature, outputPath);
  }

  private async runSync() {
    try {
      await this.validateDirectories();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(message);
      return;
    }

    this.logger.log('Scanning for files...');
    await this.collectExistingFiles(this.settings.inputDir);
    await this.processQueue();
  }

  private async validateDirectories() {
    if (!this.settings.inputDir || !existsSync(this.settings.inputDir)) {
      throw new Error('Input directory missing or invalid');
    }
    if (!this.settings.outputDir) {
      throw new Error('Output directory is not configured');
    }
    await ensureDir(this.settings.outputDir);
  }

  private async collectExistingFiles(dir: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      console.warn('Unable to read directory', dir, error);
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.collectExistingFiles(fullPath);
        continue;
      }
      if (this.isSupportedFile(fullPath)) {
        this.queue.add(fullPath);
      }
    }
  }
}
