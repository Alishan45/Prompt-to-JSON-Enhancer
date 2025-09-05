(function(){
  const root = document.createElement('div');
  const shadow = root.attachShadow({mode:'open'});
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL('modal.css') : 'modal.css';
  const wrap = document.createElement('div');
  wrap.className = 'pjz-wrap';
  wrap.innerHTML = '<button class=\"pjz-btn\">🧩 JSONify</button>';

  const modal = document.createElement('div');
  modal.className = 'pjz-modal';
  modal.innerHTML = `
    <div class=\"pjz-backdrop\"></div>
    <div class=\"pjz-card\">
      <div class=\"pjz-head\">
        <div class=\"pjz-title\">Prompt‑to‑JSON Enhancer</div>
        <div class=\"pjz-badge\">local · heuristic</div>
        <button id=\"pjzClose\" class=\"pjz-btn pjz-secondary\" style=\"margin-left:auto\">Close</button>
      </div>
      <div class=\"pjz-body\">
        <textarea id=\"pjzInput\" class=\"pjz-textarea\" placeholder=\"Paste or auto‑captured prompt...\"></textarea>
        <pre id=\"pjzOutput\" class=\"pjz-pre\"></pre>
      </div>
      <div class=\"pjz-actions\">
        <button id=\"pjzCapture\" class=\"pjz-btn pjz-secondary\">Capture from page</button>
        <button id=\"pjzCopy\" class=\"pjz-btn pjz-secondary\">Copy JSON</button>
        <button id=\"pjzDownload\" class=\"pjz-btn\">Download .json</button>
      </div>
    </div>`;

  shadow.append(style, wrap, modal);
  document.documentElement.appendChild(root);

  const out = shadow.getElementById('pjzOutput');
  const inp = shadow.getElementById('pjzInput');

  function transform(){
    try {
      const json = window.PromptJSON.toStructuredJSON(inp.value, { source: detectSource() });
      out.textContent = JSON.stringify(json, null, 2);
    } catch(e){ out.textContent = 'Error: ' + e.message; }
  }

  function detectSource(){
    const h = location.hostname;
    if(/chat\\.openai\\.com/.test(h)) return 'chatgpt';
    if(/claude\\.ai/.test(h)) return 'claude';
    if(/gemini\\.google\\.com/.test(h)) return 'gemini';
    return 'unknown';
  }

  function openModal(){ 
    modal.style.display='block'; 
    setTimeout(() => {
      if (inp.value.trim()) {
        transform();
      }
    }, 100);
  }
  function closeModal(){ modal.style.display='none'; }

  shadow.getElementById('pjzClose').addEventListener('click', closeModal);
  shadow.querySelector('.pjz-backdrop').addEventListener('click', closeModal);
  shadow.querySelector('.pjz-wrap .pjz-btn').addEventListener('click', ()=>{
    captureFromPage();
    openModal();
  });

  inp.addEventListener('input', transform);
  shadow.getElementById('pjzCapture').addEventListener('click', ()=>{ captureFromPage(); transform(); });

  shadow.getElementById('pjzCopy').addEventListener('click', ()=>{
    navigator.clipboard.writeText(out.textContent).then(()=>{
      // small visual feedback
      const t = document.createElement('span'); t.textContent = ' Copied!'; t.style.marginLeft='8px'; t.style.fontSize='12px'; t.style.color='#4ade80';
      shadow.querySelector('.pjz-head').appendChild(t);
      setTimeout(()=>t.remove(), 1200);
    }).catch(()=>{});
  });

  shadow.getElementById('pjzDownload').addEventListener('click', ()=>{
    const blob = new Blob([out.textContent], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'prompt.json';
    a.click();
  });

  function captureFromPage(){
    // Try common editors on AI sites. Fallback: selected text.
    const candidates = [
      // ChatGPT (new composer and older fallbacks)
      'textarea[data-id=\"root\"]',
      'textarea[placeholder*=\"Send a message\"]',
      'div[contenteditable=\"true\"][data-qa=\"chat-composer\"]',
      // Claude
      'div[contenteditable=\"true\"][data-testid=\"composer\"]',
      // Gemini
      'textarea[aria-label*=\"Message\"]',
      'div[contenteditable=\"true\"][role=\"textbox\"]',
      // Generic editors
      'textarea',
      'input[type=\"text\"]'
    ];
    let value = '';
    for(const sel of candidates){
      try {
        const el = document.querySelector(sel);
        if(el){
          // prefer value, fallback to innerText/textContent
          value = el.value || el.innerText || el.textContent || '';
          if(value && value.trim()) break;
        }
      } catch(e){ continue; }
    }
    if(!value){
      value = window.getSelection?.()?.toString?.() || '';
    }
    if(value) { inp.value = value; }
  }

  // keyboard shortcut: Ctrl+Shift+J
  window.addEventListener('keydown', (e)=>{
    if(e.ctrlKey && e.shiftKey && e.key.toLowerCase()==='j'){
      captureFromPage();
      openModal();
    }
  });

  // expose a small API for other scripts
  window.PromptJSON_UI = {
    open: openModal,
    close: closeModal,
    setInput: (text)=>{ inp.value = text; transform(); }
  };

})();