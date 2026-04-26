/* ═══════════════════════════════════════════════════════════════════
   AI VIRTUAL STUDIO — app.js
   Providers: Pollinations AI (Free/No Key) | Hugging Face (Free) | OpenAI
   ═══════════════════════════════════════════════════════════════════ */
'use strict';

// ─────────────────────────────────────── STATE ────
const state = {
  model:      null,
  apparel:    null,
  background: null,
  style:      null,
  provider:   'pollinations',   // default: free, no key
  pollinationsModel: 'flux',
  hfToken:    null,
  hfModel:    'black-forest-labs/FLUX.1-schnell',
  apiKey:     null,
  aiModel:    'dall-e-3',
  quality:    'standard',
  controls: {
    hyperRealism: false, cinematic: false, colorGrade: 'none',
    shotType: 'full-body-front', expression: 'neutral', angle: 'eye-level',
    focal: '50mm', aperture: 'f1.8', fabric: 'as-described',
    timeOfDay: 'none', lighting: 'studio-softbox',
    aspect: 'portrait', numImages: 1, ecomPack: 'off',
    socialPack: false, completePack: false, background: null,
    modelStyling: '', garmentStyling: '', sceneProps: '',
    envEffects: '', mainPrompt: '', customOverride: '',
  },
  looks: [], generating: false, results: [],
};

// ─────────────────────────────────────── SIZE MAPS ────
const POLL_SIZES = { portrait:'768x1024', square:'1024x1024', landscape:'1024x576', stories:'576x1024' };
const HF_SIZES   = { portrait:[768,1024], square:[1024,1024], landscape:[1024,576], stories:[576,1024] };
const DAL3_SIZES = { portrait:'1024x1792', square:'1024x1024', landscape:'1792x1024', stories:'1024x1792' };
const DAL2_SIZES = { portrait:'512x512',   square:'1024x1024', landscape:'1024x1024', stories:'512x512' };

// ─────────────────────────────────────── LABEL MAPS (for prompt building) ────
const SHOT_LABELS = {
  'full-body-front':'full body front view','hand-on-hip':'hand on hip pose',
  'back-view':'back view pose','3-4-view':'3/4 angle view','profile':'profile side view',
  'waist-up':'waist-up portrait','walking':'walking motion pose','elegant-lean':'elegant lean pose',
  'sitting':'sitting pose','candid':'casual candid look','hero':'hero pose, powerful stance',
  'action':'dynamic action pose','over-shoulder':'looking over shoulder',
  'leaning-forward':'leaning forward towards camera','hands-pockets':'hands in pockets pose',
  'twirl':'dynamic twirling motion','pov-selfie':'POV selfie shot',
  'pov-mirror':'POV mirror selfie','pov-action':"POV action shot",
  'closeup-detail':'close-up detail shot of the garment',
  'accessory-focus':'accessory focus shot','outfit-check':'POV outfit check from above',
};
const LIGHTING_LABELS = {
  'studio-softbox':'soft diffused studio softbox lighting',
  'flat-even':'bright flat even shadowless e-commerce lighting',
  'golden-hour':'warm golden hour sunlight from the side',
  'dramatic-hard':'dramatic hard lighting with strong defined shadows',
  'midday-sun':'bright direct midday sunlight with harsh shadows',
  'overcast':'soft diffused overcast sky lighting minimal shadows',
  'blue-hour':'cool blue hour twilight ambient lighting',
  'dappled':'natural dappled sunlight filtering through leaves',
  'window-light':'soft Rembrandt-style directional window light',
  'rim-light':'dramatic rim backlight creating a bright outline',
  'neon-glow':'vibrant neon lights casting pink and blue hues',
  'moonlight':'cool mysterious moonlight illumination',
  'split':'classic split portrait lighting half light half shadow',
  'candlelight':'warm intimate flickering candlelight',
  'projector':'artistic projector light patterns cast on the model',
  'gobo':'artistic gobo shadow patterns venetian blind shadows',
};
const GRADE_LABELS = {
  'teal-orange':'cinematic teal and orange color grade',
  'vintage':'vintage film color grading warm highlights faded shadows',
  'bw':'high-contrast black and white film photography',
  'vibrant':'vibrant punchy saturated colors',
  'muted':'muted moody desaturated color palette',
  'warm':'warm golden color tone','cool':'cool crisp color temperature',
};
const BG_LABELS = {
  'studio-white':'pure white infinity studio backdrop',
  'studio-grey':'neutral grey studio backdrop','studio-black':'dark black studio backdrop',
  'pastel-grad':'soft pastel gradient in pink purple and blue',
  'sunset-grad':'vibrant sunset gradient','gallery':'minimalist art gallery interior white walls',
  'city-street':'urban city street','modern-interior':'modern minimalist interior',
  'brutalist':'brutalist concrete architecture','cozy-cafe':'warm cozy cafe interior',
  'industrial':'industrial loft exposed brick and metal',
  'neon-city':'neon-lit futuristic cityscape at night',
  'rooftop-sunset':'rooftop terrace at sunset','luxury-hotel':'luxury hotel lobby interior',
  'sunny-beach':'sunny tropical beach clear blue water',
  'lush-forest':'lush green forest with dappled light',
  'rooftop-garden':'rooftop garden with greenery',
  'desert-dune':'golden sand desert dunes landscape',
  'mountain':'dramatic mountain vista blue sky',
  'flower-field':'vibrant flowering meadow',
  'autumn-forest':'colorful autumn forest red and orange leaves',
  'old-library':'vintage old library wooden bookshelves',
  'surreal':'surreal dreamscape ethereal colors',
  'abstract':'abstract geometric shapes background',
  'vintage-room':'vintage retro styled room interior',
  'sci-fi':'sci-fi corridor futuristic lighting',
  'graffiti':'urban graffiti art wall',
  'art-deco':'art deco lobby gold accents geometric patterns',
  'cyberpunk':'cyberpunk alley neon signs rain',
  'bohemian':'bohemian cafe colorful textiles plants',
};

// ─────────────────────────────────────── DOM ────
const $ = id => document.getElementById(id);

