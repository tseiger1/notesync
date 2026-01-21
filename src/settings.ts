import { App, PluginSettingTab, Setting } from 'obsidian';
import type NoteSyncPlugin from './main';
import type { LLMProvider } from './llm';

export interface NoteSyncSettings {
  inputDir: string;
  outputDir: string;
  llmProvider: LLMProvider;
  llmModel: string;
  apiKey: string;
  apiEndpoint: string;
  maxImageWidth: number;
  promptPrefix: string;
  autoProcess: boolean;
}

export const DEFAULT_SETTINGS: NoteSyncSettings = {
  inputDir: '',
  outputDir: '',
  llmProvider: 'openai',
  llmModel: 'gpt-4o-mini',
  apiKey: '',
  apiEndpoint: 'https://api.openai.com/v1',
  maxImageWidth: 1800,
  promptPrefix: '',
  autoProcess: true,
};

export class NoteSyncSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: NoteSyncPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'NoteSync Settings' });

    new Setting(containerEl)
      .setName('Input directory')
      .setDesc('Absolute path to where handwritten note files appear')
      .addText((text) =>
        text
          .setPlaceholder('/Users/me/Scans')
          .setValue(this.plugin.settings.inputDir)
          .onChange(async (value) => {
            this.plugin.settings.inputDir = value.trim();
            await this.plugin.handleSettingsUpdated();
          })
      );

    new Setting(containerEl)
      .setName('Output directory')
      .setDesc('Markdown files and generated PNGs will be stored here (mirrors sub-folders)')
      .addText((text) =>
        text
          .setPlaceholder('/Users/me/Obsidian/Inbox')
          .setValue(this.plugin.settings.outputDir)
          .onChange(async (value) => {
            this.plugin.settings.outputDir = value.trim();
            await this.plugin.handleSettingsUpdated();
          })
      );

    new Setting(containerEl)
      .setName('LLM provider')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({ openai: 'OpenAI', ollama: 'Ollama (local)' })
          .setValue(this.plugin.settings.llmProvider)
          .onChange(async (value) => {
            this.plugin.settings.llmProvider = value as LLMProvider;
            if (value === 'ollama' && !this.plugin.settings.apiEndpoint) {
              this.plugin.settings.apiEndpoint = 'http://localhost:11434';
            }
            if (value === 'openai' && !this.plugin.settings.apiEndpoint) {
              this.plugin.settings.apiEndpoint = 'https://api.openai.com/v1';
            }
            await this.plugin.handleSettingsUpdated();
            this.display();
          })
      );

    if (this.plugin.settings.llmProvider === 'openai') {
      new Setting(containerEl)
        .setName('OpenAI API key')
        .setDesc('Stored locally only. Required for OpenAI provider.')
        .addText((text) =>
          text
            .setPlaceholder('sk-...')
            .setValue(this.plugin.settings.apiKey)
            .onChange(async (value) => {
              this.plugin.settings.apiKey = value.trim();
              await this.plugin.handleSettingsUpdated();
            })
        );

      new Setting(containerEl)
        .setName('OpenAI base URL (optional)')
        .setDesc('Override when using a compatible proxy endpoint.')
        .addText((text) =>
          text
            .setPlaceholder('https://api.openai.com/v1')
            .setValue(this.plugin.settings.apiEndpoint)
            .onChange(async (value) => {
              this.plugin.settings.apiEndpoint = value.trim();
              await this.plugin.handleSettingsUpdated();
            })
        );
    } else {
      new Setting(containerEl)
        .setName('Ollama endpoint')
        .setDesc('Defaults to http://localhost:11434')
        .addText((text) =>
          text
            .setPlaceholder('http://localhost:11434')
            .setValue(this.plugin.settings.apiEndpoint || 'http://localhost:11434')
            .onChange(async (value) => {
              this.plugin.settings.apiEndpoint = value.trim();
              await this.plugin.handleSettingsUpdated();
            })
        );
    }

    new Setting(containerEl)
      .setName('Model')
      .setDesc('Model identifier for the selected provider')
      .addText((text) =>
        text
            .setPlaceholder('gpt-4o-mini')
            .setValue(this.plugin.settings.llmModel)
            .onChange(async (value) => {
              this.plugin.settings.llmModel = value.trim();
              await this.plugin.handleSettingsUpdated();
            })
      );

    new Setting(containerEl)
      .setName('Maximum image width (px)')
      .setDesc('PNG pages wider than this will be scaled down to save tokens (0 disables scaling)')
      .addText((text) =>
        text
          .setPlaceholder('1800')
          .setValue(String(this.plugin.settings.maxImageWidth))
          .onChange(async (value) => {
            const parsed = Number(value);
            this.plugin.settings.maxImageWidth = Number.isNaN(parsed) ? 0 : parsed;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Prompt helper')
      .setDesc('Optional instruction prepended to every transcription request')
      .addTextArea((text) =>
        text
          .setPlaceholder('Emphasize TODO extraction...')
          .setValue(this.plugin.settings.promptPrefix)
          .onChange(async (value) => {
            this.plugin.settings.promptPrefix = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Auto process new files')
      .setDesc('If disabled, files are only processed when you hit the Sync button/command')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoProcess)
          .onChange(async (value) => {
            this.plugin.settings.autoProcess = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
