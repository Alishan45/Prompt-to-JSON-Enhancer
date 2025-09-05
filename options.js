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
  const { key, provider } = await chrome.storage.sync.get(['key', 'provider']);
  
  if (!key) { 
    showStatus('No API key set. Please enter your API key first.', 'error');
    return; 
  }
  
  showStatus('Testing API key...', 'info');
  
  try {
    const isValid = await testAPIKey(key, provider);
    if (isValid) {
      showStatus('API key is valid and working!', 'success');
    } else {
      showStatus('API key test failed. Please check your key.', 'error');
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
  // Simple test request to validate the API key
  let apiUrl, headers, body;
  
  switch (provider) {
    case 'openai':
      apiUrl = 'https://api.openai.com/v1/models';
      headers = {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      };
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
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      };
      break;
      
    case 'gemini':
      apiUrl = `https://generativelanguage.googleapis.com/v1/models?key=${key}`;
      headers = {
        'Content-Type': 'application/json'
      };
      break;
      
    default:
      throw new Error('Unsupported provider');
  }

  const response = await fetch(apiUrl, {
    method: body ? 'POST' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  return response.ok;
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