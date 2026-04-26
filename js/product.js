/* ═══════════════════════════════════════════════════════════════════
   PRODUCT STUDIO — product.js
   Dedicated logic for the product photography page
   ═══════════════════════════════════════════════════════════════════ */
'use strict';

// ─────────────────────────────────────── STATE ────
const state = {
  model:    null,          // optional
  products: [],            // [{ id, dataUrl, name }]  ← multiple products
  activeProductIdx: 0,
  style:    null,
  provider: 'pollinations',
  pollinationsModel: 'flux',
  hfToken:  null,
  hfModel:  'black-forest-labs/FLUX.1-schnell',
  apiKey:   null,
  aiModel:  'dall-e-3',
  quality:  'standard',
  controls: {
    shotType: 'hero-shot', colorGrade: 'none', hyperRealism: false,
    cinematic: false, angle: 'eye-level', focal: '50mm',
    lighting: 'flat-even', timeOfDay: 'none',
    aspect: 'square', numImages: 1, ecomPack: 'off', socialPack: false,
    background: 'white', sceneProps: '', envEffects: '',
    mainPrompt: '', customOverride: '',
  },
  looks: [], generating: false,
};

// Sizes
const POLL_SIZES = { portrait:'768x1024', square:'1024x1024', landscape:'1024x576', stories:'576x1024' };
const HF_SIZES   = { portrait:[768,1024], square:[1024,1024], landscape:[1024,576], stories:[576,1024] };
const DAL3_SIZES = { portrait:'1024x1792', square:'1024x1024', landscape:'1792x1024', stories:'1024x1792' };
const DAL2_SIZES = { portrait:'512x512',   square:'1024x1024', landscape:'1024x1024', stories:'512x512' };

const SHOT_LABELS = {
  'hero-shot':'professional hero product shot centered','flatlay':'perfect flat lay overhead product photo',
  'lifestyle':'lifestyle product photography in use','360-view':'360 degree product view multiple angles',
  'detail-macro':'extreme closeup macro detail shot showing texture',
  'in-use':'product being used in action shot','comparison':'product size comparison with common objects',
  'hanging':'ghost mannequin hanging product shot','overhead':'clean overhead top-down shot',
  'on-surface':'product elegantly placed on surface','held-hand':'product held in hand lifestyle',
  'packaged':'product in packaging unboxing shot',
};
const LIGHTING_LABELS = {
  'flat-even':'bright flat even shadowless e-commerce lighting',
  'studio-softbox':'soft diffused studio softbox lighting',
  'golden-hour':'warm golden hour sunlight from the side',
  'dramatic-hard':'dramatic hard lighting bold shadows editorial',
  'rim-light':'strong rim backlight glowing outline premium',
  'window-light':'soft Rembrandt directional window light',
  'neon-glow':'vibrant neon lights colorful hues',
  'candlelight':'warm intimate candlelight',
};
const BG_LABELS = {
  'white':'pure white clean infinity background',
  'grey':'neutral medium grey studio background',
  'black':'deep black background premium look',
  'pastel-pink':'soft pastel pink gradient background',
  'pastel-blue':'soft pastel blue gradient background',
  'pastel-green':'soft pastel mint green background',
  'marble':'luxurious white marble surface background',
  'wood':'warm natural wooden surface background',
  'concrete':'urban concrete textured background',
  'fabric':'soft beige linen fabric background',
  'outdoor':'fresh green outdoor grass background',
  'neon-city':'dark neon city lights background',
  'grad-sunrise':'warm orange to pink gradient background',
  'grad-ocean':'deep blue to indigo gradient background',
  'grad-forest':'deep green to teal gradient background',
  'grad-violet':'purple to pink gradient background',
  'grad-gold':'warm golden amber gradient background',
  'grad-dark':'dark charcoal glass gradient background',
};

const $ = id => document.getElementById(id);

// ─────────────────────────────────────── INIT ────
document.addEventListener('DOMContentLoaded', () => {
  initBanner(); initRightTabs(); initUploadZones();
  initProductUpload(); initWebcam(); initPillGroups();
  initToggles(); initGenerate(); initLooks();
  initCanvasActions(); initModals(); initAiEnhance();
  initProviderModal(); initCanvasPromptOverride();
  loadLooksFromStorage();
  loadSettingsFromStorage();
  updateKeyIndicator(true, 'pollinations');
  updateGenerateState();
});

// ─────────────────────────────────────── BANNER ────
function initBanner() {
  $('wa-close')?.addEventListener('click', () => {
    $('wa-banner').style.display = 'none';
    document.body.classList.add('banner-closed');
  });
}

// ─────────────────────────────────────── RIGHT TABS ────
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