// ─────────────────────────────────────── INIT ────
document.addEventListener('DOMContentLoaded', () => {
  initBanner(); initHeaderTabs(); initRightTabs();
  initUploadZones(); initWebcam(); initPromptCounter();
  initPillGroups(); initToggles(); initGenerate();
  initLooks(); initCanvasActions(); initModals();
  initAiEnhance(); initProviderModal(); initCanvasPromptOverride();
  loadLooksFromStorage(); loadSettingsFromStorage();
  updateGenerateState();
  // Auto-open AI Engine modal on first visit if no token saved
  if (!localStorage.getItem('vs_hf_token') && !localStorage.getItem('vs_openai_key')) {
    setTimeout(() => openProviderModal(), 800);
  }
});

// ─────────────────────────────────────── BANNER ────
function initBanner() {
  $('wa-close')?.addEventListener('click', () => {
    $('wa-banner').style.display = 'none';
    document.body.classList.add('banner-closed');
  });
}

// ─────────────────────────────────────── HEADER TABS ────
function initHeaderTabs() {
  document.querySelectorAll('.header-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.header-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      tab.classList.add('active'); tab.setAttribute('aria-selected','true');
    });
  });
}

// ─────────────────────────────────────── RIGHT PANEL TABS ────
function initRightTabs() {
  document.querySelectorAll('.right-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const t = tab.dataset.rtab;
      document.querySelectorAll('.right-tab').forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.right-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active'); tab.setAttribute('aria-selected','true');
      $(`rtab-content-${t}`)?.classList.add('active');
    });
  });
}

// ─────────────────────────────────────── UPLOAD ────
function initUploadZones() {
  document.querySelectorAll('.upload-zone').forEach(zone => {
    const target = zone.dataset.target;
    zone.addEventListener('click', e => { if (e.target.closest('.preview-remove')) return; zone.querySelector('input[type="file"]')?.click(); });
    zone.querySelector('input[type="file"]')?.addEventListener('change', e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], target); });
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f?.type.startsWith('image/')) handleFileUpload(f, target);
      else showToast('Please drop an image file', 'error');
    });
  });
  document.querySelectorAll('.preview-remove').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); removeUpload(btn.dataset.target); });
  });
}

function handleFileUpload(file, target) {
  const reader = new FileReader();
  reader.onload = e => {
    state[target] = { dataUrl: e.target.result };
    showUploadPreview(target, e.target.result);
    if (target === 'model') {
      const ml = $('toggle-match-lighting');
      if (ml) { ml.disabled = false; $('match-lighting-hint').textContent = 'Match lighting from uploaded model.'; }
    }
    updateGenerateState();
    showToast(`${capitalize(target)} uploaded`, 'success');
  };
  reader.readAsDataURL(file);
}

function showUploadPreview(target, dataUrl) {
  const preview = $(`${target}-preview`), ph = $(`${target}-placeholder`), img = $(`${target}-preview-img`);
  if (img) img.src = dataUrl;
  if (preview) preview.style.display = 'block';
  if (ph) ph.style.display = 'none';
}

function removeUpload(target) {
  state[target] = null;
  const preview = $(`${target}-preview`), ph = $(`${target}-placeholder`), img = $(`${target}-preview-img`);
  if (preview) preview.style.display = 'none';
  if (ph) ph.style.display = 'flex';
  if (img) img.src = '';
  const fi = document.querySelector(`#${target}-file-input`); if (fi) fi.value = '';
  if (target === 'model') {
    const ml = $('toggle-match-lighting');
    if (ml) { ml.disabled = true; ml.checked = false; $('match-lighting-hint').textContent = 'Upload a model image to enable.'; }
  }
  updateGenerateState();
  showToast(`${capitalize(target)} removed`, 'info');
}

// ─────────────────────────────────────── WEBCAM ────
let webcamStream = null;
function initWebcam() {
  $('btn-webcam')?.addEventListener('click', async () => {
    $('webcam-modal').style.display = 'flex';
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
      $('webcam-video').srcObject = webcamStream;
    } catch { showToast('Camera access denied', 'error'); $('webcam-modal').style.display = 'none'; }
  });
  $('webcam-close')?.addEventListener('click', closeWebcam);
  $('webcam-modal')?.addEventListener('click', e => { if (e.target===$('webcam-modal')) closeWebcam(); });
  $('btn-capture')?.addEventListener('click', () => {
    if (!webcamStream) return;
    const canvas=$('webcam-canvas'), video=$('webcam-video');
    canvas.width=video.videoWidth; canvas.height=video.videoHeight;
    canvas.getContext('2d').drawImage(video,0,0);
    const dataUrl=canvas.toDataURL('image/jpeg',0.85);
    state.model={dataUrl}; showUploadPreview('model',dataUrl);
    updateGenerateState(); closeWebcam();
    showToast('Photo captured!','success');
  });
}
function closeWebcam() {
  if (webcamStream) { webcamStream.getTracks().forEach(t=>t.stop()); webcamStream=null; }
  const v=$('webcam-video'); if(v) v.srcObject=null;
  $('webcam-modal').style.display='none';
}

// ─────────────────────────────────────── PROMPT COUNTER ────
function initPromptCounter() {
  const ta=$('main-prompt'), ctr=$('prompt-counter'); if(!ta||!ctr) return;
  ta.addEventListener('input', () => { state.controls.mainPrompt=ta.value; ctr.textContent=`${ta.value.length}/500`; });
}

// ─────────────────────────────────────── AI ENHANCE ────
function initAiEnhance() {
  const btn=$('btn-enhance-prompt'), ta=$('main-prompt'); if(!btn) return;
  const suf=['ultra-detailed photorealistic 8K fashion photography professional studio quality',
    'shot on Hasselblad H6D cinematic depth of field Vogue magazine editorial quality',
    'commercial fashion photography crisp vivid colors flawless professional composition',
    'high-fashion editorial luxury brand aesthetic immaculate styling magazine cover'];
  btn.addEventListener('click', () => {
    const base=ta.value.trim(), s=suf[Math.floor(Math.random()*suf.length)];
    ta.value=(base?`${base}, ${s}`:s).slice(0,500); ta.dispatchEvent(new Event('input'));
    showToast('Prompt enhanced!','success'); btn.textContent='✅ Enhanced!';
    setTimeout(()=>btn.textContent='✨ AI Enhance',2000);
  });
}

