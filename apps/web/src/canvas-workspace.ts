import {DashboardClient,type ClientScope} from "../../../packages/client/src/index.js";

/**
 * First-party Canvas view. All saved content comes from the Data-owned Canvas
 * RPC contract; a blank Scratch view is deliberately *unsaved* until its first
 * authorized edit. No localStorage, duplicate SQLite or browser authority.
 */
interface Note {id:string;kind:"note";text:string;x:number;y:number}
interface Edge {id:string;from:string;to:string}
interface CanvasDoc {id:string;title:string;version:number;createdAt:string;updatedAt:string;
  board?:{nodes:Note[];edges:Edge[]}}
const safeId=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const editId=()=>{if(!globalThis.crypto?.randomUUID)throw Error("CANVAS_RANDOM_UNAVAILABLE");return globalThis.crypto.randomUUID();};
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,cls:string,text?:string):HTMLElementTagNameMap[K]=>{
  const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;
};
const action=(label:string,fn:()=>void,cls="")=>{
  const n=node("button",cls,label);n.type="button";n.setAttribute("aria-label",label);
  n.addEventListener("click",fn);return n;
};
const codeOf=(error:unknown)=>{const c=(error as {code?:unknown})?.code;
  return typeof c==="string"&&/^[A-Z0-9_]{2,64}$/.test(c)?c:"CANVAS_UNAVAILABLE";};
