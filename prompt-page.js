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
        // Always enable the enhance button - it will offer local enhancement as fallback
        this.enhanceBtn.disabled = false;
        if (settings.key && settings.provider) {
          this.enhanceBtn.textContent = `Enhance with ${settings.provider.toUpperCase()}`;
        } else {
          this.enhanceBtn.textContent = 'Enhance JSON';
        }
      } else {
        // Standalone mode - enable local enhancement
        this.enhanceBtn.disabled = false;
        this.enhanceBtn.textContent = 'Enhance JSON';
      }
    } catch (error) {
      console.log('Running in standalone mode');
      this.enhanceBtn.disabled = false;
      this.enhanceBtn.textContent = 'Enhance JSON';
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
    if (!this.currentJSON) {
      this.showNotification('Please transform a prompt first.', 'error');
      return;
    }

    // Check if API key is available
    if (!this.apiSettings || !this.apiSettings.key) {
      // Offer local enhancement as fallback
      const useLocal = confirm('No API key configured. Would you like to use local enhancement instead?\n\nLocal enhancement will add common fields and improve structure without using AI.');
      if (useLocal) {
        this.enhanceLocally();
        return;
      } else {
        this.showNotification('Please configure your API key in the extension options first.', 'error');
        return;
      }
    }

    this.enhanceBtn.disabled = true;
    this.enhanceBtn.textContent = 'Enhancing...';

    try {
      const enhanced = await this.callAIAPI(this.currentJSON);
      this.currentJSON = enhanced;
      this.displayJSON(enhanced);
      
      this.showNotification('JSON enhanced successfully with AI!', 'success');
    } catch (error) {
      this.showNotification(`AI enhancement failed: ${error.message}`, 'error');
      
      // Offer local enhancement as fallback
      const useLocal = confirm('AI enhancement failed. Would you like to try local enhancement instead?');
      if (useLocal) {
        this.enhanceLocally();
      }
    } finally {
      this.enhanceBtn.disabled = false;
      this.enhanceBtn.textContent = `Enhance with ${this.apiSettings.provider || 'AI'}`;
    }
  }

  enhanceLocally() {
    if (!this.currentJSON) return;

    try {
      const enhanced = { ...this.currentJSON };

      // Add missing meta fields
      if (enhanced.meta) {
        enhanced.meta.enhanced = true;
        enhanced.meta.enhancedAt = new Date().toISOString();
        enhanced.meta.enhancementType = 'local';
        if (!enhanced.meta.version) enhanced.meta.version = '1.0';
        if (!enhanced.meta.tags) enhanced.meta.tags = [];
      }

      // Enhance context section
      if (enhanced.context) {
        if (!enhanced.context.priority) enhanced.context.priority = 'medium';
        if (!enhanced.context.complexity) enhanced.context.complexity = 'moderate';
        if (!enhanced.context.timeframe) enhanced.context.timeframe = 'flexible';
      }

      // Enhance problem section
      if (enhanced.problem) {
        if (!enhanced.problem.category) enhanced.problem.category = 'general';
        if (!enhanced.problem.urgency) enhanced.problem.urgency = 'normal';
        if (enhanced.problem.goal && !enhanced.problem.objectives) {
          enhanced.problem.objectives = [enhanced.problem.goal];
        }
      }

      // Enhance solution section
      if (enhanced.solution) {
        if (!enhanced.solution.approach) enhanced.solution.approach = 'systematic';
        if (!enhanced.solution.estimatedDuration) enhanced.solution.estimatedDuration = 'TBD';
        if (enhanced.solution.steps && !enhanced.solution.milestones) {
          enhanced.solution.milestones = enhanced.solution.steps.map((step, index) => ({
            step: index + 1,
            description: step,
            status: 'pending'
          }));
        }
      }

      // Enhance output section
      if (enhanced.output) {
        if (!enhanced.output.deliverables) enhanced.output.deliverables = [];
        if (!enhanced.output.qualityMetrics) enhanced.output.qualityMetrics = [];
        if (!enhanced.output.reviewProcess) enhanced.output.reviewProcess = 'standard';
      }

      // Add validation section if missing
      if (!enhanced.validation) {
        enhanced.validation = {
          criteria: [],
          testCases: [],
          acceptanceThreshold: 'high'
        };
      }

      // Add resources section if missing
      if (!enhanced.resources) {
        enhanced.resources = {
          required: [],
          optional: [],
          budget: 'TBD'
        };
      }

      this.currentJSON = enhanced;
      this.displayJSON(enhanced);
      this.showNotification('JSON enhanced locally!', 'success');

    } catch (error) {
      this.showNotification(`Local enhancement failed: ${error.message}`, 'error');
    }
  }

  async callAIAPI(json) {
    const { provider, key } = this.apiSettings;
    
    if (!provider || !key) {
      throw new Error('Provider and API key are required');
    }

    const prompt = `Please enhance this JSON structure by:
1. Adding more detailed and specific fields where appropriate
2. Improving the organization and hierarchy
3. Adding relevant metadata
4. Ensuring consistency and completeness

Current JSON:
${JSON.stringify(json, null, 2)}

Return only the enhanced JSON, no explanations.`;

    let apiUrl, headers, body, method = 'POST';

    switch (provider.toLowerCase()) {
      case 'openai':
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        headers = {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        };
        body = {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 2000
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
          model: 'claude-3-haiku-20240307',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        };
        break;
        
      case 'gemini':
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`;
        headers = {
          'Content-Type': 'application/json'
        };
        body = {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000
          }
        };
        break;
        
      default:
        throw new Error(`Unsupported provider: ${provider}. Supported providers are: openai, anthropic, gemini`);
    }

    try {
      const response = await fetch(apiUrl, {
        method,
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API request failed (${response.status}): ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error.message || errorData.error.code || errorMessage;
          }
        } catch (e) {
          // Use default error message if JSON parsing fails
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      let content;

      switch (provider.toLowerCase()) {
        case 'openai':
          if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from OpenAI');
          }
          content = data.choices[0].message.content;
          break;
          
        case 'anthropic':
          if (!data.content || !data.content[0] || !data.content[0].text) {
            throw new Error('Invalid response format from Anthropic');
          }
          content = data.content[0].text;
          break;
          
        case 'gemini':
          if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
            throw new Error('Invalid response format from Gemini');
          }
          content = data.candidates[0].content.parts[0].text;
          break;
      }

      if (!content) {
        throw new Error('Empty response from AI provider');
      }

      // Extract JSON from response - try multiple patterns
      let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        jsonMatch = content.match(/```\s*([\s\S]*?)\s*```/);
      }
      if (!jsonMatch) {
        jsonMatch = content.match(/\{[\s\S]*\}/);
      }
      
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response. Response: ' + content.substring(0, 200) + '...');
      }

      try {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (parseError) {
        throw new Error('Failed to parse JSON from AI response: ' + parseError.message);
      }
      
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to AI provider. Check your internet connection.');
      }
      throw error;
    }
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