// ─────────────────────────────────────── PILL GROUPS ────
function initPillGroups() {
  document.addEventListener('click', e => {
    const pill=e.target.closest('.pill');
    if (pill?.dataset.group) {
      document.querySelectorAll(`.pill[data-group="${pill.dataset.group}"]`).forEach(p=>p.classList.remove('active'));
      pill.classList.add('active'); updateCtrl(pill.dataset.group, pill.dataset.value); return;
    }
    const pack=e.target.closest('.pack-btn');
    if (pack?.dataset.group) {
      document.querySelectorAll(`.pack-btn[data-group="${pack.dataset.group}"]`).forEach(b=>b.classList.remove('active'));
      pack.classList.add('active'); updateCtrl(pack.dataset.group, pack.dataset.value); return;
    }
    const asp=e.target.closest('.aspect-btn');
    if (asp?.dataset.group) {
      document.querySelectorAll(`.aspect-btn[data-group="${asp.dataset.group}"]`).forEach(b=>b.classList.remove('active'));
      asp.classList.add('active'); updateCtrl(asp.dataset.group, asp.dataset.value); return;
    }
    const lc=e.target.closest('.lighting-card');
    if (lc?.dataset.group) {
      document.querySelectorAll(`.lighting-card[data-group="${lc.dataset.group}"]`).forEach(c=>c.classList.remove('active'));
      lc.classList.add('active'); updateCtrl(lc.dataset.group, lc.dataset.value); return;
    }
    const th=e.target.closest('.preset-thumb');
    if (th) {
      document.querySelectorAll('.preset-thumb').forEach(t=>t.classList.remove('active'));
      th.classList.add('active'); state.controls.background=th.dataset.bg;
      showToast(`Background: "${th.querySelector('span').textContent}"`, 'info');
    }
  });
}

function updateCtrl(group, value) {
  const map={'shot':'shotType','expression':'expression','angle':'angle','focal':'focal',
    'aperture':'aperture','fabric':'fabric','tod':'timeOfDay','lighting':'lighting',
    'aspect':'aspect','num-images':'numImages','ecom-pack':'ecomPack'};
  const k=map[group]; if(k) state.controls[k]=group==='num-images'?parseInt(value):value;
}

// ─────────────────────────────────────── TOGGLES ────
function initToggles() {
  $('toggle-hyper-realism')?.addEventListener('change', e=>state.controls.hyperRealism=e.target.checked);
  $('toggle-cinematic')?.addEventListener('change',     e=>state.controls.cinematic=e.target.checked);
  $('toggle-match-lighting')?.addEventListener('change',e=>state.controls.matchLighting=e.target.checked);
  $('toggle-social-pack')?.addEventListener('change',   e=>state.controls.socialPack=e.target.checked);
  $('toggle-complete-pack')?.addEventListener('change', e=>state.controls.completePack=e.target.checked);
  $('select-color-grade')?.addEventListener('change',   e=>state.controls.colorGrade=e.target.value);
  $('model-styling')?.addEventListener('input',         e=>state.controls.modelStyling=e.target.value);
  $('garment-styling')?.addEventListener('input',       e=>state.controls.garmentStyling=e.target.value);
  $('scene-props')?.addEventListener('input',           e=>state.controls.sceneProps=e.target.value);
  $('env-effects')?.addEventListener('input',           e=>state.controls.envEffects=e.target.value);
  $('custom-prompt-override')?.addEventListener('input',e=>state.controls.customOverride=e.target.value);
  $('btn-gen-bg')?.addEventListener('click', () => {
    const p=$('ai-bg-prompt').value.trim(); if(!p){showToast('Enter a background description','error');return;}
    const btn=$('btn-gen-bg'); btn.textContent='Queued ✓'; btn.disabled=true;
    state.controls.background=`ai:${p}`;
    setTimeout(()=>{btn.textContent='Generate';btn.disabled=false;},2000);
    showToast('AI background queued','success');
  });
}

// ─────────────────────────────────────── PROVIDER MODAL ────
function initProviderModal() {
  $('btn-open-apikey')?.addEventListener('click', openProviderModal);
  $('apikey-close')?.addEventListener('click',    ()=>$('apikey-modal').style.display='none');
  $('apikey-modal')?.addEventListener('click',    e=>{if(e.target===$('apikey-modal'))$('apikey-modal').style.display='none';});

  // Provider radio → show/hide settings panels
  document.querySelectorAll('input[name="provider"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const v = radio.value;
      document.querySelectorAll('.provider-settings').forEach(s=>s.style.display='none');
      $(`settings-${v}`).style.display = 'flex';
      $(`settings-${v}`).style.flexDirection = 'column';
      $(`settings-${v}`).style.gap = '12px';
    });
  });

  // Show/hide password fields
  $('btn-apikey-toggle')?.addEventListener('click', () => {
    const i=$('apikey-input'); i.type=i.type==='password'?'text':'password';
  });
  $('btn-hf-toggle')?.addEventListener('click', () => {
    const i=$('hf-token-input'); i.type=i.type==='password'?'text':'password';
  });

  // Save
  $('btn-apikey-save')?.addEventListener('click', saveProviderSettings);

  // Reset
  $('btn-apikey-clear')?.addEventListener('click', () => {
    state.provider='pollinations'; state.apiKey=null; state.hfToken=null;
    try {
      localStorage.removeItem('vs_provider'); localStorage.removeItem('vs_openai_key');
      localStorage.removeItem('vs_hf_token');
    } catch(e){}
    $('prov-pollinations').checked=true;
    document.querySelectorAll('.provider-settings').forEach(s=>s.style.display='none');
    $('settings-pollinations').style.display='flex';
    $('apikey-status').style.display='none';
    updateKeyIndicator(true,'pollinations');
    showToast('Reset to free Pollinations AI','info');
    $('apikey-modal').style.display='none';
  });
}

