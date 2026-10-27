const $ = (s) => document.querySelector(s);
const KEY = 'aiverse-design-preview-v1';
const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => crypto.randomUUID();
const landscape = `<svg viewBox="0 0 500 270" preserveAspectRatio="xMidYMid slice" aria-label="Illustrated mountain lake"><rect width="500" height="270" fill="#e5e7df"/><circle cx="377" cy="58" r="23" fill="#e9c296"/><path d="M0 155 90 52l72 88 80-110 107 128 83-80 68 60v132H0" fill="#a6b0ac"/><path d="m50 154 101-45 63 55 94-66 97 73 95-35v134H0" fill="#738c88"/><path d="M0 195Q140 171 270 198T500 178v92H0" fill="#c8d9d3"/><path d="M0 224 70 194 129 214 166 270H0M500 220l-80-18-40 68h120" fill="#536d63"/><path d="M0 248q118-3 226-16t274 7" fill="none" stroke="#e5eee8" stroke-width="2"/><path d="m60 187 9-31 9 31h-7v15h-4v-15m350 16 12-39 12 39h-10v19h-4v-19" fill="#4e695c"/></svg>`;
function sample(){return {version:1,area:'personal',selected:'personal',theme:'light',workspaces:[
 {id:'personal',name:'Personal canvas',kind:'personal',description:'Notes, ideas & everyday life',nodes:[{id:'welcome',type:'note',title:'A little space to think',body:'Ideas don’t have to be organised yet.\n\nDrop them here. Connect the dots when you’re ready.',x:60,y:60},{id:'inspiration',type:'art',title:'Somewhere worth getting lost',body:'A starting point, not a finished story.',x:365,y:95},{id:'next',type:'note',title:'One thing at a time',body:'What would make today feel meaningful?',x:125,y:310}],edges:[['welcome','inspiration']],messages:[],view:{x:0,y:0,zoom:1}},
 {id:'film-silent-horizon',name:'The Silent Horizon',kind:'film',description:'Short film · Idea development',nodes:[{id:'scene',type:'art',title:'The journey begins',body:'Scene 01 · Mountain lake',x:50,y:55},{id:'story',type:'note',title:'The heart of the story',body:'A filmmaker returns to a place she thought she had forgotten.\n\nQuiet. Human. Unhurried.',x:380,y:80},{id:'shots',type:'note',title:'First shot ideas',body:'Wide establishing shot at dawn.\nA slow approach to the water.\nHold on the character’s reaction.',x:120,y:310}],edges:[['scene','story'],['scene','shots']],messages:[],view:{x:0,y:0,zoom:1}},
 {id:'everyday',name:'Everyday',kind:'general',description:'Plans, lists & little things',nodes:[{id:'everyday-note',type:'note',title:'Make space for life',body:'Your work is only part of the picture.\n\nKeep a thought, a plan, or something you don’t want to forget.',x:100,y:80}],edges:[],messages:[],view:{x:0,y:0,zoom:1}}]};}