// ─────────────────────────────────────── UPLOAD: MODEL (optional) ────
function initUploadZones() {
  // Model zone
  const modelZone = $('model-upload-zone');
  if (modelZone) {
    modelZone.addEventListener('click', e => { if(e.target.closest('.preview-remove')) return; $('model-file-input')?.click(); });
    $('model-file-input')?.addEventListener('change', e => { if(e.target.files[0]) handleModelUpload(e.target.files[0]); });
    modelZone.addEventListener('dragover', e=>{e.preventDefault();modelZone.classList.add('drag-over');});
    modelZone.addEventListener('dragleave',()=>modelZone.classList.remove('drag-over'));
    modelZone.addEventListener('drop', e=>{e.preventDefault();modelZone.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f?.type.startsWith('image/'))handleModelUpload(f);});
  }
  // Model remove
  document.querySelectorAll('.preview-remove[data-target="model"]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();removeModel();}));
  // Style zone
  const styleZone=$('style-upload-zone');
  if(styleZone){
    styleZone.addEventListener('click',e=>{if(e.target.closest('.preview-remove'))return;$('style-file-input')?.click();});
    $('style-file-input')?.addEventListener('change',e=>{if(e.target.files[0])handleStyleUpload(e.target.files[0]);});
    styleZone.addEventListener('dragover',e=>{e.preventDefault();styleZone.classList.add('drag-over');});
    styleZone.addEventListener('dragleave',()=>styleZone.classList.remove('drag-over'));
    styleZone.addEventListener('drop',e=>{e.preventDefault();styleZone.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f?.type.startsWith('image/'))handleStyleUpload(f);});
  }
  document.querySelectorAll('.preview-remove[data-target="style"]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();removeStyle();}));
}

function handleModelUpload(file) {
  const reader = new FileReader();
  reader.onload = e => {
    state.model = { dataUrl: e.target.result };
    $('model-preview-img').src = e.target.result;
    $('model-preview').style.display = 'block';
    $('model-placeholder').style.display = 'none';
    showToast('Model uploaded (optional)', 'success');
  };
  reader.readAsDataURL(file);
}

function removeModel() {
  state.model = null;
  $('model-preview').style.display = 'none';
  $('model-placeholder').style.display = 'flex';
  $('model-preview-img').src = '';
  const fi=$('model-file-input'); if(fi) fi.value='';
  showToast('Model removed', 'info');
}

function handleStyleUpload(file) {
  const reader = new FileReader();
  reader.onload = e => {
    state.style = { dataUrl: e.target.result };
    $('style-preview-img').src = e.target.result;
    $('style-preview').style.display = 'block';
    $('style-placeholder').style.display = 'none';
    showToast('Style reference added', 'success');
  };
  reader.readAsDataURL(file);
}

function removeStyle() {
  state.style = null;
  $('style-preview').style.display = 'none';
  $('style-placeholder').style.display = 'flex';
  $('style-preview-img').src = '';
}

// ─────────────────────────────────────── WEBCAM ────
let webcamStream = null;
function initWebcam() {
  $('btn-webcam')?.addEventListener('click', async () => {
    $('webcam-modal').style.display = 'flex';
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia({video:true,audio:false});
      $('webcam-video').srcObject = webcamStream;
    } catch { showToast('Camera access denied','error'); $('webcam-modal').style.display='none'; }
  });
  $('webcam-close')?.addEventListener('click', closeWebcam);
  $('webcam-modal')?.addEventListener('click',e=>{if(e.target===$('webcam-modal'))closeWebcam();});
  $('btn-capture')?.addEventListener('click',()=>{
    if(!webcamStream)return;
    const canvas=$('webcam-canvas'),video=$('webcam-video');
    canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    canvas.getContext('2d').drawImage(video,0,0);
    const dataUrl=canvas.toDataURL('image/jpeg',0.85);
    state.model={dataUrl}; handleModelUploadFromDataUrl(dataUrl);
    closeWebcam(); showToast('Model captured!','success');
  });
}
function closeWebcam(){
  if(webcamStream){webcamStream.getTracks().forEach(t=>t.stop());webcamStream=null;}
  const v=$('webcam-video');if(v)v.srcObject=null;
  $('webcam-modal').style.display='none';
}
function handleModelUploadFromDataUrl(dataUrl){
  state.model={dataUrl};
  $('model-preview-img').src=dataUrl;
  $('model-preview').style.display='block';
  $('model-placeholder').style.display='none';
}

// ─────────────────────────────────────── PRODUCT MULTI-UPLOAD ────
function initProductUpload() {
  const zone=$('product-dropzone'), input=$('product-file-input');

  // Click browse
  $('btn-browse-products')?.addEventListener('click',e=>{e.stopPropagation();input?.click();});

  // Click on zone (not on thumbs)
  zone?.addEventListener('click',e=>{
    if(e.target.closest('.thumb-item')||e.target.closest('.thumbs-add-btn')||e.target.closest('.btn-browse-products'))return;
    if(state.products.length===0) input?.click();
  });

  // File input change
  input?.addEventListener('change',e=>{
    if(e.target.files?.length) handleProductFiles(Array.from(e.target.files));
    e.target.value='';
  });

  // Add more
  $('thumbs-add-btn')?.addEventListener('click',()=>input?.click());

  // Drag and drop
  zone?.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drag-over');});
  zone?.addEventListener('dragleave',()=>zone?.classList.remove('drag-over'));
  zone?.addEventListener('drop',e=>{
    e.preventDefault();zone?.classList.remove('drag-over');
    const files=Array.from(e.dataTransfer.files).filter(f=>f.type.startsWith('image/'));
    if(files.length)handleProductFiles(files);
    else showToast('Please drop image files','error');
  });
}

function handleProductFiles(files) {
  let loaded=0;
  files.forEach(file=>{
    const reader=new FileReader();
    reader.onload=e=>{
      const id=Date.now()+Math.random();
      state.products.push({id,dataUrl:e.target.result,name:file.name});
      loaded++;
      if(loaded===files.length){ renderProductThumbs(); updateGenerateState(); showToast(`${files.length} product${files.length>1?'s':''} added`,'success'); }
    };
    reader.readAsDataURL(file);
  });
}