function openProviderModal() {
  $('apikey-modal').style.display='flex';
  $('apikey-status').style.display='none';

  // Restore current selection in UI
  if (state.provider) {
    const radio=document.querySelector(`input[name="provider"][value="${state.provider}"]`);
    if (radio) { radio.checked=true; radio.dispatchEvent(new Event('change')); }
  }
  if (state.apiKey)  $('apikey-input').value=state.apiKey;
  if (state.hfToken) $('hf-token-input').value=state.hfToken;
  if (state.pollinationsModel) $('pollinations-model-select').value=state.pollinationsModel;
  if (state.hfModel) $('hf-model-select').value=state.hfModel;
  if (state.aiModel) $('apikey-model-select').value=state.aiModel;
  if (state.quality) $('apikey-quality-select').value=state.quality;
}

function saveProviderSettings() {
  return saveProviderSettingsAsync();
}
async function saveProviderSettingsAsync() {
  const selected = document.querySelector('input[name="provider"]:checked')?.value || 'huggingface';
  const btn = $('btn-apikey-save');
  btn.textContent = 'Saving…'; btn.disabled = true;
  $('apikey-status').style.display = 'none';

  try {
    if (selected === 'huggingface') {
      const token = $('hf-token-input').value.trim();
      if (!token) { setApikeyStatus('Please enter your Hugging Face token', 'error'); return; }
      if (!token.startsWith('hf_')) { setApikeyStatus('Invalid token. HF tokens start with "hf_"', 'error'); return; }
      const res = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) { setApikeyStatus('Invalid Hugging Face token. Please check and try again.', 'error'); return; }
      state.provider = 'huggingface';
      state.hfToken  = token;
      state.hfModel  = $('hf-model-select').value;
      saveSettingsToStorage();
      setApikeyStatus('✅ Hugging Face connected! Ready to generate.', 'success');
      updateKeyIndicator(true, 'huggingface');
      showToast('🤗 Hugging Face connected — free AI generation ready!', 'success');
      setTimeout(() => $('apikey-modal').style.display='none', 1400);

    } else if (selected === 'openai') {
      const key = $('apikey-input').value.trim();
      if (!key) { setApikeyStatus('Please enter your OpenAI API key', 'error'); return; }
      if (!key.startsWith('sk-')) { setApikeyStatus('Invalid key. OpenAI keys start with "sk-"', 'error'); return; }
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        setApikeyStatus(`OpenAI error: ${err.error?.message || res.statusText}`, 'error');
        return;
      }
      state.provider = 'openai'; state.apiKey = key;
      state.aiModel  = $('apikey-model-select').value;
      state.quality  = $('apikey-quality-select').value;
      saveSettingsToStorage();
      setApikeyStatus('✅ OpenAI connected!', 'success');
      updateKeyIndicator(true, 'openai');
      showToast('⚡ OpenAI DALL-E connected!', 'success');
      setTimeout(() => $('apikey-modal').style.display='none', 1400);
    }
  } catch (err) {
    setApikeyStatus(`Connection error: ${err.message}`, 'error');
  } finally {
    btn.textContent = 'Save & Connect'; btn.disabled = false;
  }
}

function setApikeyStatus(msg, type) {
  const el=$('apikey-status'); if(!el) return;
  if (!msg) { el.style.display='none'; return; }
  el.textContent=msg; el.className=`apikey-status ${type||''}`; el.style.display='block';
}

function updateKeyIndicator(connected, provider) {
  const dot=$('apikey-dot'), btn=$('btn-open-apikey'); if(!dot||!btn) return;
  dot.className=`apikey-dot ${connected?'connected':''}`;
  btn.className=`btn-apikey ${connected?'connected':''}`;

  // Update button text based on provider
  if (connected) {
    const label={'pollinations':'🌸 Free AI','huggingface':'🤗 HF Free','openai':'⚡ OpenAI'};
    btn.querySelector('svg').parentNode.childNodes.forEach(n=>{ if(n.nodeType===3) n.textContent=` ${label[provider]||'AI'} `; });
  }
}

function saveSettingsToStorage() {
  try {
    localStorage.setItem('vs_provider',          state.provider);
    localStorage.setItem('vs_poll_model',        state.pollinationsModel);
    if (state.hfToken)  localStorage.setItem('vs_hf_token',   state.hfToken);
    if (state.hfModel)  localStorage.setItem('vs_hf_model',   state.hfModel);
    if (state.apiKey)   localStorage.setItem('vs_openai_key', state.apiKey);
    if (state.aiModel)  localStorage.setItem('vs_ai_model',   state.aiModel);
    if (state.quality)  localStorage.setItem('vs_ai_quality', state.quality);
  } catch(e) {}
}

function loadSettingsFromStorage() {
  try {
    const p = localStorage.getItem('vs_provider');
    if (p) {
      state.provider          = p;
      state.pollinationsModel = 'flux';
      state.hfToken           = localStorage.getItem('vs_hf_token') || '';
      state.hfModel           = localStorage.getItem('vs_hf_model') || 'black-forest-labs/FLUX.1-schnell';
      state.apiKey            = localStorage.getItem('vs_openai_key');
      state.aiModel           = localStorage.getItem('vs_ai_model') || 'dall-e-3';
      state.quality           = localStorage.getItem('vs_ai_quality') || 'standard';
      updateKeyIndicator(true, state.provider);
    } else {
      // First launch — default to Hugging Face (free)
      state.provider = 'huggingface';
      state.hfModel  = 'black-forest-labs/FLUX.1-schnell';
      saveSettingsToStorage();
      updateKeyIndicator(false, 'huggingface');
    }
  } catch(e) {}
}

