// Lightweight, deterministic transformer used by both extension and web app.
(function(global){
  function uid(){ return 'pj-' + Math.random().toString(36).slice(2,10); }
  function nowISO(){ return new Date().toISOString(); }

  function splitLines(text){ return text ? text.replace(/\r/g,'').split('\n') : []; }
  function isBullet(line){ return /^\s*(?:[-*•]|\d+\.)\s+/.test(line); }
  function stripBullet(line){ return line.replace(/^\s*(?:[-*•]|\d+\.)\s+/, '').trim(); }

  function sectionize(text){
    const sections = {};
    let current = 'body';
    sections[current] = [];
    const lines = splitLines(text || '');
    for(const ln of lines){
      const m = ln.match(/^\s*([A-Za-z ]{3,30}):\s*$/);
      if(m){
        current = m[1].toLowerCase().trim();
        sections[current] = [];
        continue;
      }
      (sections[current] = sections[current] || []).push(ln);
    }
    return Object.fromEntries(Object.entries(sections).map(([k,v])=>[k, v.join('\n').trim()]));
  }

  function bulletsToArray(block){
    if(!block) return null;
    const arr = [];
    for(const line of splitLines(block)){
      if(isBullet(line)) arr.push(stripBullet(line));
      else if(line.trim().length && line.split('|').length>1) {
        // support "item | description" on same line -> treat as bullet
        arr.push(line.trim());
      }
    }
    return arr.length ? arr : null;
  }

  function codeFences(text){
    const fences = [];
    if(!text) return fences;
    const re = /```([\w-]*)\n([\s\S]*?)```/g; let m;
    while((m = re.exec(text))){
      fences.push({lang: m[1]||'text', code: m[2].trim()});
    }
    return fences;
  }

  function guessGoal(text){
    if(!text) return '';
    const firstLine = splitLines(text).find(l=>l.trim().length>0) || '';
    const imper = firstLine.match(/^(?:Write|Create|Build|Design|Explain|Summarize|Generate|Translate|Produce)\b/i);
    return imper ? firstLine.trim() : text.slice(0, 200).trim();
  }

  function guessTone(text){
    if(!text) return undefined;
    const tones = ['formal','friendly','playful','concise','persuasive','neutral','technical','casual'];
    const low = text.toLowerCase();
    for(const t of tones){ if(low.includes(t)) return t; }
    return undefined;
  }

  function extractForbids(text){
    if(!text) return undefined;
    const res = [];
    const lines = splitLines(text);
    for(const l of lines){
      if(/\b(?:don’t|dont|do not|avoid|never|no\s+)/i.test(l)) res.push(l.trim());
    }
    return res.length ? res : undefined;
  }

  function maybeJSONSchema(fences){
    for(const f of fences){
      if(f.lang && f.lang.toLowerCase().includes('json')){
        try { const obj = JSON.parse(f.code); if (obj && typeof obj === 'object') return obj; } catch(e){}
      }
      if(!f.lang || f.lang==='text'){
        try { const obj = JSON.parse(f.code); if (obj && typeof obj === 'object') return obj; } catch(e){}
      }
    }
    return undefined;
  }

  function toStructuredJSON(raw, opts={}){
    const source = opts.source || 'unknown';
    const sections = sectionize(raw || '');
    const fences = codeFences(raw || '');

    const meta = { id: uid(), source, createdAt: nowISO(), language: opts.language || undefined, sensitivity: 'low' };

    const body = sections.body || raw || '';
    const context = {
      role: sections.context || undefined,
      background: sections.background || undefined,
      audience: sections.audience || undefined,
      tone: guessTone(raw),
      writingStyle: sections.style || undefined,
      domain: sections.domain || undefined
    };

    const problem = {
      goal: (sections.goal || guessGoal(body) || '').trim(),
      inputs: bulletsToArray(sections.inputs || '') || undefined,
      assumptions: bulletsToArray(sections.assumptions || '') || undefined,
      constraints: bulletsToArray(sections.constraints || '') || undefined,
      forbidden: bulletsToArray(sections.forbidden || '') || extractForbids(raw)
    };

    const examples = fences.filter(f=>!f.lang || f.lang==='').map(f=>f.code).slice(0,3);
    const output = {
      format: (sections.output && /json|markdown|html|text|yaml/i.test(sections.output)) ? sections.output.toLowerCase() : 'json',
      schema: maybeJSONSchema(fences) || undefined,
      examples: examples.length > 0 ? examples : undefined
    };

    const solution = {
      steps: bulletsToArray(sections.steps || sections.plan || '') || undefined,
      qualityCriteria: bulletsToArray(sections.quality || sections.acceptance || '') || undefined,
      edgeCases: bulletsToArray(sections.edgecases || sections.edges || '') || undefined,
      tools: bulletsToArray(sections.tools || '') || undefined
    };

    const notes = bulletsToArray(sections.notes || '') || undefined;

    const obj = { meta, context, problem, solution, output, notes };

    // Clean undefineds
    return JSON.parse(JSON.stringify(obj));
  }

  // UMD export
  global.PromptJSON = { toStructuredJSON };
})(typeof window !== 'undefined' ? window : globalThis);