function renderProductThumbs(){
  const thumbsGrid=$('thumbs-grid');
  const thumbsPanel=$('product-thumbs');
  const dropInner=$('product-drop-inner');
  const hint=$('no-products-hint');

  if(!state.products.length){
    if(thumbsPanel)thumbsPanel.style.display='none';
    if(dropInner)dropInner.style.display='flex';
    if(hint)hint.classList.remove('visible');
    return;
  }

  if(thumbsPanel)thumbsPanel.style.display='block';
  if(dropInner)dropInner.style.display='none';
  if(hint)hint.classList.remove('visible');

  const count=$('thumbs-count');
  if(count)count.textContent=`${state.products.length} product${state.products.length>1?'s':''}`;

  thumbsGrid.innerHTML='';
  state.products.forEach((prod,i)=>{
    const item=document.createElement('div');
    item.className=`thumb-item${i===state.activeProductIdx?' active-product':''}`;
    item.title=prod.name;

    const img=document.createElement('img');img.src=prod.dataUrl;img.alt=prod.name;

    const dot=document.createElement('div');dot.className='thumb-active-dot';

    const removeBtn=document.createElement('button');
    removeBtn.className='thumb-remove';removeBtn.title='Remove';removeBtn.textContent='×';
    removeBtn.addEventListener('click',e=>{e.stopPropagation();removeProduct(prod.id);});

    item.addEventListener('click',()=>setActiveProduct(i));
    item.appendChild(img);item.appendChild(dot);item.appendChild(removeBtn);
    thumbsGrid.appendChild(item);
  });
}

function setActiveProduct(idx){
  state.activeProductIdx=idx;
  renderProductThumbs();
  showToast(`Product ${idx+1} selected as primary`,'info');
}

function removeProduct(id){
  state.products=state.products.filter(p=>p.id!==id);
  if(state.activeProductIdx>=state.products.length)state.activeProductIdx=Math.max(0,state.products.length-1);
  renderProductThumbs();
  updateGenerateState();
  if(state.products.length===0)showToast('All products removed','info');
}

// ─────────────────────────────────────── AI ENHANCE ────
function initAiEnhance(){
  const btn=$('btn-enhance-prompt'),ta=$('main-prompt');if(!btn)return;
  const suf=['ultra-detailed photorealistic 8K product photography professional studio quality','commercial product photography crisp vivid colors perfect composition white background','high-end product shot for premium e-commerce listing detailed texture rendering','editorial product photography minimal clean aesthetic magazine quality'];
  btn.addEventListener('click',()=>{
    const base=ta.value.trim(),s=suf[Math.floor(Math.random()*suf.length)];
    ta.value=(base?`${base}, ${s}`:s).slice(0,500);ta.dispatchEvent(new Event('input'));
    showToast('Prompt enhanced!','success');btn.textContent='✅ Enhanced!';setTimeout(()=>btn.textContent='✨ AI Enhance',2000);
  });
  const ctr=$('prompt-counter');ta?.addEventListener('input',()=>{state.controls.mainPrompt=ta.value;if(ctr)ctr.textContent=`${ta.value.length}/500`;});
}

// ─────────────────────────────────────── PILLS ────
function initPillGroups(){
  document.addEventListener('click',e=>{
    const pill=e.target.closest('.pill');
    if(pill?.dataset.group){document.querySelectorAll(`.pill[data-group="${pill.dataset.group}"]`).forEach(p=>p.classList.remove('active'));pill.classList.add('active');updateCtrl(pill.dataset.group,pill.dataset.value);return;}
    const pack=e.target.closest('.pack-btn');
    if(pack?.dataset.group){document.querySelectorAll(`.pack-btn[data-group="${pack.dataset.group}"]`).forEach(b=>b.classList.remove('active'));pack.classList.add('active');updateCtrl(pack.dataset.group,pack.dataset.value);return;}
    const asp=e.target.closest('.aspect-btn');
    if(asp?.dataset.group){document.querySelectorAll(`.aspect-btn[data-group="${asp.dataset.group}"]`).forEach(b=>b.classList.remove('active'));asp.classList.add('active');updateCtrl(asp.dataset.group,asp.dataset.value);return;}
    const lc=e.target.closest('.lighting-card');
    if(lc?.dataset.group){document.querySelectorAll(`.lighting-card[data-group="${lc.dataset.group}"]`).forEach(c=>c.classList.remove('active'));lc.classList.add('active');updateCtrl(lc.dataset.group,lc.dataset.value);return;}
    const th=e.target.closest('.preset-thumb');
    if(th){document.querySelectorAll('.preset-thumb').forEach(t=>t.classList.remove('active'));th.classList.add('active');state.controls.background=th.dataset.bg;showToast(`Background: "${th.querySelector('span').textContent}"`,'info');}
  });
}
function updateCtrl(g,v){
  const m={'shot':'shotType','angle':'angle','focal':'focal','tod':'timeOfDay','lighting':'lighting','aspect':'aspect','num-images':'numImages','ecom-pack':'ecomPack'};
  const k=m[g];if(k)state.controls[k]=g==='num-images'?parseInt(v):v;
}