// ─────────────────────────────────────────────────────── CANVAS PROMPT OVERRIDE ────
function initCanvasPromptOverride() {
  const ta      = document.getElementById('canvas-custom-prompt');
  const counter = document.getElementById('cpo-counter');
  const clearBtn= document.getElementById('cpo-clear-btn');
  const wrapper = document.getElementById('canvas-prompt-override');
  if (!ta) return;

  const MAX = 800;

  ta.addEventListener('input', () => {
    const len = ta.value.length;
    if (counter) {
      counter.textContent = `${len} / ${MAX}`;
      counter.className = 'cpo-counter' + (len >= MAX ? ' at-limit' : len >= MAX * 0.85 ? ' near-limit' : '');
    }
    if (wrapper) wrapper.classList.toggle('has-content', len > 0);
    // Mirror to state so buildPrompt() picks it up
    state.controls.customOverride = ta.value.slice(0, MAX);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      ta.value = '';
      ta.dispatchEvent(new Event('input'));
    });
  }
}

// ─────────────────────────────────────── PROMPT BUILDER ────
function buildPrompt() {
  const c = state.controls;
  if (c.customOverride?.trim()) return c.customOverride.trim();
  const parts = ['professional fashion editorial photography', 'a model wearing the provided apparel'];
  const shot = SHOT_LABELS[c.shotType] || c.shotType; parts.push(shot);
  if (c.expression !== 'neutral') parts.push(`${c.expression} expression`);
  const angles={'eye-level':'eye-level','low':'low angle','high':'high angle','dutch':'dutch angle','worms-eye':"worm's eye view",'birds-eye':"bird's eye view"};
  parts.push(angles[c.angle]||'eye-level');
  parts.push(`${c.focal} lens`);
  const aps={'f1.8':'shallow depth of field f/1.8','f4':'medium depth of field f/4','f8':'deep focus f/8'};
  if (c.aperture) parts.push(aps[c.aperture]);
  if (c.fabric!=='as-described') parts.push(`${c.fabric} fabric`);
  parts.push(LIGHTING_LABELS[c.lighting]||c.lighting);
  if (c.timeOfDay!=='none') parts.push(`${c.timeOfDay} lighting`);
  if (c.background) {
    if (c.background.startsWith('ai:')) parts.push(`background: ${c.background.slice(3)}`);
    else if (BG_LABELS[c.background]) parts.push(`background: ${BG_LABELS[c.background]}`);
  }
  if (c.sceneProps?.trim()) parts.push(c.sceneProps.trim());
  if (c.envEffects?.trim()) parts.push(c.envEffects.trim());
  if (c.modelStyling?.trim()) parts.push(`model: ${c.modelStyling.trim()}`);
  if (c.garmentStyling?.trim()) parts.push(`garment: ${c.garmentStyling.trim()}`);
  const grade=GRADE_LABELS[c.colorGrade]; if(grade) parts.push(grade);
  if (c.hyperRealism) parts.push('hyper-realistic ultra-detailed 8K photorealistic');
  if (c.cinematic)    parts.push('cinematic film grain anamorphic lens flare');
  if (c.mainPrompt?.trim()) parts.push(c.mainPrompt.trim());
  parts.push('high quality sharp focus professional commercial photography');
  return parts.filter(Boolean).join(', ');
}

// ─────────────────────────────────────── GENERATE STATE ────
function updateGenerateState() {
  const canGenerate = !!(state.model && state.apparel);
  const btn=$('btn-generate-main'), hint=$('generate-hint'); if(!btn) return;
  if (canGenerate) { btn.classList.remove('disabled'); if(hint) hint.style.display='none'; }
  else {
    btn.classList.add('disabled');
    if (hint) {
      hint.style.display='block';
      if (!state.model && !state.apparel) hint.textContent='Please add a model and apparel to start.';
      else if (!state.model) hint.textContent='Please add a model to start.';
      else hint.textContent='Please add apparel to start.';
    }
  }
}

// ─────────────────────────────────────── GENERATION ────
function initGenerate() {
  const btn=$('btn-generate-main'); if(!btn) return;
  btn.classList.add('disabled');
  btn.addEventListener('click', startGeneration);
}

async function startGeneration() {
  if (state.generating) return;
  if (!state.model || !state.apparel) { showToast('Add a model and apparel first!','error'); return; }
  state.generating = true;

  const btn=$('btn-generate-main');
  btn.classList.add('generating');
  btn.querySelector('.btn-generate-text').textContent='Generating…';

  $('canvas-empty').style.display='none'; $('canvas-results').style.display='none'; $('canvas-actions').style.display='none';
  const genEl=$('canvas-generating'); genEl.style.display='flex';
  buildShimmerGrid();

  const prompt = buildPrompt();
  let previewEl = genEl.querySelector('.gen-prompt-preview');
  if (!previewEl) { previewEl=document.createElement('div'); previewEl.className='gen-prompt-preview'; genEl.appendChild(previewEl); }
  previewEl.textContent=`📝 ${prompt.slice(0,180)}${prompt.length>180?'…':''}`;

  const bar=  $('gen-progress-bar');
  const steps=document.querySelectorAll('.gen-step');
  steps.forEach(s=>s.classList.remove('active','done'));
  if (bar) bar.style.width='0%';

  activateStep(steps,0,bar,15); await sleep(300);

  try {
    let imageUrls=[];
    if (state.provider==='huggingface') {
      imageUrls = await generateHuggingFace(prompt, steps, bar);
    } else if (state.provider==='openai') {
      imageUrls = await generateOpenAI(prompt, steps, bar);
    } else {
      // No provider configured — open modal
      state.generating=false; resetGenerateButton();
      genEl.style.display='none'; $('canvas-empty').style.display='flex';
      openProviderModal();
      showToast('Please connect an AI provider first', 'info');
      return;
    }
    finishGeneration(imageUrls);
  } catch (err) {
    console.error(err);
    state.generating=false; resetGenerateButton();
    genEl.style.display='none'; $('canvas-empty').style.display='flex';
    showToast(`Generation failed: ${err.message}`, 'error');
  }
}

