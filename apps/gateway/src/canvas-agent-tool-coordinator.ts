import type {CanvasContextSnapshot,CanvasSelectionRequest,SelectedCanvasNote,SelectedCanvasEdge}
  from "./canvas-context.js";
import {CanvasContextReader} from "./canvas-context.js";
import type {CanvasHostFacts} from "./canvas-owner-bridge.js";
import {CanvasAgentActions} from "./canvas-agent-actions.js";

/**
 * TRUSTED NATIVE HOST ONLY. No HTTP route, browser RPC or model-side
 * authority. A real installed host must independently authenticate the
 * human session and canonical run before it calls this object.
 *
 * The model receives `describe` output as untrusted DATA, and may return
 * only a typed note-edit proposal. It never receives the handle/authority.
 */
export type CanvasToolHandle={readonly kind:"native-canvas-tool-handle"};
export interface CanvasModelContext {
  readonly source:"canonical-data/canvas-selection";
  readonly trust:"canvas-text-is-untrusted-data";
  readonly document:{readonly id:string;readonly title:string;readonly version:number};
  readonly selection:{
    readonly notes:readonly SelectedCanvasNote[];
    readonly edges:readonly SelectedCanvasEdge[];
    readonly noteCount:number;readonly edgeCount:number;
  };
}
export interface CanvasSelectedNoteProposal {
  readonly kind:"selected-note.replace-text";
  readonly operationId:string;
  readonly noteId:string;
  readonly text:string;
}
type Entry={runId:string;context:CanvasContextSnapshot;closed:boolean};
const handles=new WeakMap<object,Entry>();
const id=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const deny=(kind:"CANVAS_TOOL_DENIED"|"CANVAS_TOOL_INVALID"="CANVAS_TOOL_DENIED")=>
  Object.assign(new Error(kind),{code:kind});
const exact=(v:unknown,allowed:readonly string[])=>!!v
  &&typeof v==="object"&&!Array.isArray(v)
  &&Object.keys(v).sort().join(",")===([...allowed].sort().join(","));
const error=()=>deny();
function entryOf(handle:CanvasToolHandle):Entry{
  const entry=handle&&typeof handle==="object"?handles.get(handle):undefined;
  if(!entry||entry.closed)throw error();
  return entry;
}
export class CanvasAgentToolCoordinator{
  constructor(
    private readonly contextReader:CanvasContextReader,
    private readonly actions:CanvasAgentActions,
  ){}
  /**
   * Selection is supplied by native UI session, never a model-proposed
   * document ID. Agent read grants are checked through the canonical
   * Gateway store, and human read grants through Data owner.
   */
  async open(input:{
    readonly runId:string;
    readonly hostFacts:CanvasHostFacts;
    readonly selection:CanvasSelectionRequest;
  },signal?:AbortSignal):Promise<CanvasToolHandle>{
    if(!exact(input,["runId","hostFacts","selection"])||!id.test(input.runId)
      ||!input.hostFacts||!input.selection)throw deny("CANVAS_TOOL_INVALID");
    // Read-only run probe: verifies actual Gateway run binding, native bot
    // identity and OS permission before exposing the proposed target.
    const observed=await this.actions.invoke({
      runId:input.runId,operationId:"read-selection",
      method:"aiverse.canvas.get",params:{id:input.selection.documentId},
    },signal);
    const context=await this.contextReader.capture(input.hostFacts,input.selection,signal);
    if(signal?.aborted||observed.workspaceId!==context.workspaceId
      ||observed.agentRunId!==input.runId
      ||!observed.document||typeof observed.document!=="object"
      ||(observed.document as {id?:unknown}).id!==context.documentId
      ||(observed.document as {version?:unknown}).version!==context.documentVersion)
      throw deny();
    const handle=Object.freeze({kind:"native-canvas-tool-handle" as const});
    handles.set(handle,{runId:input.runId,context,closed:false});
    return handle;
  }
  describe(handle:CanvasToolHandle):CanvasModelContext{
    const {context}=entryOf(handle);
    return Object.freeze({
      source:"canonical-data/canvas-selection" as const,
      trust:"canvas-text-is-untrusted-data" as const,
      document:Object.freeze({id:context.documentId,title:context.documentTitle,
        version:context.documentVersion}),
      selection:Object.freeze({
        notes:context.selectedNodes,edges:context.selectedEdges,
        noteCount:context.noteCount,edgeCount:context.edgeCount,
      }),
    });
  }
  /**
   * A proposed edit is always re-authorized at the real agent Data effect.
   * Context handle is not accepted from model JSON or network serialization.
   */
  async execute(handle:CanvasToolHandle,proposal:CanvasSelectedNoteProposal,
    signal?:AbortSignal){
    const {runId,context}=entryOf(handle);
    if(!exact(proposal,["kind","operationId","noteId","text"])
      ||proposal.kind!=="selected-note.replace-text"
      ||!id.test(proposal.operationId)||!id.test(proposal.noteId)
      ||typeof proposal.text!=="string"||proposal.text.length>5000
      ||!context.selectedNodes.some(n=>n.id===proposal.noteId))
      throw deny("CANVAS_TOOL_INVALID");
    return this.actions.invokeSelectedNoteEdit({
      runId,operationId:proposal.operationId,context,noteId:proposal.noteId,
      text:proposal.text,
    },signal);
  }
  close(handle:CanvasToolHandle):void{
    const entry=entryOf(handle);
    entry.closed=true;
    handles.delete(handle);
  }
}