// ─────────────────────────────────────── TOGGLES ────
function initToggles(){
  $('toggle-hyper-realism')?.addEventListener('change',e=>state.controls.hyperRealism=e.target.checked);
  $('toggle-cinematic')?.addEventListener('change',    e=>state.controls.cinematic=e.target.checked);
  $('toggle-social-pack')?.addEventListener('change',  e=>state.controls.socialPack=e.target.checked);
  $('select-color-grade')?.addEventListener('change',  e=>state.controls.colorGrade=e.target.value);
  $('scene-props')?.addEventListener('input',          e=>state.controls.sceneProps=e.target.value);
  $('env-effects')?.addEventListener('input',          e=>state.controls.envEffects=e.target.value);
  $('custom-prompt-override')?.addEventListener('input',e=>state.controls.customOverride=e.target.value);
  $('btn-gen-bg')?.addEventListener('click',()=>{
    const p=$('ai-bg-prompt').value.trim();if(!p){showToast('Enter a background description','error');return;}
    $('btn-gen-bg').textContent='Queued ✓';$('btn-gen-bg').disabled=true;
    state.controls.background=`ai:${p}`;
    setTimeout(()=>{$('btn-gen-bg').textContent='Generate';$('btn-gen-bg').disabled=false;},2000);
    showToast('AI background queued','success');
  });
}

// ─────────────────────────────────────── PROMPT BUILDER ────
function buildPrompt(){
  const c=state.controls;
  if(c.customOverride?.trim())return c.customOverride.trim();

  const parts=[];

  // Product info from props
  const name=$('prop-name')?.value.trim();
  const brand=$('prop-brand')?.value.trim();
  const cat=$('prop-category')?.value;
  const color=$('prop-color')?.value.trim();
  const desc=$('prop-desc')?.value.trim();

  let productDesc='product';
  if(name)productDesc=name;
  if(brand&&name)productDesc=`${brand} ${name}`;
  else if(brand)productDesc=`${brand} product`;
  if(cat)productDesc+=` (${cat})`;
  if(color)productDesc+=`, ${color}`;

  parts.push(`professional commercial product photography of a ${productDesc}`);
  if(desc)parts.push(desc);

  // Model (optional)
  if(state.model)parts.push('product worn or held by a fashion model');

  // Shot type
  const shotLabel=SHOT_LABELS[c.shotType]||c.shotType;parts.push(shotLabel);

  // Camera
  const angles={'eye-level':'eye-level','high':'high angle shot','low':'low angle shot','overhead':'directly overhead bird\'s eye view','3-4':'3/4 angle view'};
  parts.push(angles[c.angle]||'eye-level');
  parts.push(`${c.focal} lens`);

  // Lighting
  parts.push(LIGHTING_LABELS[c.lighting]||c.lighting);
  if(c.timeOfDay&&c.timeOfDay!=='none')parts.push(`${c.timeOfDay} lighting`);

  // Background
  if(c.background){
    if(c.background.startsWith('ai:'))parts.push(`background: ${c.background.slice(3)}`);
    else if(BG_LABELS[c.background])parts.push(`background: ${BG_LABELS[c.background]}`);
  }

  if(c.sceneProps?.trim())parts.push(c.sceneProps.trim());
  if(c.envEffects?.trim())parts.push(c.envEffects.trim());
  if(c.hyperRealism)parts.push('hyper-realistic ultra-detailed 8K photorealistic');
  if(c.cinematic)parts.push('cinematic look film grain');
  if(c.mainPrompt?.trim())parts.push(c.mainPrompt.trim());
  parts.push('high quality sharp professional e-commerce photography');
  return parts.filter(Boolean).join(', ');
}

// ─────────────────────────────────────── GENERATE STATE ────
function updateGenerateState(){
  const hasProducts=state.products.length>0;
  const btn=$('btn-generate-main'),hint=$('generate-hint');if(!btn)return;
  if(hasProducts){btn.classList.remove('disabled');if(hint)hint.style.display='none';}
  else{btn.classList.add('disabled');if(hint){hint.style.display='block';hint.textContent='Upload at least one product to start.';}}
}

// ─────────────────────────────────────── GENERATION ────
function initGenerate(){
  const btn=$('btn-generate-main');if(!btn)return;
  btn.classList.add('disabled');
  btn.addEventListener('click',startGeneration);
}

async function startGeneration(){
  if(state.generating)return;
  if(!state.products.length){showToast('Upload at least one product!','error');return;}
  state.generating=true;
  const btn=$('btn-generate-main');
  btn.classList.add('generating');btn.querySelector('.btn-generate-text').textContent='Generating…';
  $('canvas-empty').style.display='none';$('canvas-results').style.display='none';$('canvas-actions').style.display='none';
  const genEl=$('canvas-generating');genEl.style.display='flex';
  buildShimmerGrid();

  const prompt=buildPrompt();
  let previewEl=genEl.querySelector('.gen-prompt-preview');
  if(!previewEl){previewEl=document.createElement('div');previewEl.className='gen-prompt-preview';genEl.appendChild(previewEl);}
  previewEl.textContent=`📝 ${prompt.slice(0,200)}${prompt.length>200?'…':''}`;

  const bar=$('gen-progress-bar'),steps=document.querySelectorAll('.gen-step');
  steps.forEach(s=>s.classList.remove('active','done'));if(bar)bar.style.width='0%';
  activateStep(steps,0,bar,15);await sleep(300);

  try{
    let urls=[];
    if(state.provider==='pollinations') urls=await genPollinations(prompt,steps,bar);
    else if(state.provider==='huggingface') urls=await genHuggingFace(prompt,steps,bar);
    else if(state.provider==='openai') urls=await genOpenAI(prompt,steps,bar);
    else{await simSteps(steps,bar);urls=null;}
    finishGeneration(urls);
  }catch(err){
    console.error(err);state.generating=false;resetBtn();
    genEl.style.display='none';$('canvas-empty').style.display='flex';
    showToast(`Generation failed: ${err.message}`,'error');
  }
}