function documentOf(response:unknown,scope:Required<ClientScope>):CanvasDoc|CanvasDoc[]{
  if(!response||typeof response!=="object")throw Error("CANVAS_INVALID_PROJECTION");
  const wrapper=response as {source?:unknown;workspaceId?:unknown;document?:unknown};
  if(wrapper.source!=="canonical-data"||wrapper.workspaceId!==scope.workspaceId)
    throw Error("CANVAS_SCOPE_MISMATCH");
  const parse=(raw:unknown):CanvasDoc=>{
    if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("CANVAS_INVALID_PROJECTION");
    const d=raw as CanvasDoc;
    if(typeof d.id!=="string"||!safeId.test(d.id)||typeof d.title!=="string"||
      d.title.length>140||!Number.isSafeInteger(d.version)||d.version<1 ||
      typeof d.createdAt!=="string"||typeof d.updatedAt!=="string")
      throw Error("CANVAS_INVALID_PROJECTION");
    if(d.board){
      if(!Array.isArray(d.board.nodes)||!Array.isArray(d.board.edges)||
        d.board.nodes.length>150||d.board.edges.length>300 ||
        d.board.nodes.some(n=>!safeId.test(n.id)||n.kind!=="note"||typeof n.text!=="string"||
          !Number.isFinite(n.x)||!Number.isFinite(n.y))||
        d.board.edges.some(e=>!safeId.test(e.id)||!safeId.test(e.from)||!safeId.test(e.to)))
        throw Error("CANVAS_INVALID_PROJECTION");
    }
    return d;
  };
  return Array.isArray(wrapper.document)?wrapper.document.map(parse):parse(wrapper.document);
}
export class CanvasWorkspace {
  private selected:Required<ClientScope>;
  private epoch=0;
  private busy=false;
  private destroyed=false;
  private expanded=true;
  private libraryOpen=false;
  private list:CanvasDoc[]=[];
  private current:CanvasDoc|null=null;
  private selectedNote:string|null=null;
  private pendingDelete=false;
  private historyOpen=false;
  private history:CanvasDoc[]=[];
  private historyHasMore=false;
  private pendingRevertVersion:number|null=null;
  private readonly header:HTMLElement;
  private readonly status:HTMLElement;
  private readonly sidebar:HTMLElement;
  private readonly board:HTMLElement;
  private readonly controls:HTMLElement;
  private readonly noteEditor:HTMLElement;
  private readonly historyPanel:HTMLElement;
  private readonly content:HTMLElement;
  private readonly libraryToggle:HTMLButtonElement;
  private readonly collapseToggle:HTMLButtonElement;
  private readonly body:HTMLElement;
  constructor(private readonly host:HTMLElement,private readonly client:DashboardClient){
    const scope=client.getScope();
    if(!scope.systemId||!scope.workspaceId)throw Error("Explicit Canvas scope required");
    this.selected={systemId:scope.systemId,workspaceId:scope.workspaceId};
    host.classList.add("aiverse-canvas");
    this.header=node("header","canvas-header");
    const branding=node("div","canvas-brand");
    branding.append(node("strong","","Canvas"),node("span","canvas-scope",this.selected.workspaceId));
    this.libraryToggle=action("Canvas library",()=>{this.libraryOpen=!this.libraryOpen;this.renderLibrary();});
    const refresh=action("Refresh canvases",()=>{void this.refresh();});
    this.collapseToggle=action("Minimize canvas",()=>{
      this.expanded=!this.expanded;this.renderVisibility();
    });
    this.header.append(branding,this.libraryToggle,refresh,this.collapseToggle);
    this.body=node("div","canvas-body");
    this.sidebar=node("nav","canvas-library");
    this.sidebar.setAttribute("aria-label","Canvas document library");
    this.content=node("div","canvas-main");
    this.controls=node("div","canvas-controls");
    this.board=node("div","canvas-board");
    this.board.setAttribute("aria-label","Canonical Canvas board");
    this.noteEditor=node("div","canvas-note-editor");
    this.historyPanel=node("section","canvas-history");
    this.historyPanel.setAttribute("aria-label","Canonical Canvas revision history");
    this.status=node("p","canvas-status","Scratch canvas is empty and unsaved.");
    this.status.setAttribute("role","status");
    this.content.append(this.controls,this.historyPanel,this.board,this.noteEditor,this.status);
    this.body.append(this.sidebar,this.content);
    host.replaceChildren(this.header,this.body);
    this.renderVisibility();this.render();
    void this.refresh();
  }
  private alive(epoch:number){return !this.destroyed&&epoch===this.epoch;}
  private message(text:string){this.status.textContent=text;}
  private failure(error:unknown){
    const c=codeOf(error);
    this.message(c==="CANVAS_OWNER_UNAVAILABLE"?"Canvas Data owner not connected on this host."
      :c==="CANVAS_ACCESS_DENIED"?"Action denied by OS permissions or operator approval."
      :c==="RECORD_VERSION_CONFLICT"?"Canvas changed elsewhere. Reload it before editing."
      :c==="CANVAS_HISTORY_UNAVAILABLE"?"That saved Canvas version is unavailable."
      :c==="CANVAS_HISTORY_INVALID"?"Canvas history could not be verified."
      :"Canvas action unavailable: "+c);
  }
  private snapshot(response:{result:unknown},scope:Required<ClientScope>){
    return documentOf(response.result,scope);
  }
  private renderVisibility(){
    this.host.classList.toggle("canvas-collapsed",!this.expanded);
    this.body.hidden=!this.expanded;
    this.collapseToggle.textContent=this.expanded?"Minimize canvas":"Open canvas";
    this.collapseToggle.setAttribute("aria-label",this.collapseToggle.textContent);
  }
  retarget(next:Required<ClientScope>){
    if(this.destroyed)throw Error("Canvas closed");
    this.epoch++;this.selected={...next};this.client.retarget(next);
    this.current=null;this.list=[];this.busy=false;this.selectedNote=null;
    this.pendingDelete=false;this.historyOpen=false;this.history=[];this.historyHasMore=false;
    this.pendingRevertVersion=null;
    const label=this.header.querySelector(".canvas-scope");
    if(label)label.textContent=next.workspaceId;
    this.message("Workspace changed. Only its own Canvas documents can be opened.");
    this.render();void this.refresh();
  }
  async refresh(silent=false){
    if(this.destroyed||this.busy)return;
    const epoch=this.epoch,scope={...this.selected};
    try{
      const response=await this.client.canvasList(100);
      if(!this.alive(epoch))return;
      const docs=this.snapshot(response,scope);
      if(!Array.isArray(docs))throw Error("CANVAS_INVALID_PROJECTION");
      this.list=docs;
      if(!silent)this.message(docs.length?docs.length+" saved Canvas document(s) in "+scope.workspaceId:
        "No saved canvases in this workspace. Scratch is unsaved until edited.");
      this.renderLibrary();
    }catch(error){if(this.alive(epoch)){this.list=[];if(!silent)this.failure(error);this.renderLibrary();}}
  }
  private async operate(run:()=>Promise<{result:unknown}>,success:string){
    if(this.busy||this.destroyed)return null;
    const epoch=this.epoch,scope={...this.selected};
    this.busy=true;this.pendingDelete=false;this.render();
    try{
      const response=await run();
      if(!this.alive(epoch))return null;
      const result=this.snapshot(response,scope);
      if(Array.isArray(result))throw Error("CANVAS_INVALID_PROJECTION");
      this.current=result;this.message(success);this.render();
      return result;
    }catch(error){
      if(this.alive(epoch)){this.failure(error);this.render();}
      return null;
    }finally{
      if(this.alive(epoch)){this.busy=false;this.render();void this.refresh(true);}
    }
  }
  async open(id:string){
    if(this.busy||!safeId.test(id))return;
    const epoch=this.epoch,scope={...this.selected};
    this.busy=true;this.message("Opening from canonical Data…");this.render();
    try{
      const result=this.snapshot(await this.client.canvasGet(id),scope);
      if(!this.alive(epoch))return;
      if(Array.isArray(result))throw Error("CANVAS_INVALID_PROJECTION");
      this.current=result;this.selectedNote=null;
      this.historyOpen=false;this.history=[];this.historyHasMore=false;this.pendingRevertVersion=null;
      this.message("Saved Canvas · version "+result.version);
    }catch(error){if(this.alive(epoch))this.failure(error);}
    finally{if(this.alive(epoch)){this.busy=false;this.render();}}
  }
  scratch(){
    if(this.busy)return;
    this.current=null;this.selectedNote=null;this.pendingDelete=false;
    this.historyOpen=false;this.history=[];this.historyHasMore=false;this.pendingRevertVersion=null;
    this.message("Scratch canvas is empty. Its first edit creates a real Data document.");
    this.render();
  }
  private async ensureSaved():Promise<CanvasDoc|null>{
    if(this.current)return this.current;
    // The sole implicit create is a direct user-initiated edit on Scratch.
    const response=await this.client.canvasCreate("Scratch Canvas",editId());
    const doc=this.snapshot(response,this.selected);
    if(Array.isArray(doc))throw Error("CANVAS_INVALID_PROJECTION");
    this.current=doc;
    return doc;
  }
  async create(title:string){
    const clean=title.trim();
    if(clean.length<1||clean.length>140){this.message("Canvas title must be 1 to 140 characters.");return;}
    this.selectedNote=null;
    await this.operate(()=>this.client.canvasCreate(clean,editId()),"Saved new Canvas to canonical Data.");
  }
  async rename(title:string){
    if(!this.current)return;
    const clean=title.trim(),d=this.current;
    if(clean.length<1||clean.length>140){this.message("Canvas title must be 1 to 140 characters.");return;}
    await this.operate(()=>this.client.canvasRename(d.id,clean,d.version,editId()),"Canvas renamed in canonical Data.");
  }
  async edit(edit:Record<string,unknown>,success="Canvas saved"){
    if(this.busy||this.destroyed)return;
    // For unsaved Scratch, creating the real document must precede editing.
    const epoch=this.epoch,scope={...this.selected};
    this.busy=true;this.render();
    try{
      const d=await this.ensureSaved();
      if(!this.alive(epoch)||!d)return;
      const response=await this.client.canvasEdit(d.id,edit,d.version,editId());
      if(!this.alive(epoch))return;
      const result=this.snapshot(response,scope);
      if(Array.isArray(result))throw Error("CANVAS_INVALID_PROJECTION");
      this.current=result;this.message(success+" · version "+result.version);
      this.render();
    }catch(error){if(this.alive(epoch)){this.failure(error);this.render();}}
    finally{if(this.alive(epoch)){this.busy=false;this.render();void this.refresh(true);}}
  }
  async remove(){
    if(!this.current||this.busy)return;
    if(!this.pendingDelete){
      this.pendingDelete=true;this.message("Select Confirm delete to request a canonical soft-delete. OS approval may still be required.");
      this.render();return;
    }
    const d=this.current;
    const result=await this.operate(()=>this.client.canvasDelete(d.id,d.version,editId()),
      "Canvas soft-deleted in canonical Data.");
    if(result){this.current=null;this.selectedNote=null;this.render();}
  }
  async duplicate(){
    if(this.busy||!this.current)return;
    const source=this.current;
    // Data creates the entire copy in one version-guarded SQLite transaction.
    // No partial notes, provisional library items or browser-owned clones.
    this.selectedNote=null;
    await this.operate(()=>this.client.canvasDuplicate(source.id,source.version,
      editId(),source.title.slice(0,135)+" copy"),
      "Atomic copy saved in canonical Data.");
  }
  async openHistory(){
    if(this.destroyed||this.busy||!this.current)return;
    const epoch=this.epoch,scope={...this.selected},documentId=this.current.id;
    this.busy=true;this.render();
    try{
      const source=this.snapshot(await this.client.canvasHistory(documentId,20),scope);
      if(!this.alive(epoch)||this.current?.id!==documentId)return;
      if(!Array.isArray(source)||source.some(x=>x.id!==documentId
        ||x.version>this.current!.version))
        throw Error("CANVAS_INVALID_PROJECTION");
      this.history=source;this.historyHasMore=source.length===20;
      this.historyOpen=true;this.pendingRevertVersion=null;
      this.message(source.length+" verified Data revision(s) available.");
    }catch(error){if(this.alive(epoch))this.failure(error);}
    finally{if(this.alive(epoch)){this.busy=false;this.render();}}
  }
  async loadOlderHistory(){
    if(this.destroyed||this.busy||!this.historyOpen||!this.historyHasMore
      ||!this.current||!this.history.length)return;
    const epoch=this.epoch,scope={...this.selected};
    const documentId=this.current.id;
    const cursor=this.history[this.history.length-1]!.version;
    this.busy=true;this.render();
    try{
      const next=this.snapshot(await this.client.canvasHistory(documentId,20,cursor),scope);
      if(!this.alive(epoch)||this.current?.id!==documentId)return;
      if(!Array.isArray(next)||next.some(x=>x.id!==documentId||x.version>=cursor))
        throw Error("CANVAS_INVALID_PROJECTION");
      // Old snapshots are immutable. New pages are strictly descending
      // and never replace a previously admitted owner revision.
      const seen=new Set(this.history.map(x=>x.version));
      if(next.some(x=>seen.has(x.version)))throw Error("CANVAS_INVALID_PROJECTION");
      this.history.push(...next);
      this.historyHasMore=next.length===20;
      this.message(next.length+" older verified revision(s) loaded.");
    }catch(error){if(this.alive(epoch))this.failure(error);}
    finally{if(this.alive(epoch)){this.busy=false;this.render();}}
  }
  async revert(version:number){
    if(this.destroyed||this.busy||!this.current
      ||!this.historyOpen||!this.history.some(x=>x.version===version)
      ||version>=this.current.version)return;
    if(this.pendingRevertVersion!==version){
      this.pendingRevertVersion=version;
      this.message("Confirm restoring v"+version+
        ". This writes a new canonical version; the current version remains in history.");
      this.render();return;
    }
    const d=this.current;
    this.pendingRevertVersion=null;
    const saved=await this.operate(()=>this.client.canvasRevert(d.id,version,d.version,editId()),
      "Restored v"+version+" as a new canonical Canvas version.");
    if(saved&&this.historyOpen)void this.openHistory();
  }
  private renderHistory(){
    this.historyPanel.replaceChildren();
    this.historyPanel.hidden=!this.historyOpen||!this.current;
    if(this.historyPanel.hidden)return;
    const heading=node("div","canvas-history-heading");
    heading.append(node("strong","","Saved versions"));
    heading.append(action("Close history",()=>{
      this.historyOpen=false;this.pendingRevertVersion=null;this.render();
    }));
    this.historyPanel.append(heading);
    const live=this.current!;
    for(const version of this.history){
      const item=node("div","canvas-history-item");
      const label=node("span","",version.version===live.version
        ?"Current · v"+version.version
        :"v"+version.version+" · "+version.title);
      item.append(label);
      if(version.version<live.version){
        const confirm=this.pendingRevertVersion===version.version;
        const b=action(confirm?"Confirm restore v"+version.version:
          version.version===live.version-1?"Undo last change":"Restore v"+version.version,
          ()=>{void this.revert(version.version);});
        b.disabled=this.busy;
        item.append(b);
      }
      this.historyPanel.append(item);
    }
    if(!this.history.length)this.historyPanel.append(
      node("p","canvas-hint","No verified revision snapshots found."));
    if(this.historyHasMore){
      const older=action("Load older versions",()=>{void this.loadOlderHistory();});
      older.disabled=this.busy;
      this.historyPanel.append(older);
    }
  }
  private renderLibrary(){
    this.sidebar.hidden=!this.libraryOpen||!this.expanded;
    this.libraryToggle.setAttribute("aria-expanded",String(this.libraryOpen));
    this.sidebar.replaceChildren();
    if(!this.libraryOpen)return;
    this.sidebar.append(node("strong","canvas-library-title","Your canvases"));
    this.sidebar.append(action("New scratch",()=>this.scratch(),"canvas-library-scratch"));
    const titles=node("div","canvas-library-list");
    for(const d of this.list){
      const item=action(d.title,()=>{void this.open(d.id);},"canvas-library-item");
      item.disabled=this.busy;
      item.title="Open saved Canvas";item.classList.toggle("selected",d.id===this.current?.id);
      titles.append(item);
    }
    this.sidebar.append(titles);
    if(!this.list.length)this.sidebar.append(node("p","canvas-hint","No saved Canvas documents here."));
  }
  private render(){
    this.renderLibrary();
    this.controls.replaceChildren();
    const name=node("div","canvas-current-title",this.current?.title??"Scratch Canvas");
    const caption=node("span","canvas-current-meta",this.current
      ?"Saved · v"+this.current.version:"Unsaved workspace");
    const titleWrap=node("div","canvas-title-wrap");titleWrap.append(name,caption);
    this.controls.append(titleWrap);
    const actions=node("div","canvas-actions");
    const newTitle=node("input","canvas-new-title");newTitle.placeholder="Canvas name";
    newTitle.maxLength=140;newTitle.setAttribute("aria-label","New Canvas name");
    const create=action("Create",()=>{void this.create(newTitle.value);});
    const add=action("Add note",()=>{void this.edit({
      type:"note.add",id:"note-"+editId(),text:"New note",
      x:50+(this.current?.board?.nodes.length??0)%5*30,
      y:60+(this.current?.board?.nodes.length??0)%5*26,
    },"Note added");});
    const duplicate=action("Duplicate",()=>{void this.duplicate();});
    const history=action("History",()=>{void this.openHistory();});
    const reload=action("Reload Canvas",()=>{if(this.current)void this.open(this.current.id);});
    const renameInput=node("input","canvas-rename-title");
    renameInput.maxLength=140;renameInput.value=this.current?.title??"";
    renameInput.setAttribute("aria-label","Rename Canvas title");
    const rename=action("Rename",()=>{void this.rename(renameInput.value);});
    const remove=action(this.pendingDelete?"Confirm delete":"Delete",()=>{void this.remove();});
    const isSaved=Boolean(this.current);
    add.disabled=this.busy;create.disabled=this.busy;newTitle.disabled=this.busy;
    duplicate.disabled=this.busy||!isSaved;
    history.disabled=this.busy||!isSaved;
    reload.disabled=this.busy||!isSaved;
    rename.disabled=this.busy||!isSaved;renameInput.disabled=this.busy||!isSaved;
    remove.disabled=this.busy||!isSaved;
    actions.append(newTitle,create,add,renameInput,rename,duplicate,history,reload,remove);
    this.controls.append(actions);
    this.renderHistory();
    this.renderBoard();
  }
  private renderBoard(){
    this.board.replaceChildren();
    const notes=this.current?.board?.nodes??[];
    const edges=this.current?.board?.edges??[];
    if(!notes.length){
      this.board.append(node("p","canvas-empty","Add a note to begin. Scratch is saved to Data only after your first edit."));
    }
    // Native SVG paths show exact current canonical connections, not a mock.
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("class","canvas-edges");svg.setAttribute("aria-hidden","true");
    svg.setAttribute("width","100%");svg.setAttribute("height","100%");
    svg.setAttribute("viewBox","0 0 "+Math.max(320,this.board.clientWidth)+
      " "+Math.max(330,this.board.clientHeight));
    svg.setAttribute("preserveAspectRatio","none");
    for(const e of edges){
      const a=notes.find(n=>n.id===e.from),b=notes.find(n=>n.id===e.to);
      if(!a||!b)continue;
      const line=document.createElementNS("http://www.w3.org/2000/svg","line");
      for(const [key,value] of [["x1",a.x+72],["y1",a.y+33],["x2",b.x+72],["y2",b.y+33]])
        line.setAttribute(String(key),String(value));
      line.setAttribute("stroke","#8ea5be");line.setAttribute("stroke-width","2");
      svg.append(line);
    }
    this.board.append(svg);
    for(const note of notes){
      const card=action(note.text.slice(0,180)||"Empty note",()=>{this.selectedNote=note.id;this.renderEditor();},
        "canvas-note");
      card.style.left=note.x+"px";card.style.top=note.y+"px";
      card.dataset.noteId=note.id;
      card.disabled=this.busy;
      card.title="Select to edit. Drag to reposition.";
      card.addEventListener("pointerdown",event=>{
        if(this.busy||event.button!==0)return;
        const pointer=event.pointerId, startX=event.clientX,startY=event.clientY;
        const startPos={x:note.x,y:note.y};
        let changed=false;
        // Track via the window, so leaving the note or crossing the board
        // cannot silently cancel the final canonical note.move effect.
        const moving=(e:PointerEvent)=>{
          if(e.pointerId!==pointer)return;
          const dx=e.clientX-startX,dy=e.clientY-startY;
          if(Math.abs(dx)>2||Math.abs(dy)>2)changed=true;
          if(!changed)return;
          card.style.left=Math.max(0,Math.min(100000,startPos.x+dx))+"px";
          card.style.top=Math.max(0,Math.min(100000,startPos.y+dy))+"px";
        };
        const detach=()=>{
          window.removeEventListener("pointermove",moving);
          window.removeEventListener("pointerup",finished);
          window.removeEventListener("pointercancel",cancel);
        };
        const finished=(e:PointerEvent)=>{
          if(e.pointerId!==pointer)return;
          detach();
          if(!changed)return;
          const x=Math.round(Math.max(0,Math.min(100000,startPos.x+e.clientX-startX)));
          const y=Math.round(Math.max(0,Math.min(100000,startPos.y+e.clientY-startY)));
          if(x!==note.x||y!==note.y)void this.edit({type:"note.move",id:note.id,x,y},"Note moved");
        };
        const cancel=(e:PointerEvent)=>{
          if(e.pointerId!==pointer)return;
          detach();this.renderBoard();
        };
        window.addEventListener("pointermove",moving);
        window.addEventListener("pointerup",finished);
        window.addEventListener("pointercancel",cancel);
      });
      this.board.append(card);
    }
    this.renderEditor();
  }
  private renderEditor(){
    this.noteEditor.replaceChildren();
    const notes=this.current?.board?.nodes??[],edges=this.current?.board?.edges??[];
    const chosen=notes.find(n=>n.id===this.selectedNote);
    if(chosen){
      const area=node("textarea","canvas-note-text");
      area.value=chosen.text;area.maxLength=5000;
      area.setAttribute("aria-label","Selected note text");
      const save=action("Save note",()=>{void this.edit({
        type:"note.text",id:chosen.id,text:area.value,
      },"Note updated");});
      const remove=action("Remove note",()=>{this.selectedNote=null;void this.edit({
        type:"note.remove",id:chosen.id,
      },"Note removed");});
      save.disabled=this.busy;remove.disabled=this.busy;
      const wrap=node("div","canvas-note-row");wrap.append(area,save,remove);
      this.noteEditor.append(wrap);
    }
    if(notes.length>=2){
      const connection=node("div","canvas-link-controls");
      const choose=(label:string)=>{
        const select=node("select","canvas-link-select");
        select.setAttribute("aria-label",label);
        for(const n of notes){const opt=node("option","",n.text.slice(0,32)||n.id);
          opt.value=n.id;select.append(opt);}
        return select;
      };
      const from=choose("Connect from note"),to=choose("Connect to note");
      if(notes.length>1)to.value=notes[1].id;
      const link=action("Connect notes",()=>{if(from.value===to.value){
        this.message("Select two different notes.");return;
      }void this.edit({type:"edge.add",id:"edge-"+editId(),from:from.value,to:to.value},
        "Notes connected");});
      link.disabled=this.busy;connection.append(from,to,link);
      this.noteEditor.append(connection);
    }
    if(edges.length){
      const wrap=node("div","canvas-edge-list");
      for(const edge of edges){
        const remove=action("Remove link "+edge.id.slice(0,8),()=>{
          void this.edit({type:"edge.remove",id:edge.id},"Connection removed");
        },"canvas-edge-delete");
        remove.disabled=this.busy;
        const item=node("span","canvas-edge-item",edge.from.slice(0,9)+" → "+edge.to.slice(0,9));
        item.append(remove);wrap.append(item);
      }
      this.noteEditor.append(wrap);
    }
  }
  destroy(){this.destroyed=true;this.epoch++;this.host.replaceChildren();}
}
