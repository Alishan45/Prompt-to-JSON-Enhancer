class PromptToJSONApp {
  constructor() {
    this.currentJSON = null;
    this.isEditing = false;
    this.apiSettings = null;
    
    this.initializeElements();
    this.bindEvents();
    this.loadSettings();
  }

  initializeElements() {
    this.promptInput = document.getElementById('promptInput');
    this.jsonOutput = document.getElementById('jsonOutput');
    this.jsonEditor = document.getElementById('jsonEditor');
    this.transformBtn = document.getElementById('transform');
    this.toggleEditorBtn = document.getElementById('toggleEditor');
    this.enhanceBtn = document.getElementById('enhanceWithAI');
    this.copyBtn = document.getElementById('copyJson');
    this.downloadBtn = document.getElementById('downloadJson');
    this.formatBtn = document.getElementById('formatJson');
    this.clearBtn = document.getElementById('clearInput');
  }

  bindEvents() {
    this.transformBtn.addEventListener('click', () => this.transformPrompt());
    this.toggleEditorBtn.addEventListener('click', () => this.toggleEditor());
    this.enhanceBtn.addEventListener('click', () => this.enhanceWithAI());
    this.copyBtn.addEventListener('click', () => this.copyJSON());
    this.downloadBtn.addEventListener('click', () => this.downloadJSON());
    this.formatBtn.addEventListener('click', () => this.formatJSON());
    this.clearBtn.addEventListener('click', () => this.clearInput());
    
    this.promptInput.addEventListener('input', () => this.onInputChange());
    this.jsonEditor.addEventListener('input', () => this.onEditorChange());
    
    // Auto-transform on input (debounced)
    let timeout;
    this.promptInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (this.promptInput.value.trim()) {
          this.transformPrompt();
        }
      }, 500);
    });
  }

  async loadSettings() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const settings = await chrome.storage.sync.get(['provider', 'key', 'enrich']);
        this.apiSettings = settings;
        this.enhanceBtn.disabled = !settings.key;
        if (settings.key) {
          this.enhanceBtn.textContent = `Enhance with ${settings.provider || 'AI'}`;
        }
      }
    } catch (error) {
      console.log('Running in standalone mode');
    }
  }

  transformPrompt() {
    const prompt = this.promptInput.value.trim();
    if (!prompt) {
      this.jsonOutput.textContent = 'Enter a prompt to see the JSON structure...';
      return;
    }

    try {
      this.jsonOutput.classList.add('loading');
      
      const json = window.PromptJSON.toStructuredJSON(prompt, { 
        source: 'prompt-page',
        language: 'en'
      });
      
      this.currentJSON = json;
      this.displayJSON(json);
      
      setTimeout(() => {
        this.jsonOutput.classList.remove('loading');
      }, 300);
      
    } catch (error) {
      this.jsonOutput.textContent = `Error: ${error.message}`;
      this.jsonOutput.classList.remove('loading');
    }
  }

  displayJSON(json) {
    const formatted = JSON.stringify(json, null, 2);
    this.jsonOutput.textContent = formatted;
    this.jsonEditor.value = formatted;
  }

  toggleEditor() {
    this.isEditing = !this.isEditing;
    
    if (this.isEditing) {
      this.jsonOutput.classList.add('hidden');
      this.jsonEditor.classList.remove('hidden');
      this.toggleEditorBtn.textContent = 'View JSON';
      this.jsonEditor.focus();
    } else {
      this.jsonOutput.classList.remove('hidden');
      this.jsonEditor.classList.add('hidden');
      this.toggleEditorBtn.textContent = 'Edit JSON';
    }
  }

  onEditorChange() {
    try {
      const parsed = JSON.parse(this.jsonEditor.value);
      this.currentJSON = parsed;
      this.jsonEditor.style.borderColor = '#e2e8f0';
    } catch (error) {
      this.jsonEditor.style.borderColor = '#f56565';
    }
  }

  async enhanceWithAI() {
    if (!this.apiSettings || !this.apiSettings.key) {
      alert('Please configure your API key in the extension options first.');
      return;
    }

    if (!this.currentJSON) {
      alert('Please transform a prompt first.');
      return;
    }

    this.enhanceBtn.disabled = true;
    this.enhanceBtn.textContent = 'Enhancing...';

    try {
      const enhanced = await this.callAIAPI(this.currentJSON);
      this.currentJSON = enhanced;
      this.displayJSON(enhanced);
      
      this.showNotification('JSON enhanced successfully!', 'success');
    } catch (error) {
      this.showNotification(`Enhancement failed: ${error.message}`, 'error');
    } finally {
      this.enhanceBtn.disabled = false;
      this.enhanceBtn.textContent = `Enhance with ${this.apiSettings.provider || 'AI'}`;
    }
  }

  async callAIAPI(json) {
    const { provider, key } = this.apiSettings;
    
    const prompt = `Please enhance this JSON structure by:
1. Adding more detailed and specific fields where appropriate
2. Improving the organization and hierarchy
3. Adding relevant metadata
4. Ensuring consistency and completeness

Current JSON:
${JSON.stringify(json, null, 2)}

Return only the enhanced JSON, no explanations.`;

    let apiUrl, headers, body;

    switch (provider) {
      case 'openai':
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        headers = {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        };
        body = {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        };
        break;
        
      case 'anthropic':
        apiUrl = 'https://api.anthropic.com/v1/messages';
        headers = {
          'x-api-key': key,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        };
        body = {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        };
        break;
        
      default:
        throw new Error('Unsupported provider');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    let content;

    if (provider === 'openai') {
      content = data.choices[0].message.content;
    } else if (provider === 'anthropic') {
      content = data.content[0].text;
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  async copyJSON() {
    const text = this.isEditing ? this.jsonEditor.value : this.jsonOutput.textContent;
    
    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('JSON copied to clipboard!', 'success');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showNotification('JSON copied to clipboard!', 'success');
    }
  }

  downloadJSON() {
    const text = this.isEditing ? this.jsonEditor.value : this.jsonOutput.textContent;
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showNotification('JSON file downloaded!', 'success');
  }

  formatJSON() {
    if (this.isEditing) {
      try {
        const parsed = JSON.parse(this.jsonEditor.value);
        this.jsonEditor.value = JSON.stringify(parsed, null, 2);
        this.currentJSON = parsed;
        this.showNotification('JSON formatted!', 'success');
      } catch (error) {
        this.showNotification('Invalid JSON format!', 'error');
      }
    } else if (this.currentJSON) {
      this.displayJSON(this.currentJSON);
      this.showNotification('JSON formatted!', 'success');
    }
  }

  clearInput() {
    this.promptInput.value = '';
    this.jsonOutput.textContent = 'Transform your prompt to see the JSON structure here...';
    this.jsonEditor.value = '';
    this.currentJSON = null;
  }

  onInputChange() {
    // Enable/disable buttons based on input
    const hasInput = this.promptInput.value.trim().length > 0;
    this.transformBtn.disabled = !hasInput;
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      zIndex: '10000',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease'
    });

    if (type === 'success') {
      notification.style.background = '#48bb78';
    } else if (type === 'error') {
      notification.style.background = '#f56565';
    } else {
      notification.style.background = '#4299e1';
    }

    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PromptToJSONApp();
});