// ── Pollinations ──
async function genPollinations(prompt,steps,bar){
  const count=state.controls.numImages,aspect=state.controls.aspect,model=state.pollinationsModel||'flux';
  const[w,h]=POLL_SIZES[aspect].split('x').map(Number);
  activateStep(steps,1,bar,30);await sleep(200);activateStep(steps,2,bar,55);
  const urls=Array.from({length:count},(_,i)=>{
    const seed=(Date.now()+i*137)%99999;
    return`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&model=${model}&nologo=true&enhance=true`;
  });
  activateStep(steps,3,bar,80);
  await Promise.all(urls.map(url=>preloadImage(url)));
  activateStep(steps,4,bar,100);await sleep(200);
  return urls;
}
function preloadImage(url){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(url);img.onerror=()=>rej(new Error('Image load failed'));img.src=url;setTimeout(()=>res(url),30000);});}

// ── Hugging Face ──
async function genHuggingFace(prompt,steps,bar){
  const count=state.controls.numImages,aspect=state.controls.aspect,model=state.hfModel;
  const[w,h]=HF_SIZES[aspect];
  activateStep(steps,1,bar,30);await sleep(200);activateStep(steps,2,bar,55);
  const reqs=Array.from({length:count},async()=>{
    const res=await fetch(`https://api-inference.huggingface.co/models/${model}`,{
      method:'POST',headers:{'Authorization':`Bearer ${state.hfToken}`,'Content-Type':'application/json','x-wait-for-model':'true'},
      body:JSON.stringify({inputs:prompt,parameters:{width:w,height:h,num_inference_steps:4}}),
    });
    if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error||`HF ${res.status}`);}
    const blob=await res.blob();return URL.createObjectURL(blob);
  });
  activateStep(steps,3,bar,80);

  let results;
  try {
    results = await Promise.allSettled(reqs);
  } catch(netErr) {
    showToast('🌸 Switching to Pollinations AI (HF needs HTTPS)','info');
    state.provider='pollinations'; saveSettings(); updateKeyIndicator(true,'pollinations');
    return await genPollinations(prompt,steps,bar);
  }

  activateStep(steps,4,bar,100);await sleep(200);
  const urls=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
  const errs=results.filter(r=>r.status==='rejected').map(r=>r.reason?.message);
  if(!urls.length){
    const isNet=errs.some(e=>e&&(e.includes('fetch')||e.includes('network')||e.includes('CORS')));
    if(isNet){
      showToast('🌸 Auto-switching to Pollinations AI','info');
      state.provider='pollinations'; saveSettings(); updateKeyIndicator(true,'pollinations');
      return await genPollinations(prompt,steps,bar);
    }
    throw new Error(errs[0]||'HF requests failed');
  }
  if(errs.length)showToast(`${errs.length} image(s) failed`,'info');
  return urls;
}

// ── OpenAI ──
async function genOpenAI(prompt,steps,bar){
  const count=state.controls.numImages,aspect=state.controls.aspect,model=state.aiModel;
  const size=model==='dall-e-3'?DAL3_SIZES[aspect]:DAL2_SIZES[aspect];
  activateStep(steps,1,bar,30);await sleep(300);activateStep(steps,2,bar,55);
  const reqs=model==='dall-e-3'?Array.from({length:count},()=>callD3(prompt,size)):[callD2(prompt,size,count)];
  activateStep(steps,3,bar,80);
  const results=await Promise.allSettled(reqs);activateStep(steps,4,bar,100);await sleep(200);
  const urls=[],errs=[];
  results.forEach(r=>{if(r.status==='fulfilled'){if(Array.isArray(r.value))urls.push(...r.value);else if(r.value)urls.push(r.value);}else errs.push(r.reason?.message);});
  if(!urls.length)throw new Error(errs[0]||'DALL-E failed');
  return urls;
}
async function callD3(p,size){
  const res=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{'Authorization':`Bearer ${state.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'dall-e-3',prompt:p,n:1,size,quality:state.quality,style:'vivid'})});
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error?.message||`HTTP ${res.status}`);}
  return(await res.json()).data[0].url;
}
async function callD2(p,size,n){
  const res=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{'Authorization':`Bearer ${state.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'dall-e-2',prompt:p,n:Math.min(n,10),size})});
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error?.message||`HTTP ${res.status}`);}
  return(await res.json()).data.map(d=>d.url);
}

async function simSteps(steps,bar){for(let i=0;i<steps.length;i++){activateStep(steps,i,bar,Math.round(((i+1)/steps.length)*100));await sleep(550);}await sleep(300);}
function activateStep(steps,i,bar,pct){if(i>0&&steps[i-1]){steps[i-1].classList.remove('active');steps[i-1].classList.add('done');}if(steps[i])steps[i].classList.add('active');if(bar)bar.style.width=`${pct}%`;}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function resetBtn(){state.generating=false;const btn=$('btn-generate-main');if(!btn)return;btn.classList.remove('generating');btn.querySelector('.btn-generate-text').textContent='Generate';}

function finishGeneration(imageUrls){
  resetBtn();$('canvas-generating').style.display='none';
  buildResults(imageUrls);
  $('canvas-results').style.display='block';$('canvas-actions').style.display='flex';
  const count=imageUrls?imageUrls.length:state.controls.numImages;
  showToast(`${count} product image${count!==1?'s':''} generated!`,'success');
}