// ══════════════════ HUGGING FACE (FREE) ══════════════════
async function generateHuggingFace(prompt, steps, bar) {
  const count  = state.controls.numImages;
  const aspect = state.controls.aspect;
  const model  = state.hfModel;
  const [w, h] = HF_SIZES[aspect];

  activateStep(steps,1,bar,30);
  await sleep(200);
  activateStep(steps,2,bar,55);

  // HF returns binary blob, make parallel requests
  const requests = Array.from({length: count}, async () => {
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.hfToken}`,
        'Content-Type':  'application/json',
        'x-wait-for-model': 'true',
      },
      body: JSON.stringify({ inputs: prompt, parameters: { width: w, height: h, num_inference_steps: 4 } }),
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.error || `HF API error ${res.status}`);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  });

  activateStep(steps,3,bar,80);

  let results;
  try {
    results = await Promise.allSettled(requests);
  } catch(netErr) {
    // CORS / network error — likely running from file:// — auto-fallback to Pollinations
    showToast('🌸 Switching to Pollinations AI (HF needs HTTPS)', 'info');
    state.provider = 'pollinations';
    saveSettingsToStorage();
    updateKeyIndicator(true, 'pollinations');
    return await generatePollinations(prompt, steps, bar);
  }

  activateStep(steps,4,bar,100);
  await sleep(200);

  const urls   = results.filter(r=>r.status==='fulfilled').map(r=>r.value);
  const errors = results.filter(r=>r.status==='rejected').map(r=>r.reason?.message);

  // If ALL failed with network errors, auto-fallback to Pollinations
  if (!urls.length) {
    const isNetworkError = errors.some(e => e && (e.includes('fetch') || e.includes('network') || e.includes('CORS')));
    if (isNetworkError) {
      showToast('🌸 Auto-switching to Pollinations AI (works without HTTPS)', 'info');
      state.provider = 'pollinations';
      saveSettingsToStorage();
      updateKeyIndicator(true, 'pollinations');
      return await generatePollinations(prompt, steps, bar);
    }
    throw new Error(errors[0] || 'All HF requests failed');
  }
  if (errors.length) showToast(`${errors.length} image(s) failed`, 'info');
  return urls;
}

// ══════════════════ OPENAI DALL-E ══════════════════
async function generateOpenAI(prompt, steps, bar) {
  const count  = state.controls.numImages;
  const aspect = state.controls.aspect;
  const model  = state.aiModel;
  const size   = model==='dall-e-3' ? DAL3_SIZES[aspect] : DAL2_SIZES[aspect];

  activateStep(steps,1,bar,30); await sleep(300);
  activateStep(steps,2,bar,55);

  let requests;
  if (model==='dall-e-3') {
    requests = Array.from({length:count}, ()=>callDalle3(prompt, size));
  } else {
    requests = [callDalle2(prompt, size, count)];
  }

  activateStep(steps,3,bar,80);
  const results = await Promise.allSettled(requests);
  activateStep(steps,4,bar,100); await sleep(200);

  const urls=[], errors=[];
  results.forEach(r=>{ if(r.status==='fulfilled') { if(Array.isArray(r.value)) urls.push(...r.value); else if(r.value) urls.push(r.value); } else errors.push(r.reason?.message); });
  if (!urls.length) throw new Error(errors[0]||'DALL-E request failed');
  if (errors.length) showToast(`${errors.length} image(s) failed`,'info');
  return urls;
}

async function callDalle3(prompt, size) {
  const body={model:'dall-e-3', prompt, n:1, size, quality:state.quality, style:'vivid'};
  const res=await fetch('https://api.openai.com/v1/images/generations',{
    method:'POST', headers:{'Authorization':`Bearer ${state.apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify(body),
  });
  if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error?.message||`HTTP ${res.status}`); }
  return (await res.json()).data[0].url;
}