function valid(s){return s?.version===1 && ['personal','film'].includes(s.area) && ['light','dark'].includes(s.theme) && Array.isArray(s.workspaces) && s.workspaces.length>0 && s.workspaces.length<=100 && s.workspaces.some(w=>w.id===s.selected) && s.workspaces.every(w=>typeof w.id==='string' && typeof w.name==='string' && ['personal','film','general'].includes(w.kind) && Array.isArray(w.nodes) && w.nodes.length<=300 && Array.isArray(w.edges) && Array.isArray(w.messages) && w.view && Number.isFinite(w.view.x) && Number.isFinite(w.view.y) && w.view.zoom>=.3 && w.view.zoom<=2 && w.nodes.every(n=>typeof n.id==='string' && ['note','link','art','image'].includes(n.type) && Number.isFinite(n.x) && Number.isFinite(n.y) && (n.type!=='image'||/^data:image\/(png|jpeg|webp);base64,/.test(n.src))) && w.edges.every(e=>Array.isArray(e)&&e.length===2) && w.messages.every(m=>['user','assistant'].includes(m.role)&&typeof m.text==='string'));}
let state = sample(), storageAvailable = true;
try {const raw=localStorage.getItem(KEY);if(raw){const s=JSON.parse(raw);if(valid(s))state=s;else storageAvailable=false;}}catch{storageAvailable=false;}
let selectedNode=null, selectedIds=new Set(), selectedEdge=null, connectMode=false, connectStart=null, toastTimer, undoStack=[], redoStack=[], drag=null;
const workspace=()=>state.workspaces.find(w=>w.id===state.selected);
function toast(text){if($('#dialog').open && $('#dialog-error'))$('#dialog-error').textContent=text;$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageAvailable=true;$('#saved').textContent='Saved on this browser';}catch{storageAvailable=false;$('#saved').textContent='Not saved · browser storage full';toast('Browser storage is unavailable or full. Export your preview from the info menu.');}}
function captureCanvas(){return {id:state.selected,nodes:structuredClone(workspace().nodes),edges:structuredClone(workspace().edges)};}
function snapshot(){undoStack.push(captureCanvas());if(undoStack.length>40)undoStack.shift();redoStack=redoStack.filter(s=>s.id!==state.selected);}
function restoreCanvas(s){const w=workspace();w.nodes=s.nodes;w.edges=s.edges;selectedIds.clear();selectedNode=null;selectedEdge=null;renderBoard();save();}
function undo(){const i=undoStack.findLastIndex(s=>s.id===state.selected);if(i<0){toast('Nothing to undo here.');return;}redoStack.push(captureCanvas());restoreCanvas(undoStack.splice(i,1)[0]);toast('Undone.');}
function redo(){const i=redoStack.findLastIndex(s=>s.id===state.selected);if(i<0){toast('Nothing to redo here.');return;}undoStack.push(captureCanvas());restoreCanvas(redoStack.splice(i,1)[0]);toast('Redone.');}
function canvasSelectionChanged(){const w=workspace();const nodes=w.nodes.filter(n=>selectedIds.has(n.id)).map(n=>({id:n.id,title:n.title,type:n.type}));if(nodes.length)window.AIVerseCanvasSelectionChanged?.({workspaceId:w.id,nodes});}
function setSelection(ids,{append=false,notify=true}={}) {
  if(!append)selectedIds.clear();
  for(const id of ids)if(workspace().nodes.some(n=>n.id===id))selectedIds.add(id);
  selectedNode=selectedIds.size===1?[...selectedIds][0]:null;
  selectedEdge=null;
  document.querySelectorAll('#nodes [data-node]').forEach(el=>el.classList.toggle('selected',selectedIds.has(el.dataset.node)));
  renderInspector();renderSelectionTools();
  if(notify)canvasSelectionChanged();
}
function selectedNodes(){return workspace().nodes.filter(n=>selectedIds.has(n.id));}
function duplicateSelection() {
  const chosen=selectedNodes();if(!chosen.length)return;
  if(workspace().nodes.length+chosen.length>300)return toast('Too many canvas cards for this preview.');
  snapshot();const remap=new Map();
  const clones=chosen.map(n=>{const copy=structuredClone(n);copy.id=uid();copy.x+=35;copy.y+=38;copy.groupId=undefined;remap.set(n.id,copy.id);return copy;});
  const edges=workspace().edges.filter(([a,b])=>remap.has(a)&&remap.has(b)).map(([a,b])=>[remap.get(a),remap.get(b)]);
  workspace().nodes.push(...clones);workspace().edges.push(...edges);selectedIds=new Set(clones.map(n=>n.id));selectedNode=clones.length===1?clones[0].id:null;renderBoard();save();canvasSelectionChanged();
}
function deleteSelection(){
  if(!selectedIds.size)return;snapshot();const ids=new Set(selectedIds);
  workspace().nodes=workspace().nodes.filter(n=>!ids.has(n.id));
  workspace().edges=workspace().edges.filter(([a,b])=>!ids.has(a)&&!ids.has(b));
  selectedIds.clear();selectedNode=null;renderBoard();save();toast('Cards deleted. Undo is available.');
}
function alignSelection(){
  const chosen=selectedNodes();if(chosen.length<2)return;
  snapshot();const y=Math.min(...chosen.map(n=>n.y));chosen.forEach(n=>n.y=y);renderBoard();save();
}
function groupSelection(){
  const chosen=selectedNodes();if(chosen.length<2)return;
  snapshot();const groupId=uid();chosen.forEach(n=>n.groupId=groupId);renderBoard();save();toast('Cards grouped. Drag one to move the group.');
}
function renderSelectionTools(){
  let bar=$('#selection-actions');
  if(!bar){bar=document.createElement('div');bar.id='selection-actions';bar.className='selection-actions';$('#viewport').append(bar);}
  const count=selectedIds.size;bar.hidden=count<2;
  if(count<2)return;
  bar.replaceChildren();
  const title=document.createElement('span');title.textContent=count+' selected';bar.append(title);
  for(const [label,fn] of [['Duplicate',duplicateSelection],['Align',alignSelection],['Group',groupSelection],['Delete',deleteSelection]]){
    const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;bar.append(b);
  }
}
function setArea(area){state.area=area;if(area==='film' && workspace().kind!=='film'){const film=state.workspaces.find(w=>w.kind==='film');if(film)state.selected=film.id;else state.selected='personal';}selectedNode=null;selectedIds.clear();window.AIVerseCanvasScopeChanged?.(state.selected);stopConnect();render();save();}
function selectWorkspace(id){if(!state.workspaces.some(w=>w.id===id))return;state.selected=id;selectedNode=null;selectedIds.clear();window.AIVerseCanvasScopeChanged?.(id);stopConnect();render();save();}
function render(){document.body.classList.toggle('dark',state.theme==='dark');$('#theme').innerHTML=icon(state.theme==='dark'?'sun':'moon');$('#theme').setAttribute('aria-label',`Switch to ${state.theme==='dark'?'light':'dark'} appearance`);document.querySelectorAll('[data-area]').forEach(b=>{const on=b.dataset.area===state.area;b.classList.toggle('active',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current');});const film=state.area==='film';$('#breadcrumb').textContent=film?'Filmmaking / Studio':'Personal / Overview';$('#page-title').textContent=film?'Let the story take shape.':'Your space.';$('#page-subtitle').textContent=film?'Your films, from the first thought to the next scene.':'Everything you’re working on. A little more room to think.';$('#create-workspace span').textContent=film?'New film project':'New workspace';$('#workspaces-title').textContent=film?'Your film projects':'Your workspaces';const list=state.workspaces.filter(w=>!film||w.kind==='film');$('#workspace-count').textContent=`${list.length} ${film?'project':'workspace'}${list.length===1?'':'s'}`;$('#workspace-list').innerHTML=list.map(w=>`<button class="workspace-card ${w.id===state.selected?'selected':''}" data-workspace="${esc(w.id)}" ${w.id===state.selected?'aria-current="true"':''}><span class="workspace-symbol">${icon(w.kind==='film'?'film':w.kind==='personal'?'grid':'note')}</span><span><strong>${esc(w.name)}</strong><small>${esc(w.description)}</small></span>${w.id===state.selected?'<span class="selected-check" aria-hidden="true">✓</span>':''}</button>`).join('');$('#workspace-list').querySelectorAll('[data-workspace]').forEach(b=>b.onclick=()=>selectWorkspace(b.dataset.workspace));$('#chat-scope').textContent=workspace().name;renderBoard();renderChat();}
function nodeMarkup(n){
  const handle='<div class="node-handle">'+icon(n.type==='art'||n.type==='image'?'image':n.type==='link'?'link':'note')+
    '<span>'+({note:'Note',link:'Reference',image:'Image',art:'Visual direction'}[n.type]||'Card')+'</span></div>';
  let content;
  if(n.type==='art')content='<div class="art-scene">'+landscape+'</div><div class="art-caption"><small>'+esc(n.body)+'</small><h3>'+esc(n.title)+'</h3></div>';
  else if(n.type==='image')content='<img src="'+esc(n.src)+'" alt="'+esc(n.title)+'" draggable="false">'+handle+
    '<div class="node-content"><h3>'+esc(n.title)+'</h3></div>';
  else content=handle+'<div class="node-content"><h3>'+esc(n.title)+'</h3>'+
    (n.type==='link'?'<a href="'+esc(safeUrl(n.body)||'#')+'" target="_blank" rel="noopener noreferrer">'+esc(n.body)+'</a>':'<p>'+esc(n.body)+'</p>')+'</div>';
  const actions='<div class="node-quick-actions" aria-label="Card actions">'+
    '<button type="button" data-action="duplicate" title="Duplicate">Duplicate</button>'+
    '<button type="button" data-action="connect" title="Connect to another card">Connect</button>'+
    (n.generation?'<button type="button" data-action="variation" title="Create a non-destructive demo variation">Variation</button>':'')+
    '<button type="button" data-action="delete" title="Delete card">Delete</button></div>';
  const generation=n.generation?'<div class="node-generation-tag">'+esc(n.generation.kind)+' · Demo draft</div>':'';
  return '<article tabindex="0" role="group" aria-label="'+esc(n.title)+'" class="canvas-node '+n.type+
    (selectedIds.has(n.id)?' selected':'')+'" data-node="'+esc(n.id)+'" style="left:'+n.x+'px;top:'+n.y+'px">'+
    content+generation+actions+'<button type="button" class="node-connector" aria-label="Drag to connect; click to make linked note" title="Drag to connect or click to create linked note">＋</button></article>';
}
function renderBoard(){
  const w=workspace();$('#board-title').textContent=w.name;
  $('#board-subtitle').textContent=w.kind==='film'?'Story, references and shot ideas, together.':'A place for the things taking shape.';
  $('#canvas-empty').hidden=w.nodes.length>0;
  $('#nodes').innerHTML=w.nodes.map(nodeMarkup).join('');
  $('#nodes').querySelectorAll('[data-node]').forEach(el=>{
    const id=el.dataset.node;
    el.onpointerdown=e=>startNodeDrag(e,id);
    el.onclick=e=>{
      if(e.target.closest('a,.node-quick-actions,.node-connector'))return;
      if(el.dataset.dragged==='true'){el.dataset.dragged='false';return;}
      if(e.target.closest('h3,p')&&el.querySelector('.node-content'))return;
      chooseNode(id,e);
    };
    el.querySelectorAll('.node-content h3,.node-content p,.art-caption h3').forEach(field=>{
      field.title='Click to edit on canvas';
      field.onclick=e=>{
        e.preventDefault();e.stopPropagation();
        chooseNode(id,e);beginInlineEdit(field,id,field.tagName==='H3'?'title':'body');
      };
    });
    el.querySelectorAll('[data-action]').forEach(button=>{
      button.onclick=e=>{
        e.preventDefault();e.stopPropagation();
        if(!selectedIds.has(id))setSelection([id]);
        if(button.dataset.action==='duplicate'||button.dataset.action==='variation')duplicateSelection();
        if(button.dataset.action==='delete')deleteSelection();
        if(button.dataset.action==='connect'){
          connectMode=true;connectStart=id;$('#connect').setAttribute('aria-pressed','true');
          $('#canvas-hint').textContent='Choose another card to connect · Escape to cancel';
          toast('Select another card to connect.');
        }
      };
    });
    const connector=el.querySelector('.node-connector');
    connector.onpointerdown=e=>{
      e.preventDefault();e.stopPropagation();
      if(e.button!==0)return;
      drag={type:'connect',from:id,pointer:e.pointerId,sx:e.clientX,sy:e.clientY,moved:false};
      connector.setPointerCapture(e.pointerId);
    };
    connector.onclick=e=>{
      e.preventDefault();e.stopPropagation();
      if(connector.dataset.dragged==='true'){connector.dataset.dragged='false';return;}
      const source=w.nodes.find(n=>n.id===id);if(!source)return;
      if(w.nodes.length>=300)return toast('Canvas is full.');
      snapshot();
      const next={id:uid(),type:'note',title:'Linked thought',body:'',x:source.x+300,y:source.y+28};
      w.nodes.push(next);w.edges.push([id,next.id]);
      selectedIds=new Set([next.id]);selectedNode=next.id;renderBoard();save();canvasSelectionChanged();
    };
    el.onkeydown=e=>{
      if(e.target!==el)return;
      if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseNode(id,e);}
      if(e.key==='F2'){e.preventDefault();chooseNode(id);const title=el.querySelector('.node-content h3,.art-caption h3');if(title)beginInlineEdit(title,id,'title');}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
        e.preventDefault();if(!selectedIds.has(id))setSelection([id],{notify:false});
        snapshot();const step=e.shiftKey?20:5;
        for(const n of selectedNodes()){
          n.x+=e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0;
          n.y+=e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0;
        }renderBoard();save();
      }
    };
  });
  transform();drawConnections();renderInspector();renderSelectionTools();showEdgeActions();
}
function beginInlineEdit(field,id,key){
  if(field.isContentEditable)return;
  const n=workspace().nodes.find(n=>n.id===id);if(!n||n.type==='image'&&key==='body')return;
  const before=n[key]||'';
  field.contentEditable='plaintext-only';
  field.setAttribute('role','textbox');field.setAttribute('aria-label','Edit '+key);
  field.classList.add('inline-editing');
  field.focus();
  const range=document.createRange();range.selectNodeContents(field);range.collapse(false);
  const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
  let done=false;
  const finish=cancel=>{
    if(done)return;done=true;
    const next=field.textContent.trim().slice(0,key==='title'?100:3000);
    field.contentEditable='false';field.classList.remove('inline-editing');
    if(!cancel&&next!==before&&next){snapshot();n[key]=next;save();}
    renderBoard();
  };
  field.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(true);}
    else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopPropagation();finish(false);}
  });
  field.addEventListener('blur',()=>finish(false),{once:true});
}
function transform(){const v=workspace().view;$('#world').style.transform=`translate(${v.x}px,${v.y}px) scale(${v.zoom})`;$('#zoom-reset').textContent=Math.round(v.zoom*100)+'%';$('#viewport').style.backgroundPosition=`${v.x}px ${v.y}px`;$('#viewport').style.backgroundSize=`${20*v.zoom}px ${20*v.zoom}px`;}
function drawConnections(){
  const w=workspace();
  const svg=$('#connections');
  svg.innerHTML=w.edges.map(([a,b],i)=>{
    const na=w.nodes.find(n=>n.id===a),nb=w.nodes.find(n=>n.id===b);
    if(!na||!nb)return '';
    const ea=Array.from($('#nodes').children).find(el=>el.dataset.node===a);
    const eb=Array.from($('#nodes').children).find(el=>el.dataset.node===b);
    if(!ea||!eb)return '';
    const x1=na.x+ea.offsetWidth/2,y1=na.y+ea.offsetHeight/2,x2=nb.x+eb.offsetWidth/2,y2=nb.y+eb.offsetHeight/2;
    const d='M'+x1+' '+y1+' C'+(x1+x2)/2+' '+y1+','+(x1+x2)/2+' '+y2+','+x2+' '+y2;
    return '<path class="edge-hit" tabindex="0" role="button" aria-label="Select connection" data-edge="'+i+'" d="'+d+'"/>'+
      '<path class="edge-visual" d="'+d+'" aria-hidden="true"/>';
  }).join('');
  svg.querySelectorAll('[data-edge]').forEach(path=>{
    const select=e=>{e.preventDefault();e.stopPropagation();selectedEdge=Number(path.dataset.edge);showEdgeActions();};
    path.onclick=select;
    path.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){select(e);}};
  });
}
function showEdgeActions(){
  let actions=$('#edge-actions');
  if(!actions){actions=document.createElement('div');actions.id='edge-actions';actions.className='edge-actions';$('#viewport').append(actions);}
  actions.replaceChildren();
  actions.hidden=!Number.isInteger(selectedEdge);
  if(actions.hidden)return;
  const title=document.createElement('span');title.textContent='Connection selected';
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remove link';
  remove.onclick=()=>{if(!workspace().edges[selectedEdge])return;snapshot();workspace().edges.splice(selectedEdge,1);selectedEdge=null;renderBoard();save();};
  const close=document.createElement('button');close.type='button';close.textContent='×';close.title='Close';close.onclick=()=>{selectedEdge=null;showEdgeActions();};
  actions.append(title,remove,close);
}
function chooseNode(id,event={}){
  if(connectMode){
    if(!connectStart){connectStart=id;toast('Choose the second card.');}
    else if(connectStart!==id){
      if(!workspace().edges.some(([a,b])=>(a===id&&b===connectStart)||(a===connectStart&&b===id))){
        snapshot();workspace().edges.push([connectStart,id]);save();
      }
      stopConnect();renderBoard();toast('Cards connected.');
    }
    return;
  }
  const additive=Boolean(event.shiftKey||event.metaKey||event.ctrlKey);
  if(additive){
    if(selectedIds.has(id))selectedIds.delete(id);else selectedIds.add(id);
    setSelection([...selectedIds]);
  }else setSelection([id]);
}
function renderInspector(){
  const panel=$('#inspector');
  panel.hidden=true;
  panel.replaceChildren();
}
function startNodeDrag(e,id){
  if(e.button!==0||e.target.closest('a,button,h3,p,.inline-editing')||connectMode)return;
  const node=workspace().nodes.find(n=>n.id===id);if(!node)return;
  const ids=selectedIds.has(id)?[...selectedIds]:
    node.groupId?workspace().nodes.filter(n=>n.groupId===node.groupId).map(n=>n.id):[id];
  drag={type:'node',id,ids,pointer:e.pointerId,sx:e.clientX,sy:e.clientY,
    originals:workspace().nodes.filter(n=>ids.includes(n.id)).map(n=>({id:n.id,x:n.x,y:n.y})),moved:false};
  e.currentTarget.setPointerCapture(e.pointerId);
}
$('#viewport').addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('.canvas-node,button,.inspector,.canvas-toolbar,.selection-actions,.edge-actions'))return;
  selectedEdge=null;showEdgeActions();
  if(e.shiftKey){
    const r=$('#viewport').getBoundingClientRect();
    drag={type:'select',pointer:e.pointerId,sx:e.clientX,sy:e.clientY,x:e.clientX-r.left,y:e.clientY-r.top,moved:false};
    let rect=$('#selection-rectangle');
    if(!rect){rect=document.createElement('div');rect.id='selection-rectangle';rect.className='selection-rectangle';$('#viewport').append(rect);}
    rect.hidden=false;rect.style.cssText='left:'+drag.x+'px;top:'+drag.y+'px;width:0;height:0';
  }else{
    selectedIds.clear();selectedNode=null;renderSelectionTools();
    $('#nodes').querySelectorAll('.selected').forEach(el=>el.classList.remove('selected'));
    drag={type:'pan',pointer:e.pointerId,sx:e.clientX,sy:e.clientY,x:workspace().view.x,y:workspace().view.y,moved:false};
  }
  $('#viewport').setPointerCapture(e.pointerId);
});
$('#viewport').addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;
  const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;
  if(Math.hypot(dx,dy)<4&&!drag.moved)return;
  if(!drag.moved&&drag.type==='node')snapshot();
  drag.moved=true;
  if(drag.type==='pan'){
    workspace().view.x=drag.x+dx;workspace().view.y=drag.y+dy;transform();
  }else if(drag.type==='node'){
    for(const original of drag.originals){
      const n=workspace().nodes.find(n=>n.id===original.id);
      n.x=original.x+dx/workspace().view.zoom;
      n.y=original.y+dy/workspace().view.zoom;
      const el=Array.from($('#nodes').children).find(v=>v.dataset.node===original.id);
      if(el){el.style.left=n.x+'px';el.style.top=n.y+'px';el.dataset.dragged='true';}
    }drawConnections();
  }else if(drag.type==='select'){
    const r=$('#viewport').getBoundingClientRect();
    const x=e.clientX-r.left,y=e.clientY-r.top,rect=$('#selection-rectangle');
    rect.style.left=Math.min(x,drag.x)+'px';rect.style.top=Math.min(y,drag.y)+'px';
    rect.style.width=Math.abs(x-drag.x)+'px';rect.style.height=Math.abs(y-drag.y)+'px';
  }else if(drag.type==='connect'){
    const connector=Array.from($('#nodes [data-node]')).find(el=>el.dataset.node===drag.from)?.querySelector('.node-connector');
    if(connector)connector.dataset.dragged='true';
    const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-node]');
    $('#nodes').querySelectorAll('.connection-hover').forEach(el=>el.classList.remove('connection-hover'));
    if(hit&&hit.dataset.node!==drag.from)hit.classList.add('connection-hover');
  }
});
function finishDrag(e){
  if(!drag||e.pointerId!==drag.pointer)return;
  const movement=drag;
  if(movement.type==='select'){
    const r=$('#selection-rectangle').getBoundingClientRect();
    const hits=Array.from($('#nodes [data-node]')).filter(el=>{
      const n=el.getBoundingClientRect();
      return n.right>=r.left&&n.left<=r.right&&n.bottom>=r.top&&n.top<=r.bottom;
    }).map(el=>el.dataset.node);
    $('#selection-rectangle').hidden=true;
    if(movement.moved)setSelection([...selectedIds,...hits]);
  }else if(movement.type==='connect'&&movement.moved){
    const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-node]')?.dataset.node;
    if(target&&target!==movement.from&&workspace().nodes.some(n=>n.id===target)){
      if(!workspace().edges.some(([a,b])=>(a===movement.from&&b===target)||(b===movement.from&&a===target))){
        snapshot();workspace().edges.push([movement.from,target]);save();
        toast('Cards connected.');}
    }
    $('#nodes').querySelectorAll('.connection-hover').forEach(el=>el.classList.remove('connection-hover'));
    renderBoard();
  }else if(movement.type==='node'&&movement.moved){
    save();if(!selectedIds.has(movement.id))setSelection(movement.ids);
  }else if(movement.type==='pan'&&movement.moved)save();
  drag=null;
}
$('#viewport').addEventListener('pointerup',finishDrag);
$('#viewport').addEventListener('pointercancel',finishDrag);
function zoom(delta){const v=workspace().view,r=$('#viewport').getBoundingClientRect(),old=v.zoom,next=Math.max(.3,Math.min(2,old+delta)),cx=r.width/2,cy=r.height/2;v.x=cx-(cx-v.x)*next/old;v.y=cy-(cy-v.y)*next/old;v.zoom=next;transform();save();}
$('#viewport').addEventListener('wheel',e=>{if(e.target.closest('.inspector'))return;e.preventDefault();if(e.ctrlKey||e.metaKey)zoom(e.deltaY>0?-.05:.05);else{workspace().view.x-=e.deltaX;workspace().view.y-=e.deltaY;transform();save();}},{passive:false});
$('#viewport').addEventListener('dblclick',e=>{if(e.target.closest('.canvas-node,button,.inspector,.canvas-toolbar'))return;const r=$('#viewport').getBoundingClientRect(),v=workspace().view;addNote({x:(e.clientX-r.left-v.x)/v.zoom,y:(e.clientY-r.top-v.y)/v.zoom});});
function newPosition(){const r=$('#viewport').getBoundingClientRect(),v=workspace().view;return {x:(r.width*.4-v.x)/v.zoom,y:(r.height*.3-v.y)/v.zoom};}
function addNode(n){if(workspace().nodes.length>=300){toast('This preview supports up to 300 cards per canvas.');return;}snapshot();workspace().nodes.push(n);selectedIds=new Set([n.id]);selectedNode=n.id;renderBoard();save();}
function addNote(pos=newPosition(),title='New thought',body=''){addNode({id:uid(),type:'note',title,body,...pos});}
function createCanvasDraft(){
  const refs=selectedNodes().map(n=>({id:n.id,title:n.title}));
  const referenceNames=refs.length?refs.map(n=>esc(n.title)).join(', '):'None selected. Click canvas cards first if you want references.';
  openDialog('Create on canvas',
    '<p class="creation-intro">Start with an idea. This preview will add editable planning cards, not generate media.</p>'+
    '<label for="creation-kind">What are we making?</label><select id="creation-kind">'+
    '<option value="text">Text</option><option value="image" selected>Image</option><option value="video">Video</option><option value="audio">Audio</option></select>'+
    '<label for="creation-prompt">Describe what you want</label>'+
    '<textarea id="creation-prompt" maxlength="1400" required placeholder="Describe your scene, image, story or sound"></textarea>'+
    '<p class="creation-references"><strong>Canvas references:</strong> '+referenceNames+'</p>'+
    '<details class="creation-more"><summary>More choices</summary>'+
    '<label for="creation-model">Model</label><select id="creation-model">'+
    '<option value="auto" selected>Choose for me (default)</option></select>'+
    '<label for="creation-ratio">Shape</label><select id="creation-ratio">'+
    '<option value="auto">Auto</option><option value="16:9">Landscape · 16:9</option>'+
    '<option value="9:16">Portrait · 9:16</option><option value="1:1">Square · 1:1</option></select></details>'+
    '<p class="local-state-note">Provider: not connected. Cost: unavailable. No credits will be spent.</p>',
    'Add demo draft',()=>{
      const kind=$('#creation-kind').value;
      const prompt=$('#creation-prompt').value.trim();
      if(!prompt)return false;
      const model=$('#creation-model').value;
      const aspect=$('#creation-ratio').value;
      const w=workspace();
      if(w.nodes.length+2>300){toast('Canvas is full.');return false;}
      const pos=newPosition(),promptCard={id:uid(),type:'note',title:'Creation brief',body:prompt,x:pos.x,y:pos.y};
      const output={id:uid(),type:'note',title:kind[0].toUpperCase()+kind.slice(1)+' · Draft',
        body:'Demo planning card only. No provider or model has generated this '+kind+'.\n\n'+prompt,
        x:pos.x+320,y:pos.y, generation:{kind,model,aspect,prompt,provider:null,status:'demo-draft',references:refs.map(r=>r.id)}};
      snapshot();w.nodes.push(promptCard,output);
      w.edges.push([promptCard.id,output.id]);
      for(const ref of refs) if(w.nodes.some(n=>n.id===ref.id))w.edges.push([ref.id,promptCard.id]);
      selectedIds=new Set([output.id]);selectedNode=output.id;
      renderBoard();save();canvasSelectionChanged();
      toast('Editable demo draft added. No AI generation was run.');
    });
  const kindSelect=$('#creation-kind'),ratioSelect=$('#creation-ratio');
  const modelSelect=$('#creation-model');
  const models={text:['Text model A · demo','Text model B · demo'],
    image:['Image model A · demo','Image model B · demo'],
    video:['Video model A · demo','Video model B · demo'],
    audio:['Audio model A · demo','Audio model B · demo']};
  kindSelect.onchange=()=>{
    ratioSelect.disabled=['text','audio'].includes(kindSelect.value);
    if(ratioSelect.disabled)ratioSelect.value='auto';
    modelSelect.replaceChildren();
    for(const label of ['Choose for me (default)',...models[kindSelect.value]]){
      const option=document.createElement('option');option.value=label.startsWith('Choose')?'auto':label;
      option.textContent=label;modelSelect.append(option);
    }
  };
  kindSelect.onchange();
}
function safeUrl(s){try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function openDialog(title,body,action,handler){$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=body+'<p id="dialog-error" class="error-text" role="alert"></p>';$('#dialog-actions').innerHTML=action?`<button class="primary-button" type="submit">${esc(action)}</button>`:'';$('#dialog-form').onsubmit=e=>{e.preventDefault();if(handler?.()===false)return;$('#dialog').close();};$('#dialog').showModal();}
function createWorkspaceDialog(filmDefault=state.area==='film'){openDialog(filmDefault?'Start a film project':'New workspace',`<label for="workspace-name">Name</label><input id="workspace-name" placeholder="${filmDefault?'Your next film':'A space for…'}" maxlength="80" required><label for="workspace-kind">Type</label><select id="workspace-kind"><option value="general" ${!filmDefault?'selected':''}>Personal or general</option><option value="film" ${filmDefault?'selected':''}>Film project</option></select><p class="local-state-note">Created in this browser preview only.</p>`,'Create workspace',()=>{const name=$('#workspace-name').value.trim();if(!name)return false;createWorkspace(name,$('#workspace-kind').value);});}
function createWorkspace(name,kind){if(state.workspaces.length>=100){toast('This preview supports up to 100 workspaces.');return;}const w={id:uid(),name,kind,description:kind==='film'?'Film project · Just beginning':'A new space',nodes:[],edges:[],messages:[],view:{x:0,y:0,zoom:1}};state.workspaces.push(w);state.selected=w.id;state.area=kind==='film'?'film':'personal';selectedNode=null;render();save();toast(`${name} created in this preview.`);}
function renderMessageContext(m) {
  if (!m.meta) return '';
  const meta=m.meta, badges=[
    ...(meta.recipients||[]).map(r=>'@ '+r.label),
    ...(meta.files||[]).map(f=>'＋ '+f.name),
    ...(meta.canvas||[]).map(c=>'▧ '+c.title)
  ];
  return badges.length?'<div class="chat-message-context">'+badges.map(b=>'<span class="message-context-tag">'+esc(b)+'</span>').join('')+'</div>':'';
}
// Browser-preview bridge. No real inference, attachments or external effects.
window.AIVerseDemoPost=(text,meta)=>{
  const w=workspace();
  if(w.messages.length>=100){toast('This preview conversation is full.');return;}
  w.messages.push({role:'user',text,meta});
  w.messages.push({role:'assistant',text:'This is a design preview. Your selected recipients, model, files and canvas items were not sent to a live AI.'});
  renderChat();save();
};
function renderChat(){const w=workspace(),log=$('#conversation');log.innerHTML=w.messages.length?w.messages.map((m,i)=>`<div class="chat-message ${m.role}"><span class="role">${m.role==='assistant'?'AI-Verse · Demo':'You'}</span><p>${esc(m.text)}</p>${renderMessageContext(m)}${m.proposal&&!m.applied?`<div class="proposal"><strong>${esc(m.proposal.title)}</strong><span>${m.proposal.type==='workspace'?'Create a film workspace':'Add a note to this canvas'}</span><br><button data-apply="${i}">Apply to preview</button></div>`:m.applied?'<div class="local-state-note">Applied to this browser preview.</div>':''}</div>`).join(''):`<div class="chat-welcome"><span class="tiny-mark">✳</span><h2>Start with a thought.<br>We’ll find its place.</h2><p>Talk through an idea, plan your day, or begin a film. Your workspace can take shape alongside the conversation.</p></div>`;log.querySelectorAll('[data-apply]').forEach(b=>b.onclick=()=>applyProposal(Number(b.dataset.apply)));$('#chat-suggestions').innerHTML=w.messages.length?'':`<button data-example="film">Start a film project</button><button data-example="note">Capture a thought</button>`;$('#chat-suggestions').querySelectorAll('button').forEach(b=>b.onclick=()=>{$('#message').value=b.dataset.example==='film'?'Start a film project called The Mountain Within':'Add a note: An idea worth exploring';$('#message').focus();});log.scrollTop=log.scrollHeight;}
$('#chat-form').onsubmit=e=>{e.preventDefault();const text=$('#message').value.trim();if(!text)return;const w=workspace();if(w.messages.length>100){toast('Start a new demo conversation to continue.');return;}w.messages.push({role:'user',text});let reply={role:'assistant',text:'This is the interface preview, so I can’t reason or run your real OS yet. Try “Start a film project called…” or “Add a note:…”. Those will show how a conversation can update the workspace.'};const match=text.match(/(?:start|create|begin|make)\s+(?:a\s+)?(?:new\s+)?(?:short\s+)?film(?:\s+project)?\s+(?:called|named|titled)\s+(.+)/i),note=text.match(/(?:add|save|capture)\s+(?:a\s+)?(?:note|thought)\s*:\s*(.+)/is);if(match){const title=match[1].replace(/^["“']|["”']$/g,'').trim().slice(0,80);reply={role:'assistant',text:'Here’s a film project we can open alongside this conversation. Apply it to try the flow; this only changes the preview.',proposal:{type:'workspace',title}};}else if(note){reply={role:'assistant',text:`I can place this on ${w.name}. It will stay in this browser preview.`,proposal:{type:'note',title:note[1].trim().slice(0,80),body:note[1].trim()}};}w.messages.push(reply);$('#message').value='';renderChat();save();};
function applyProposal(index){const source=workspace(),m=source.messages[index];if(!m?.proposal||m.applied)return;m.applied=true;if(m.proposal.type==='workspace'){createWorkspace(m.proposal.title,'film');workspace().messages=[{role:'assistant',text:`${m.proposal.title} is ready in this preview. Start with a note, link, or reference image on its canvas.`}];renderChat();}else{addNote(newPosition(),m.proposal.title,m.proposal.body);renderChat();}save();}
$('#message').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('#chat-form').requestSubmit();}});
function stopConnect(){connectMode=false;connectStart=null;$('#connect').setAttribute('aria-pressed','false');$('#canvas-hint').textContent='Drag to explore · Double-click to add a note';}
$('#connect').onclick=()=>{connectMode=!connectMode;connectStart=null;$('#connect').setAttribute('aria-pressed',String(connectMode));$('#canvas-hint').textContent=connectMode?'Select two cards to connect them. Escape to cancel.':'Drag to explore · Double-click to add a note';if(connectMode){selectedNode=null;renderBoard();toast('Select the first card, then the second.');}};
$('#empty-note').onclick=()=>addNote();$('#add-note').onclick=()=>addNote();$('#add-link').onclick=()=>openDialog('Add a reference',`<label for="link-title">Title</label><input id="link-title" required maxlength="100" placeholder="Something to come back to"><label for="link-url">Web address</label><input id="link-url" type="url" required placeholder="https://">`,'Add link',()=>{const url=safeUrl($('#link-url').value);if(!url){toast('Use an https:// or http:// web address.');return false;}addNode({id:uid(),type:'link',title:$('#link-title').value.trim()||'Reference',body:url,...newPosition()});});
const createButton=document.createElement('button');
createButton.id='add-draft';createButton.type='button';createButton.className='tool';createButton.title='Plan a creative draft';
createButton.innerHTML=icon('plus')+'<span>Create</span>';createButton.onclick=createCanvasDraft;
$('#add-image').after(createButton);
$('#add-image').onclick=()=>$('#image-input').click();$('#image-input').onchange=e=>{const file=e.target.files[0],targetId=state.selected;e.target.value='';if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>1500000){toast('Choose a PNG, JPEG or WebP image under 1.5 MB.');return;}const reader=new FileReader();reader.onload=()=>{if(targetId!==state.selected){toast('Workspace changed. Add the image again in the intended workspace.');return;}addNode({id:uid(),type:'image',title:file.name,src:reader.result,...newPosition()});};reader.onerror=()=>toast('The image could not be read. Try another file.');reader.readAsDataURL(file);};
$('#zoom-in').onclick=()=>zoom(.1);$('#zoom-out').onclick=()=>zoom(-.1);$('#zoom-reset').onclick=()=>{const w=workspace(),r=$('#viewport').getBoundingClientRect();if(!w.nodes.length){w.view={x:0,y:0,zoom:1};}else{const minX=Math.min(...w.nodes.map(n=>n.x)),minY=Math.min(...w.nodes.map(n=>n.y)),maxX=Math.max(...w.nodes.map(n=>n.x+($(`[data-node="${n.id}"]`)?.offsetWidth||235))),maxY=Math.max(...w.nodes.map(n=>n.y+($(`[data-node="${n.id}"]`)?.offsetHeight||200))),z=Math.max(.3,Math.min(1,(r.width-70)/(maxX-minX),(r.height-135)/(maxY-minY)));w.view={zoom:z,x:(r.width-(maxX-minX)*z)/2-minX*z,y:35-minY*z};}transform();save();};
$('#focus').onclick=()=>{document.body.classList.toggle('focus-mode');const on=document.body.classList.contains('focus-mode');$('#focus span').textContent=on?'Exit focus':'Focus';$('#focus').setAttribute('aria-pressed',String(on));};
$('#theme').onclick=()=>{state.theme=state.theme==='light'?'dark':'light';render();save();};document.querySelectorAll('[data-area]').forEach(b=>b.onclick=()=>setArea(b.dataset.area));$('.brand').onclick=e=>{e.preventDefault();state.area='personal';selectWorkspace('personal');};$('#create-workspace').onclick=()=>createWorkspaceDialog();$('#dialog-close').onclick=()=>$('#dialog').close();$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#new-chat').onclick=()=>{if(!workspace().messages.length){$('#message').focus();return;}openDialog('Clear demo conversation?',`<p>This clears the conversation for ${esc(workspace().name)}. Its canvas stays as it is.</p>`,'Clear conversation',()=>{workspace().messages=[];renderChat();save();});};
$('#mobile-chat').onclick=()=>{document.body.classList.toggle('chat-open');const open=document.body.classList.contains('chat-open');$('#mobile-chat span').textContent=open?'Close chat':'Chat';$('#mobile-chat').setAttribute('aria-label',open?'Close chat':'Open chat');$('#mobile-chat svg use').setAttribute('href',open?'#i-close':'#i-chat');$('#mobile-chat').setAttribute('aria-expanded',String(open));if(open)$('#message').focus();};
function info(){openDialog('Your first working sketch',`<p><strong>Try:</strong> switching areas, opening workspaces, adding and editing notes, linking cards, importing an image, moving around the canvas, focus mode and dark appearance.</p><p>Chat uses clearly labelled sample responses. It can suggest a film workspace or canvas note. Apply the suggestion to try the flow.</p><p>Everything stays in this browser. It is not connected to Gateway, your personal OS or a live AI. 3D camera tools, editing and generation are future work.</p><button type="button" class="text-button" id="export-preview">Export preview data</button><p class="local-state-note">Export includes your preview notes, images and demo conversations. Keep the file private if you add personal material.</p>`,null);$('#export-preview').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='aiverse-design-preview.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Preview data exported.');};}
$('#preview-info').onclick=info;$('#about').onclick=info;
document.addEventListener('keydown',e=>{if(e.key==='Escape'){stopConnect();if(!$('#dialog').open&&!e.target.closest('[contenteditable],input,textarea')){selectedNode=null;selectedIds.clear();selectedEdge=null;renderBoard();document.body.classList.remove('chat-open');$('#mobile-chat span').textContent='Chat';$('#mobile-chat').setAttribute('aria-label','Open chat');$('#mobile-chat svg use').setAttribute('href','#i-chat');$('#mobile-chat').setAttribute('aria-expanded','false');}}if((e.metaKey||e.ctrlKey)&&['z','y'].includes(e.key.toLowerCase())&&!e.target.closest('input,textarea,[contenteditable]')){e.preventDefault();if(e.shiftKey||e.key.toLowerCase()==='y')redo();else undo();}});
window.addEventListener('resize',drawConnections);render();if(!storageAvailable)toast('Could not load saved preview data. Sample workspaces are shown; export any new work to keep it.');