// ─────────────────────────────────────── RESULTS ────
function buildShimmerGrid(){
  const grid=$('shimmer-grid'),count=state.controls.numImages,aspect=state.controls.aspect;
  grid.innerHTML='';grid.className=`shimmer-grid ${count>1?'cols-2':'cols-1'}`;
  for(let i=0;i<Math.min(count,4);i++){const d=document.createElement('div');d.className=`shimmer-item ${aspect}`;grid.appendChild(d);}
}

function buildResults(imageUrls){
  const grid=$('results-grid'),count=imageUrls?imageUrls.length:state.controls.numImages,aspect=state.controls.aspect;
  let c='cols-1';
  if(count===2)c='cols-2';else if(count<=4)c='cols-4';else if(count<=6)c='cols-6';else c='cols-8';
  grid.className=`results-grid ${c}`;grid.innerHTML='';
  for(let i=0;i<count;i++)grid.appendChild(buildItem(i,aspect,imageUrls?imageUrls[i]:null));
}

function buildItem(idx,aspect,url){
  const item=document.createElement('div');item.className=`result-item ${aspect}`;
  const img=document.createElement('img');img.alt=`Product ${idx+1}`;img.loading='lazy';
  if(url){img.src=url;img.crossOrigin='anonymous';}
  else{img.src=createSimImage(idx,aspect,state.controls.colorGrade);}
  const overlay=document.createElement('div');overlay.className='result-item-overlay';
  const actions=document.createElement('div');actions.className='result-item-actions';
  const dlBtn=document.createElement('button');dlBtn.className='result-action-btn';dlBtn.title='Download';
  dlBtn.innerHTML=`<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`;
  dlBtn.addEventListener('click',e=>{e.stopPropagation();if(img.src.startsWith('blob:')||img.src.startsWith('data:'))downloadImage(img.src,`product-${idx+1}.jpg`);else window.open(img.src,'_blank');});
  const expBtn=document.createElement('button');expBtn.className='result-action-btn';expBtn.title='Expand';
  expBtn.innerHTML=`<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z" clip-rule="evenodd"/></svg>`;
  expBtn.addEventListener('click',e=>{e.stopPropagation();openImageModal(img.src);});
  actions.appendChild(dlBtn);actions.appendChild(expBtn);
  item.appendChild(img);item.appendChild(overlay);item.appendChild(actions);
  item.addEventListener('click',()=>openImageModal(img.src));
  return item;
}

// Simulated image for demo
const PALETTES=[['#7c3aed','#db2777'],['#0891b2','#10b981'],['#f97316','#facc15'],['#db2777','#f97316'],['#1d4ed8','#7c3aed']];
function createSimImage(idx,aspect,grade){
  const c=document.createElement('canvas'),r={portrait:[3,4],square:[1,1],landscape:[16,9],stories:[9,16]};
  const[w,h]=r[aspect]||[1,1];c.width=600;c.height=Math.round(600*(h/w));
  const ctx=c.getContext('2d'),pal=PALETTES[idx%PALETTES.length];
  const bg=ctx.createLinearGradient(0,0,c.width,c.height);bg.addColorStop(0,shd(pal[0],-40));bg.addColorStop(1,shd(pal[1],-30));ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);
  const vig=ctx.createRadialGradient(c.width/2,c.height/2,c.height*.1,c.width/2,c.height/2,c.height*.8);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,0.5)');ctx.fillStyle=vig;ctx.fillRect(0,0,c.width,c.height);
  // Draw product box
  const cx=c.width/2,cy=c.height/2,sw=c.width*.28,sh=c.height*.35;
  ctx.save();ctx.translate(cx,cy);ctx.rotate(-0.04);
  const pGrad=ctx.createLinearGradient(-sw/2,-sh/2,sw/2,sh/2);pGrad.addColorStop(0,pal[0]+'dd');pGrad.addColorStop(1,pal[1]+'bb');
  ctx.fillStyle=pGrad;ctx.beginPath();ctx.roundRect(-sw/2,-sh/2,sw,sh,12);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1.5;ctx.stroke();
  const sp=ctx.createLinearGradient(-sw/2,-sh/2,0,0);sp.addColorStop(0,'rgba(255,255,255,0.3)');sp.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=sp;ctx.beginPath();ctx.roundRect(-sw/2,-sh/2,sw*.5,sh*.5,12);ctx.fill();
  ctx.restore();
  // Shadow
  const sdw=ctx.createRadialGradient(cx,cy+sh*.55,0,cx,cy+sh*.55,sw*.7);sdw.addColorStop(0,'rgba(0,0,0,0.35)');sdw.addColorStop(1,'transparent');ctx.fillStyle=sdw;ctx.beginPath();ctx.ellipse(cx,cy+sh*.55,sw*.7,sw*.2,0,0,Math.PI*2);ctx.fill();
  // Rim light
  const rl=ctx.createLinearGradient(cx+sw*.5,cy-sh*.5,cx+sw*.8,cy+sh*.5);rl.addColorStop(0,pal[0]+'66');rl.addColorStop(1,'transparent');ctx.fillStyle=rl;ctx.fillRect(cx,cy-sh*.5,sw*.5,sh);
  ctx.save();ctx.globalAlpha=0.12;ctx.fillStyle='white';ctx.font=`bold ${Math.round(c.width*.025)}px Inter,sans-serif`;ctx.textAlign='center';ctx.fillText('AI VIRTUAL STUDIO',c.width/2,c.height-Math.round(c.height*.04));ctx.restore();
  return c.toDataURL('image/jpeg',0.85);
}
function shd(hex,p){const n=parseInt(hex.replace('#',''),16);const cl=v=>Math.min(255,Math.max(0,v));const r=cl((n>>16)+p),g=cl(((n>>8)&0xFF)+p),b=cl((n&0xFF)+p);return`#${((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1)}`;}