async function callDalle2(prompt, size, n) {
  const res=await fetch('https://api.openai.com/v1/images/generations',{
    method:'POST', headers:{'Authorization':`Bearer ${state.apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({model:'dall-e-2', prompt, n:Math.min(n,10), size}),
  });
  if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error?.message||`HTTP ${res.status}`); }
  return (await res.json()).data.map(d=>d.url);
}

// ─────────────────────────────────────── HELPERS ────
async function simulateSteps(steps, bar) {
  for (let i=0; i<steps.length; i++) { activateStep(steps,i,bar,Math.round(((i+1)/steps.length)*100)); await sleep(550); }
  await sleep(300);
}

function activateStep(steps, i, bar, pct) {
  if (i>0 && steps[i-1]) { steps[i-1].classList.remove('active'); steps[i-1].classList.add('done'); }
  if (steps[i]) steps[i].classList.add('active');
  if (bar) bar.style.width=`${pct}%`;
}

function sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }

function resetGenerateButton() {
  state.generating=false;
  const btn=$('btn-generate-main'); if(!btn) return;
  btn.classList.remove('generating');
  btn.querySelector('.btn-generate-text').textContent='Generate';
}

function finishGeneration(imageUrls) {
  resetGenerateButton();
  $('canvas-generating').style.display='none';
  buildResults(imageUrls);
  $('canvas-results').style.display='block'; $('canvas-actions').style.display='flex';
  const count = imageUrls ? imageUrls.length : state.controls.numImages;
  showToast(`${count} image${count!==1?'s':''} generated!`, 'success');
}

// ─────────────────────────────────────── BUILD RESULTS ────
function buildShimmerGrid() {
  const grid=$('shimmer-grid'), count=state.controls.numImages, aspect=state.controls.aspect;
  grid.innerHTML=''; grid.className=`shimmer-grid ${count>1?'cols-2':'cols-1'}`;
  for(let i=0;i<Math.min(count,4);i++){const d=document.createElement('div');d.className=`shimmer-item ${aspect}`;grid.appendChild(d);}
}

function buildResults(imageUrls) {
  const grid=$('results-grid'), count=imageUrls?imageUrls.length:state.controls.numImages, aspect=state.controls.aspect;
  let c='cols-1';
  if(count===2)c='cols-2'; else if(count<=4)c='cols-4'; else if(count<=6)c='cols-6'; else c='cols-8';
  grid.className=`results-grid ${c}`; grid.innerHTML='';
  for(let i=0;i<count;i++) grid.appendChild(buildResultItem(i, aspect, imageUrls?imageUrls[i]:null));
  state.results=Array.from(grid.querySelectorAll('.result-item'));
}

function buildResultItem(index, aspect, imageUrl) {
  const item=document.createElement('div'); item.className=`result-item ${aspect}`;
  const img=document.createElement('img'); img.alt=`Generated image ${index+1}`; img.loading='lazy';

  if (imageUrl) {
    img.src=imageUrl; img.crossOrigin='anonymous';
    // Show spinner while loading
    item.style.minHeight='80px';
    const spinner=document.createElement('div'); spinner.className='gen-spinner'; spinner.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1;';
    item.appendChild(spinner);
    img.onload=()=>{ spinner.remove(); item.style.minHeight=''; };
  } else {
    img.src=createSimImage(index, aspect, state.controls.colorGrade);
  }

  const overlay=document.createElement('div'); overlay.className='result-item-overlay';
  const actions=document.createElement('div'); actions.className='result-item-actions';

  // Download
  const dlBtn=document.createElement('button'); dlBtn.className='result-action-btn'; dlBtn.title='Download/Open';
  dlBtn.innerHTML=`<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`;
  dlBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (img.src.startsWith('blob:') || img.src.startsWith('data:')) downloadImage(img.src, `studio-${index+1}.jpg`);
    else window.open(img.src,'_blank'); // Pollinations / DALL-E URLs
  });

  // Expand
  const expBtn=document.createElement('button'); expBtn.className='result-action-btn'; expBtn.title='Full screen';
  expBtn.innerHTML=`<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z" clip-rule="evenodd"/></svg>`;
  expBtn.addEventListener('click', e=>{ e.stopPropagation(); openImageModal(img.src); });

  actions.appendChild(dlBtn); actions.appendChild(expBtn);
  item.appendChild(img); item.appendChild(overlay); item.appendChild(actions);
  item.addEventListener('click', ()=>openImageModal(img.src));
  return item;
}

// ─────────────────────────────────────── SIMULATED CANVAS ────
const PALETTES=[['#7c3aed','#db2777'],['#0891b2','#10b981'],['#f97316','#facc15'],['#db2777','#f97316'],['#1d4ed8','#7c3aed'],['#10b981','#0891b2'],['#f43f5e','#a855f7'],['#14b8a6','#6366f1']];
function createSimImage(idx,aspect,grade){
  const c=document.createElement('canvas'),r={portrait:[3,4],square:[1,1],landscape:[16,9],stories:[9,16]};
  const[w,h]=r[aspect]||[3,4];c.width=600;c.height=Math.round(600*(h/w));
  const ctx=c.getContext('2d'),pal=PALETTES[idx%PALETTES.length];
  const bg=ctx.createLinearGradient(0,0,c.width,c.height);bg.addColorStop(0,shd(pal[0],-45));bg.addColorStop(1,shd(pal[1],-35));ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);
  const vig=ctx.createRadialGradient(c.width/2,c.height/2,c.height*.15,c.width/2,c.height/2,c.height*.82);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,0.6)');ctx.fillStyle=vig;ctx.fillRect(0,0,c.width,c.height);
  drawSilh(ctx,c.width,c.height,pal,idx);applyGrd(ctx,c.width,c.height,grade);
  ctx.save();ctx.globalAlpha=0.14;ctx.fillStyle='white';ctx.font=`bold ${Math.round(c.width*.028)}px Inter,sans-serif`;ctx.textAlign='center';ctx.fillText('AI VIRTUAL STUDIO',c.width/2,c.height-Math.round(c.height*.04));ctx.restore();
  return c.toDataURL('image/jpeg',0.85);
}
function drawSilh(ctx,w,h,pal,idx){
  const cx=w/2+(idx%2===0?0:w*.03);
  const hg=ctx.createRadialGradient(cx,h*.17,0,cx,h*.17,w*.08);hg.addColorStop(0,'#f5d0a9');hg.addColorStop(1,'#c8915e');ctx.fillStyle=hg;ctx.beginPath();ctx.ellipse(cx,h*.17,w*.068,w*.088,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1a0f08';ctx.beginPath();ctx.ellipse(cx,h*.12,w*.072,w*.062,0,0,Math.PI);ctx.fill();
  const bg=ctx.createLinearGradient(cx-w*.12,h*.25,cx+w*.12,h*.25);bg.addColorStop(0,pal[0]+'ee');bg.addColorStop(.5,pal[1]+'cc');bg.addColorStop(1,pal[0]+'bb');ctx.fillStyle=bg;ctx.beginPath();ctx.moveTo(cx-w*.1,h*.27);ctx.bezierCurveTo(cx-w*.13,h*.45,cx-w*.11,h*.6,cx-w*.09,h*.75);ctx.lineTo(cx+w*.09,h*.75);ctx.bezierCurveTo(cx+w*.11,h*.6,cx+w*.13,h*.45,cx+w*.1,h*.27);ctx.closePath();ctx.fill();
  const sp=ctx.createLinearGradient(cx-w*.05,h*.3,cx,h*.5);sp.addColorStop(0,'rgba(255,255,255,0.22)');sp.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=sp;ctx.beginPath();ctx.moveTo(cx-w*.09,h*.28);ctx.bezierCurveTo(cx-w*.11,h*.42,cx-w*.05,h*.5,cx,h*.46);ctx.bezierCurveTo(cx-w*.02,h*.35,cx-w*.04,h*.28,cx-w*.08,h*.27);ctx.closePath();ctx.fill();
  ctx.fillStyle='#12112a';[[cx-w*.09,cx-.02*w],[cx+.01*w,cx+w*.09]].forEach(([lx,rx])=>{ctx.beginPath();ctx.moveTo(lx,h*.74);ctx.bezierCurveTo(lx,h*.85,lx+.01*w,h*.92,lx+.01*w,h);ctx.lineTo(rx-.01*w,h);ctx.bezierCurveTo(rx-.01*w,h*.92,rx,h*.85,rx,h*.74);ctx.closePath();ctx.fill();});
}
function applyGrd(ctx,w,h,grade){
  if(!grade||grade==='none')return;
  if(grade==='bw'){ctx.globalCompositeOperation='luminosity';ctx.fillStyle='rgb(128,128,128)';ctx.globalAlpha=0.8;ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;return;}
  const d={'teal-orange':['rgba(0,100,120,.12)','rgba(220,130,0,.08)'],'vintage':['rgba(180,120,60,.14)',null],'vibrant':['rgba(200,50,100,.1)','rgba(50,160,230,.07)'],'muted':['rgba(60,60,80,.18)',null],'warm':['rgba(240,170,50,.12)',null],'cool':['rgba(50,110,200,.11)',null]};
  const cl=d[grade];if(!cl)return;
  if(cl[0]){ctx.fillStyle=cl[0];ctx.fillRect(0,0,w,h);}
  if(cl[1]){const g=ctx.createLinearGradient(0,h,w,0);g.addColorStop(0,cl[1]);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
}
function shd(hex,p){const n=parseInt(hex.replace('#',''),16);const c=v=>Math.min(255,Math.max(0,v));const r=c((n>>16)+p),g=c(((n>>8)&0xFF)+p),b=c((n&0xFF)+p);return`#${((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1)}`;}

// ─────────────────────────────────────── LOOKS ────
function initLooks(){$('btn-save-look')?.addEventListener('click',saveLook);}
function saveLook(){const ni=$('look-name-input'),name=ni?.value.trim();if(!name){showToast('Enter a look name','error');return;}state.looks.push({id:Date.now(),name,controls:{...state.controls}});saveLooksToStorage();renderLooks();ni.value='';showToast(`Look "${name}" saved!`,'success');}
function loadLook(id){const l=state.looks.find(x=>x.id===id);if(!l)return;Object.assign(state.controls,l.controls);applyCtrlsToUI();showToast(`Look "${l.name}" loaded`,'success');}
function deleteLook(id){state.looks=state.looks.filter(l=>l.id!==id);saveLooksToStorage();renderLooks();showToast('Look deleted','info');}
function renderLooks(){
  const list=$('saved-looks-list');if(!list)return;list.innerHTML='';
  if(!state.looks.length){list.innerHTML=`<p style="font-size:11px;color:var(--text-muted);text-align:center;padding:8px 0;">No saved looks yet</p>`;return;}
  state.looks.forEach(l=>{
    const item=document.createElement('div');item.className='saved-look-item';
    item.innerHTML=`<span class="saved-look-name">${escapeHtml(l.name)}</span><div class="saved-look-actions"><button class="saved-look-btn" data-action="load" data-id="${l.id}">▶</button><button class="saved-look-btn del" data-action="delete" data-id="${l.id}">×</button></div>`;
    item.querySelector('[data-action="load"]').addEventListener('click',()=>loadLook(l.id));
    item.querySelector('[data-action="delete"]').addEventListener('click',()=>deleteLook(l.id));
    list.appendChild(item);
  });
}
function applyCtrlsToUI(){
  const c=state.controls;
  if($('toggle-hyper-realism'))$('toggle-hyper-realism').checked=c.hyperRealism;
  if($('toggle-cinematic'))$('toggle-cinematic').checked=c.cinematic;
  if($('select-color-grade'))$('select-color-grade').value=c.colorGrade;
  const m={'shot':c.shotType,'expression':c.expression,'angle':c.angle,'focal':c.focal,'aperture':c.aperture,'fabric':c.fabric,'tod':c.timeOfDay,'lighting':c.lighting,'aspect':c.aspect,'num-images':String(c.numImages),'ecom-pack':c.ecomPack};
  Object.entries(m).forEach(([g,v])=>document.querySelectorAll(`[data-group="${g}"]`).forEach(el=>el.classList.toggle('active',el.dataset.value===v)));
}
function saveLooksToStorage(){try{localStorage.setItem('vs_looks',JSON.stringify(state.looks));}catch(e){}}
function loadLooksFromStorage(){try{const s=localStorage.getItem('vs_looks');if(s){state.looks=JSON.parse(s);renderLooks();}}catch(e){}}

// ─────────────────────────────────────── CANVAS ACTIONS ────
function initCanvasActions(){
  $('btn-clear-canvas')?.addEventListener('click',()=>{$('canvas-results').style.display='none';$('canvas-actions').style.display='none';$('canvas-empty').style.display='flex';$('results-grid').innerHTML='';state.results=[];showToast('Canvas cleared','info');});
  $('btn-download-all')?.addEventListener('click',()=>{
    const imgs=document.querySelectorAll('#results-grid .result-item img');if(!imgs.length)return;
    imgs.forEach((img,i)=>{if(img.src.startsWith('blob:')||img.src.startsWith('data:'))downloadImage(img.src,`studio-${i+1}.jpg`);else window.open(img.src,'_blank');});
    showToast(`Saving ${imgs.length} image(s)…`,'success');
  });
}

// ─────────────────────────────────────── MODALS ────
function initModals(){
  $('image-modal-close')?.addEventListener('click',()=>$('image-modal').style.display='none');
  $('image-modal')?.addEventListener('click',e=>{if(e.target===$('image-modal'))$('image-modal').style.display='none';});
  $('btn-download-single')?.addEventListener('click',()=>{const s=$('modal-image-src').src;if(s.startsWith('blob:')||s.startsWith('data:'))downloadImage(s,'studio-image.jpg');else window.open(s,'_blank');});
}
function openImageModal(src){$('modal-image-src').src=src;$('image-modal').style.display='flex';}

// ─────────────────────────────────────── UTILS ────
function downloadImage(url,name){const a=document.createElement('a');a.href=url;a.download=name;a.click();}
function showToast(msg,type='info'){
  const c=$('toast-container');if(!c)return;
  const icons={success:'✅',error:'❌',info:'💡'};
  const el=document.createElement('div');el.className=`toast toast-${type}`;
  el.innerHTML=`<span class="toast-icon">${icons[type]||'💡'}</span><span>${escapeHtml(msg)}</span>`;
  c.appendChild(el);setTimeout(()=>{el.classList.add('out');el.addEventListener('animationend',()=>el.remove());},3200);
}
function capitalize(s){return s?s[0].toUpperCase()+s.slice(1):'';}
function escapeHtml(s){const d=document.createElement('div');d.appendChild(document.createTextNode(s));return d.innerHTML;}
