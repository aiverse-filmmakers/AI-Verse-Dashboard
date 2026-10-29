/**
 * First-party localhost bootstrap: no bearer in HTML, JS, URL, localStorage,
 * sessionStorage, or GitHub Pages. Pairing is typed only into the current DOM.
 * A trusted host starts the server and displays the one-time code privately.
 */
const $=selector=>document.querySelector(selector);
const pairPanel=$("#pair-panel"),connected=$("#connected");
const status=$("#pair-status"),form=$("#pair-form"),code=$("#pair-code");
let chatApp=null;
let activeMonitor=null;
let checking=false;
function stopMonitor(){
  if(activeMonitor!==null)clearInterval(activeMonitor);
  activeMonitor=null;
}
function revokeBrowserView(){
  stopMonitor();chatApp?.destroy();chatApp=null;
  connected.hidden=true;pairPanel.hidden=false;
  showError("Local host session ended or workspace changed. Enter the new one-time code.");
}
async function verifyHostSession(){
  if(checking||!chatApp)return;
  checking=true;
  try{
    const response=await fetch("/local-app/session",{
      credentials:"same-origin",cache:"no-store",redirect:"error"
    });
    if(!response.ok){revokeBrowserView();return;}
    const state=await asJson(response);
    if(state.ok!==true||state.authentication!=="host-cookie"){
      revokeBrowserView();return;
    }
  }catch{
    // Fail closed. Do not continue displaying previously-authorized chats.
    revokeBrowserView();
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
  const response=await fetch("/local-app/session",{
    credentials:"same-origin",cache:"no-store",redirect:"error"
  });
  if(!response.ok){connected.hidden=true;pairPanel.hidden=false;return;}
  const state=await asJson(response);
  if(state.ok!==true || state.authentication!=="host-cookie"
    || !state.scope || typeof state.scope.systemId!=="string"
    || typeof state.scope.workspaceId!=="string")
    throw Error("LOCAL_APP_SESSION_INVALID");
  // The signed/reviewed application JS only loads after host session verification.
  const {mountAuthenticatedPersonalChat}=await import("/local-app/chat.js");
  $("#local-scope").textContent=state.scope.workspaceId;
  if(chatApp)chatApp.destroy();
  chatApp=mountAuthenticatedPersonalChat($("#chat-root"),{
    dashboardOrigin:location.origin,authentication:"host-cookie",selected:state.scope
  });
  pairPanel.hidden=true;
  connected.hidden=false;
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
  stopMonitor();chatApp?.destroy();chatApp=null;
  connected.hidden=true;pairPanel.hidden=false;
  try{
    await fetch("/local-app/logout",{method:"POST",credentials:"same-origin",
      redirect:"error",cache:"no-store",headers:{"content-type":"application/json"},body:"{}"});
    showError("Disconnected. Restart the local host for a new pairing code.");
  }catch{showError("UI closed. Session revocation could not be confirmed.");}
});
activate().catch(()=>showError("Secure local application is unavailable."));