// ─────────────────────────────────────── CANVAS ACTIONS ────
function initCanvasActions(){
  $('btn-clear-canvas')?.addEventListener('click',()=>{$('canvas-results').style.display='none';$('canvas-actions').style.display='none';$('canvas-empty').style.display='flex';$('results-grid').innerHTML='';showToast('Canvas cleared','info');});
  $('btn-download-all')?.addEventListener('click',()=>{
    const imgs=document.querySelectorAll('#results-grid .result-item img');if(!imgs.length)return;
    imgs.forEach((img,i)=>{if(img.src.startsWith('blob:')||img.src.startsWith('data:'))downloadImage(img.src,`product-${i+1}.jpg`);else window.open(img.src,'_blank');});
    showToast(`Saving ${imgs.length} image(s)…`,'success');
  });
}

// ─────────────────────────────────────── MODALS ────
function initModals(){
  $('image-modal-close')?.addEventListener('click',()=>$('image-modal').style.display='none');
  $('image-modal')?.addEventListener('click',e=>{if(e.target===$('image-modal'))$('image-modal').style.display='none';});
  $('btn-download-single')?.addEventListener('click',()=>{const s=$('modal-image-src').src;if(s.startsWith('blob:')||s.startsWith('data:'))downloadImage(s,'product-image.jpg');else window.open(s,'_blank');});
}
function openImageModal(src){$('modal-image-src').src=src;$('image-modal').style.display='flex';}

// ─────────────────────────────────────── PROVIDER MODAL ────
function initProviderModal(){
  $('btn-open-apikey')?.addEventListener('click',openProviderModal);
  $('apikey-close')?.addEventListener('click',()=>$('apikey-modal').style.display='none');
  $('apikey-modal')?.addEventListener('click',e=>{if(e.target===$('apikey-modal'))$('apikey-modal').style.display='none';});
  document.querySelectorAll('input[name="provider"]').forEach(radio=>{
    radio.addEventListener('change',()=>{const v=radio.value;document.querySelectorAll('.provider-settings').forEach(s=>s.style.display='none');const ps=$(`settings-${v}`);if(ps){ps.style.display='flex';ps.style.flexDirection='column';ps.style.gap='12px';}});
  });
  $('btn-apikey-toggle')?.addEventListener('click',()=>{const i=$('apikey-input');i.type=i.type==='password'?'text':'password';});
  $('btn-hf-toggle')?.addEventListener('click',()=>{const i=$('hf-token-input');i.type=i.type==='password'?'text':'password';});
  $('btn-apikey-save')?.addEventListener('click',saveProvider);
  $('btn-apikey-clear')?.addEventListener('click',()=>{state.provider='pollinations';try{localStorage.removeItem('vs_provider');}catch(e){}$('prov-pollinations').checked=true;document.querySelectorAll('.provider-settings').forEach(s=>s.style.display='none');$('settings-pollinations').style.display='flex';updateKeyIndicator(true,'pollinations');showToast('Reset to free Pollinations AI','info');$('apikey-modal').style.display='none';});
}

function openProviderModal(){
  $('apikey-modal').style.display='flex';$('apikey-status').style.display='none';
  const radio=document.querySelector(`input[name="provider"][value="${state.provider}"]`);
  if(radio){radio.checked=true;radio.dispatchEvent(new Event('change'));}
  if(state.apiKey)$('apikey-input').value=state.apiKey;
  if(state.hfToken)$('hf-token-input').value=state.hfToken;
  if(state.pollinationsModel)$('pollinations-model-select').value=state.pollinationsModel;
}

