/**
 * First-party localhost bootstrap: no bearer in HTML, JS, URL, localStorage,
 * sessionStorage, or GitHub Pages. Pairing is typed only into the current DOM.
 * A trusted host starts the server and displays the one-time code privately.
 */
const $=selector=>document.querySelector(selector);
const pairPanel=$("#pair-panel"),connected=$("#connected");
const status=$("#pair-status"),form=$("#pair-form"),code=$("#pair-code");
let chatApp=null;
const chooser=$("#workspace-chooser"),chooserToggle=$("#open-workspace-chooser");
const choices=$("#workspace-options"),requestForm=$("#workspace-request-form");
const requestStatus=$("#workspace-request-status"),requestButton=$("#workspace-submit");
let pendingId=null,selectedWorkspace=null;
let chooserEpoch=0,sessionEpoch=0;
function hideChooser(){
  chooser.hidden=true;chooserToggle.setAttribute("aria-expanded","false");
}
function resetChooser(){
  chooserEpoch++;
  pendingId=null;
  requestStatus.textContent="No request pending.";
  requestButton.disabled=false;
  choices.replaceChildren();
  hideChooser();
}
async function openChooser(){
  if(!chatApp)return;
  const epoch=++chooserEpoch,scope=selectedWorkspace;
  chooser.hidden=false;chooserToggle.setAttribute("aria-expanded","true");
  choices.replaceChildren();choices.disabled=true;requestButton.disabled=true;
  requestStatus.textContent="Reading approved OS workspaces…";
  const fresh=()=>chatApp&&epoch===chooserEpoch&&selectedWorkspace===scope&&!chooser.hidden;
  try{
    const response=await fetch("/local-app/workspaces",{
      credentials:"same-origin",cache:"no-store",redirect:"error"
    });
    const data=await asJson(response);
    if(!fresh())return;
    if(!response.ok||data.ok!==true||!Array.isArray(data.workspaces)){
      requestStatus.textContent="Workspace catalog unavailable from the trusted host.";
      return;
    }
    choices.replaceChildren();
    for(const workspace of data.workspaces){
      if(!workspace||typeof workspace.id!=="string"||workspace.id===selectedWorkspace)continue;
      const option=document.createElement("option");
      option.value=workspace.id;
      const name=typeof workspace.name==="string"&&workspace.name.trim()
        ?workspace.name.slice(0,80):workspace.id;
      option.textContent=name+" ("+workspace.id+")";
      choices.append(option);
    }
    choices.disabled=choices.options.length===0;
    requestButton.disabled=choices.disabled||pendingId!==null;
    requestStatus.textContent=pendingId!==null
      ?"Waiting for approval in your trusted terminal."
      :choices.disabled?"No other approved OS workspaces.":"Select a workspace to request terminal approval.";
  }catch{if(fresh())requestStatus.textContent="Workspace catalog unavailable.";}
}
chooserToggle.addEventListener("click",()=>{
  if(chooser.hidden)void openChooser();else hideChooser();
});
$("#close-workspace-chooser").addEventListener("click",hideChooser);
requestForm.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!chatApp||pendingId||choices.disabled||!choices.value)return;
  const epoch=chooserEpoch,scope=selectedWorkspace,target=choices.value;
  requestButton.disabled=true;
  requestStatus.textContent="Sending request to the local owner…";
  try{
    const response=await fetch("/local-app/workspace-request",{
      method:"POST",credentials:"same-origin",redirect:"error",cache:"no-store",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({workspaceId:target})
    });
    const data=await asJson(response);
    if(!chatApp||epoch!==chooserEpoch||scope!==selectedWorkspace)return;
    if(!response.ok||data.ok!==true||data.state!=="pending"||typeof data.id!=="string"){
      requestStatus.textContent="Request unavailable or rejected by the host.";
      requestButton.disabled=false;return;
    }
    pendingId=data.id;
    requestStatus.textContent="Waiting for terminal approval. Request ID: "+data.id;
  }catch{
    if(chatApp&&epoch===chooserEpoch){
      requestStatus.textContent="Workspace request unavailable.";
      requestButton.disabled=false;
    }
  }
});
async function checkPending(){
  if(!pendingId||!chatApp)return;
  const epoch=chooserEpoch,requestedId=pendingId;
  try{
    const response=await fetch("/local-app/workspace-request",{
      credentials:"same-origin",cache:"no-store",redirect:"error"
    });
    if(!response.ok)return;
    const data=await asJson(response);
    if(!chatApp||epoch!==chooserEpoch||requestedId!==pendingId)return;
    if(data.id!==pendingId||data.state==="denied"||data.state==="expired"){
      requestStatus.textContent=data.state==="denied"?"Owner denied the workspace request."
        :"Request expired. You may try again.";
      pendingId=null;requestButton.disabled=false;
    }
  }catch{}
}
let activeMonitor=null;
let checking=false;
function stopMonitor(){
  if(activeMonitor!==null)clearInterval(activeMonitor);
  activeMonitor=null;
}
function revokeBrowserView(){
  sessionEpoch++;
  stopMonitor();chatApp?.destroy();chatApp=null;resetChooser();
  selectedWorkspace=null;
  connected.hidden=true;pairPanel.hidden=false;
  showError("Local host session ended or workspace changed. Enter the new one-time code.");
}
async function verifyHostSession(){
  if(checking||!chatApp)return;
  const epoch=sessionEpoch;
  checking=true;
  try{
    const response=await fetch("/local-app/session",{
      credentials:"same-origin",cache:"no-store",redirect:"error"
    });
    if(epoch!==sessionEpoch||!chatApp)return;
    if(!response.ok){revokeBrowserView();return;}
    const state=await asJson(response);
    if(epoch!==sessionEpoch||!chatApp)return;
    if(state.ok!==true||state.authentication!=="host-cookie"
      ||state.scope?.workspaceId!==selectedWorkspace){
      revokeBrowserView();return;
    }
    await checkPending();
  }catch{
    // Only an active generation may fail closed. An obsolete check must not
    // disconnect a newly paired browser.
    if(epoch===sessionEpoch&&chatApp)revokeBrowserView();
  }finally{checking=false;}
}
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden)void verifyHostSession();
});
window.addEventListener("focus",()=>{void verifyHostSession();});
function showError(message){status.textContent=message;}
async function asJson(response){
  try{return await response.json();}catch{return {ok:false,error:{code:"LOCAL_APP_BAD_RESPONSE"}};}
}
async function activate(){
  const epoch=++sessionEpoch;
  const response=await fetch("/local-app/session",{
    credentials:"same-origin",cache:"no-store",redirect:"error"
  });
  if(epoch!==sessionEpoch)return;
  if(!response.ok){connected.hidden=true;pairPanel.hidden=false;return;}
  const state=await asJson(response);
  if(epoch!==sessionEpoch)return;
  if(state.ok!==true || state.authentication!=="host-cookie"
    || !state.scope || typeof state.scope.systemId!=="string"
    || typeof state.scope.workspaceId!=="string")
    throw Error("LOCAL_APP_SESSION_INVALID");
  // The signed/reviewed application JS only loads after host session verification.
  const {mountAuthenticatedPersonalChat}=await import("/local-app/chat.js");
  if(epoch!==sessionEpoch)return;
  $("#local-scope").textContent=state.scope.workspaceId;
  selectedWorkspace=state.scope.workspaceId;
  if(chatApp)chatApp.destroy();
  chatApp=mountAuthenticatedPersonalChat($("#chat-root"),{
    dashboardOrigin:location.origin,authentication:"host-cookie",selected:state.scope
  });
  pairPanel.hidden=true;
  connected.hidden=false;
  resetChooser();
  stopMonitor();activeMonitor=setInterval(()=>{void verifyHostSession();},1500);
}
form.addEventListener("submit",async event=>{
  event.preventDefault();
  const button=form.querySelector("button");
  const value=code.value;
  code.value=""; // pairing secret is never retained after submission
  button.disabled=true;
  showError("Verifying with your local AI-Verse host…");
  try{
    const response=await fetch("/local-app/pair",{
      method:"POST",credentials:"same-origin",redirect:"error",cache:"no-store",
      headers:{"content-type":"application/json"},body:JSON.stringify({code:value})
    });
    const result=await asJson(response);
    if(!response.ok || result.ok!==true){
      showError(result.error?.code==="LOCAL_APP_PAIRING_EXPIRED"
        ?"Pairing expired. Restart the trusted local application to try again."
        :"Pairing denied. Check the one-time code on your computer.");
      return;
    }
    await activate();
  }catch{showError("Local connection unavailable. The browser has not connected.");}
  finally{button.disabled=false;}
});
$("#logout").addEventListener("click",async()=>{
  // Immediately stop UI subscriptions even when host logout request fails.
  sessionEpoch++;
  stopMonitor();chatApp?.destroy();chatApp=null;resetChooser();
  selectedWorkspace=null;
  connected.hidden=true;pairPanel.hidden=false;
  try{
    await fetch("/local-app/logout",{method:"POST",credentials:"same-origin",
      redirect:"error",cache:"no-store",headers:{"content-type":"application/json"},body:"{}"});
    showError("Disconnected. Restart the local host for a new pairing code.");
  }catch{showError("UI closed. Session revocation could not be confirmed.");}
});
activate().catch(()=>showError("Secure local application is unavailable."));
