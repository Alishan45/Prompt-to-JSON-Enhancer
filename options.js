// Load saved settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const settings = await chrome.storage.sync.get(['provider', 'key', 'enrich']);
    if (settings.provider) {
      document.getElementById('prov').value = settings.provider;
    }
    if (settings.key) {
      document.getElementById('key').value = settings.key;
    }
    if (settings.enrich !== undefined) {
      document.getElementById('enrich').checked = settings.enrich;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
});

document.getElementById('save').addEventListener('click', async () => {
  const provider = document.getElementById('prov').value;
  const key = document.getElementById('key').value;
  const enrich = document.getElementById('enrich').checked;
  
  try {
    await chrome.storage.sync.set({ provider, key, enrich });
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showStatus('Failed to save settings: ' + error.message, 'error');
  }
});

document.getElementById('test').addEventListener('click', async () => {
  // Get current values from the form, not from storage
  const provider = document.getElementById('prov').value;
  const key = document.getElementById('key').value;
  
  if (!key.trim()) { 
    showStatus('No API key entered. Please enter your API key first.', 'error');
    return; 
  }
  
  if (!provider) {
    showStatus('No provider selected. Please select a provider first.', 'error');
    return;
  }
  
  showStatus(`Testing ${provider.toUpperCase()} API key...`, 'info');
  
  try {
    const isValid = await testAPIKey(key.trim(), provider);
    if (isValid) {
      showStatus(`${provider.toUpperCase()} API key is valid and working!`, 'success');
    } else {
      showStatus(`${provider.toUpperCase()} API key test failed. Please check your key.`, 'error');
    }
  } catch (error) {
    showStatus('Test failed: ' + error.message, 'error');
  }
});

document.getElementById('openPromptPage').addEventListener('click', () => {
  const url = chrome.runtime.getURL('prompt-page.html');
  chrome.tabs.create({ url });
});

async function testAPIKey(key, provider) {
  if (!key || !provider) {
    throw new Error('API key and provider are required');
  }

  let apiUrl, headers, body, method = 'GET';
  
  switch (provider.toLowerCase()) {
    case 'openai':
      apiUrl = 'https://api.openai.com/v1/models';
      headers = {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      };
      method = 'GET';
      break;
      
    case 'anthropic':
      // Anthropic doesn't have a simple test endpoint, so we'll make a minimal request
      apiUrl = 'https://api.anthropic.com/v1/messages';
      headers = {
        'x-api-key': key,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      };
      body = {
        model: 'claude-3-haiku-20240307',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hi' }]
      };
      method = 'POST';
      break;
      
    case 'gemini':
      // Test with a simple generateContent request instead of listing models
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      headers = {
        'Content-Type': 'application/json'
      };
      body = {
        contents: [{
          parts: [{
            text: 'Hi'
          }]
        }],
        generationConfig: {
          maxOutputTokens: 10
        }
      };
      method = 'POST';
      break;
      
    default:
      throw new Error(`Unsupported provider: ${provider}. Supported providers are: openai, anthropic, gemini`);
  }

  try {
    console.log(`Testing ${provider} API with URL: ${apiUrl}`);
    console.log('Headers:', headers);
    
    const response = await fetch(apiUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      
      let errorMessage = `API test failed (${response.status}): ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = errorData.error.message || errorData.error.code || errorMessage;
        }
      } catch (e) {
        // Use default error message if JSON parsing fails
        console.log('Failed to parse error response as JSON');
      }
      
      throw new Error(errorMessage);
    }

    // Additional validation for successful responses
    const data = await response.json();
    
    switch (provider.toLowerCase()) {
      case 'openai':
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid response format from OpenAI API');
        }
        break;
        
      case 'anthropic':
        if (!data.content || !Array.isArray(data.content)) {
          throw new Error('Invalid response format from Anthropic API');
        }
        break;
        
      case 'gemini':
        if (!data.candidates || !Array.isArray(data.candidates)) {
          throw new Error('Invalid response format from Gemini API');
        }
        break;
    }

    return true;
    
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to API. Check your internet connection.');
    }
    throw error;
  }
}

function showStatus(message, type = 'info') {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  
  // Remove existing status classes
  statusElement.classList.remove('status-success', 'status-error', 'status-info');
  
  // Add appropriate status class
  statusElement.classList.add(`status-${type}`);
  
  // Clear status after 5 seconds for success/info messages
  if (type !== 'error') {
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.classList.remove(`status-${type}`);
    }, 5000);
  }
}