async function saveProvider(){
  const sel=document.querySelector('input[name="provider"]:checked')?.value||'pollinations';
  const btn=$('btn-apikey-save');btn.textContent='Saving…';btn.disabled=true;$('apikey-status').style.display='none';
  try{
    if(sel==='pollinations'){state.provider='pollinations';state.pollinationsModel=$('pollinations-model-select').value;saveSettings();setStatus('✅ Pollinations AI ready! Completely free.','success');updateKeyIndicator(true,'pollinations');showToast('🌸 Free AI activated!','success');setTimeout(()=>$('apikey-modal').style.display='none',1400);}
    else if(sel==='huggingface'){const t=$('hf-token-input').value.trim();if(!t){setStatus('Enter your HF token','error');return;}const r=await fetch('https://huggingface.co/api/whoami-v2',{headers:{'Authorization':`Bearer ${t}`}});if(!r.ok){setStatus('Invalid HF token','error');return;}state.provider='huggingface';state.hfToken=t;saveSettings();setStatus('✅ Hugging Face connected!','success');updateKeyIndicator(true,'huggingface');showToast('🤗 HF connected!','success');setTimeout(()=>$('apikey-modal').style.display='none',1400);}
    else{const k=$('apikey-input').value.trim();if(!k){setStatus('Enter your OpenAI key','error');return;}const r=await fetch('https://api.openai.com/v1/models',{headers:{'Authorization':`Bearer ${k}`}});if(!r.ok){const e=await r.json().catch(()=>({}));setStatus(`OpenAI error: ${e.error?.message||r.statusText}`,'error');return;}state.provider='openai';state.apiKey=k;state.aiModel=$('apikey-model-select').value;state.quality=$('apikey-quality-select').value;saveSettings();setStatus('✅ OpenAI connected!','success');updateKeyIndicator(true,'openai');showToast('⚡ OpenAI connected!','success');setTimeout(()=>$('apikey-modal').style.display='none',1400);}
  }catch(err){setStatus(`Error: ${err.message}`,'error');}
  finally{btn.textContent='Save & Use →';btn.disabled=false;}
}
function setStatus(m,t){const el=$('apikey-status');if(!el)return;el.textContent=m;el.className=`apikey-status ${t}`;el.style.display='block';}
function saveSettings(){try{localStorage.setItem('vs_provider',state.provider);localStorage.setItem('vs_poll_model',state.pollinationsModel);if(state.hfToken)localStorage.setItem('vs_hf_token',state.hfToken);if(state.apiKey)localStorage.setItem('vs_openai_key',state.apiKey);if(state.aiModel)localStorage.setItem('vs_ai_model',state.aiModel);if(state.quality)localStorage.setItem('vs_ai_quality',state.quality);}catch(e){}}
function loadSettingsFromStorage(){
  try{
    const p=localStorage.getItem('vs_provider');
    if(p){
      state.provider=p;
      state.pollinationsModel=localStorage.getItem('vs_poll_model')||'flux';
      state.hfToken=localStorage.getItem('vs_hf_token');
      state.hfModel=localStorage.getItem('vs_hf_model')||'black-forest-labs/FLUX.1-schnell';
      state.apiKey=localStorage.getItem('vs_openai_key');
      state.aiModel=localStorage.getItem('vs_ai_model')||'dall-e-3';
      state.quality=localStorage.getItem('vs_ai_quality')||'standard';
      updateKeyIndicator(true,p);
    } else {
      // First launch — pre-configure Hugging Face with user's token
      state.provider  = 'huggingface';
      state.hfToken   = '';
      state.hfModel   = 'black-forest-labs/FLUX.1-schnell';
      saveSettings();
      updateKeyIndicator(true,'huggingface');
    }
  }catch(e){}
}

// ── Canvas Prompt Override ──
function initCanvasPromptOverride() {
  const ta      = document.getElementById('canvas-custom-prompt');
  const counter = document.getElementById('cpo-counter');
  const clearBtn= document.getElementById('cpo-clear-btn');
  const wrapper = document.getElementById('canvas-prompt-override');
  if (!ta) return;
  const MAX = 800;
  ta.addEventListener('input', () => {
    const len = ta.value.length;
    if (counter) { counter.textContent = `${len} / ${MAX}`; counter.className = 'cpo-counter' + (len >= MAX ? ' at-limit' : len >= MAX * 0.85 ? ' near-limit' : ''); }
    if (wrapper) wrapper.classList.toggle('has-content', len > 0);
    state.controls.customOverride = ta.value.slice(0, MAX);
  });
  if (clearBtn) clearBtn.addEventListener('click', () => { ta.value = ''; ta.dispatchEvent(new Event('input')); });
}
function updateKeyIndicator(ok,prov){const dot=$('apikey-dot'),btn=$('btn-open-apikey');if(!dot||!btn)return;dot.className=`apikey-dot ${ok?'connected':''}`;btn.className=`btn-apikey ${ok?'connected':''}`;}

// ─────────────────────────────────────── LOOKS ────
function initLooks(){$('btn-save-look')?.addEventListener('click',saveLook);}
function saveLook(){const ni=$('look-name-input'),nm=ni?.value.trim();if(!nm){showToast('Enter a look name','error');return;}state.looks.push({id:Date.now(),name:nm,controls:{...state.controls}});saveLooksToStorage();renderLooks();ni.value='';showToast(`Look "${nm}" saved!`,'success');}
function deleteLook(id){state.looks=state.looks.filter(l=>l.id!==id);saveLooksToStorage();renderLooks();showToast('Look deleted','info');}
function renderLooks(){
  const list=$('saved-looks-list');if(!list)return;list.innerHTML='';
  if(!state.looks.length){list.innerHTML=`<p style="font-size:11px;color:var(--text-muted);text-align:center;padding:8px 0;">No saved looks yet</p>`;return;}
  state.looks.forEach(l=>{const item=document.createElement('div');item.className='saved-look-item';item.innerHTML=`<span class="saved-look-name">${escapeHtml(l.name)}</span><div class="saved-look-actions"><button class="saved-look-btn del" data-action="delete" data-id="${l.id}">×</button></div>`;item.querySelector('[data-action="delete"]').addEventListener('click',()=>deleteLook(l.id));list.appendChild(item);});
}
function saveLooksToStorage(){try{localStorage.setItem('vs_product_looks',JSON.stringify(state.looks));}catch(e){}}
function loadLooksFromStorage(){try{const s=localStorage.getItem('vs_product_looks');if(s){state.looks=JSON.parse(s);renderLooks();}}catch(e){}}

// ─────────────────────────────────────── UTILS ────
function downloadImage(url,name){const a=document.createElement('a');a.href=url;a.download=name;a.click();}
function showToast(msg,type='info'){
  const c=$('toast-container');if(!c)return;
  const icons={success:'✅',error:'❌',info:'💡'};
  const el=document.createElement('div');el.className=`toast toast-${type}`;
  el.innerHTML=`<span class="toast-icon">${icons[type]||'💡'}</span><span>${escapeHtml(msg)}</span>`;
  c.appendChild(el);setTimeout(()=>{el.classList.add('out');el.addEventListener('animationend',()=>el.remove());},3200);
}
function escapeHtml(s){const d=document.createElement('div');d.appendChild(document.createTextNode(s));return d.innerHTML;}
