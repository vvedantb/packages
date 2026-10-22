import {
  ARTIFACT_STATE_MAX_KEY_LENGTH,
  ARTIFACT_STATE_MAX_KEYS,
  ARTIFACT_STATE_MAX_TOTAL_BYTES,
  ARTIFACT_STATE_MAX_VALUE_BYTES,
} from "./limits.js";
import type { ArtifactStateMap } from "./stateOps.js";
import { ARTIFACT_LOCAL_STORAGE_PREFIX, ARTIFACT_SESSION_STORAGE_PREFIX } from "./storageShim.js";

/** No network, no frames, no forms: the artifact runs offline in a sandboxed iframe or WebView. */
export const ARTIFACT_CSP =
  "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

/** Guest → host (window message): the bootstrap ran; send the port. */
export const ARTIFACT_READY_TYPE = "artifact:ready";
/** Host → guest (window message, with a MessagePort): state requests go over this port from now on. */
export const ARTIFACT_PORT_TYPE = "artifact:port";
/** Guest → host: `{ type, requestId, op, key?, value? }`. Parse with `parseArtifactStateOp`. */
export const ARTIFACT_STATE_TYPE = "artifact:state";
/** Host → guest: `{ type, requestId, ok, value?, error? }`. */
export const ARTIFACT_STATE_RESULT_TYPE = "artifact:state-result";

/** The global the host sets before the bootstrap runs: the state snapshot. The bootstrap deletes it. */
export const ARTIFACT_SNAPSHOT_GLOBAL = "__ARTIFACT_SNAPSHOT__";
/** The global the host sets before the bootstrap runs: extra names for the state API. The bootstrap deletes it. */
export const ARTIFACT_ALIASES_GLOBAL = "__ARTIFACT_ALIASES__";

/**
 * Runs first in the guest document. Exposes `window.artifactState`
 * (`get`, `set`, `getAll`, `remove`, `reset`; promises; values are JSON), and
 * `window[alias].state` for each alias in `window.__ARTIFACT_ALIASES__`.
 * Replaces `localStorage` and `sessionStorage` with shims over the same state
 * (keys prefixed `ls:` and `ss:`). Writes over the state limits fail in the
 * guest before they reach the host. Talks to the host over a MessagePort, or
 * `window.ReactNativeWebView.postMessage` in a React Native WebView.
 */
export const GUEST_BOOTSTRAP_SCRIPT = `(function(){
  var port=null;
  var seq=0;
  var pending={};
  var store=window.${ARTIFACT_SNAPSHOT_GLOBAL}&&typeof window.${ARTIFACT_SNAPSHOT_GLOBAL}==="object"?window.${ARTIFACT_SNAPSHOT_GLOBAL}:{};
  var aliases=Array.isArray(window.${ARTIFACT_ALIASES_GLOBAL})?window.${ARTIFACT_ALIASES_GLOBAL}:[];
  try{delete window.${ARTIFACT_SNAPSHOT_GLOBAL};delete window.${ARTIFACT_ALIASES_GLOBAL};}catch(e){}
  function copyStore(){
    var next={};
    for(var k in store){if(Object.prototype.hasOwnProperty.call(store,k))next[k]=store[k];}
    return next;
  }
  function utf8len(s){
    return new TextEncoder().encode(String(s)).length;
  }
  function fits(data){
    var keys=Object.keys(data);
    if(keys.length>${String(ARTIFACT_STATE_MAX_KEYS)})return false;
    var total=0;
    for(var i=0;i<keys.length;i++){
      var k=keys[i];
      if(!k||k.length>${String(ARTIFACT_STATE_MAX_KEY_LENGTH)})return false;
      var v=data[k];
      if(typeof v!=="string")return false;
      var sz=utf8len(v);
      if(sz>${String(ARTIFACT_STATE_MAX_VALUE_BYTES)})return false;
      total+=utf8len(k)+sz;
    }
    return total<=${String(ARTIFACT_STATE_MAX_TOTAL_BYTES)};
  }
  function send(msg){
    if(window.ReactNativeWebView&&typeof window.ReactNativeWebView.postMessage==="function"){
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      return;
    }
    if(port){port.postMessage(msg);}
  }
  function call(op,extra){
    return new Promise(function(resolve,reject){
      var requestId=++seq;
      pending[requestId]={resolve:resolve,reject:reject};
      var msg={type:"${ARTIFACT_STATE_TYPE}",requestId:requestId,op:op};
      if(extra){for(var k in extra){if(Object.prototype.hasOwnProperty.call(extra,k))msg[k]=extra[k];}}
      send(msg);
    });
  }
  function handleResult(msg){
    var waiter=pending[msg.requestId];
    if(!waiter)return;
    delete pending[msg.requestId];
    if(msg.ok)waiter.resolve(msg.value);
    else waiter.reject(new Error(msg.error||"State error"));
  }
  function createStorage(prefix){
    function names(){
      var out=[];
      for(var k in store){
        if(Object.prototype.hasOwnProperty.call(store,k)&&k.indexOf(prefix)===0){
          out.push(k.slice(prefix.length));
        }
      }
      return out;
    }
    var api={
      get length(){return names().length;},
      key:function(i){
        var n=names();
        return i>=0&&i<n.length?n[i]:null;
      },
      getItem:function(key){
        var k=prefix+String(key);
        return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null;
      },
      setItem:function(key,value){
        var k=prefix+String(key);
        var v=String(value);
        var next=copyStore();
        next[k]=v;
        if(!fits(next)){
          throw new DOMException("The quota has been exceeded.","QuotaExceededError");
        }
        store=next;
        call("set",{key:k,value:v});
      },
      removeItem:function(key){
        var k=prefix+String(key);
        if(!Object.prototype.hasOwnProperty.call(store,k))return;
        var next=copyStore();
        delete next[k];
        store=next;
        call("remove",{key:k});
      },
      clear:function(){
        var n=names();
        var next=copyStore();
        for(var i=0;i<n.length;i++) delete next[prefix+n[i]];
        store=next;
        for(var j=0;j<n.length;j++) call("remove",{key:prefix+n[j]});
      }
    };
    return new Proxy(api,{
      get:function(t,p){
        if(p in t)return t[p];
        if(typeof p==="string")return t.getItem(p);
        return undefined;
      },
      set:function(t,p,v){
        t.setItem(String(p),String(v));
        return true;
      },
      deleteProperty:function(t,p){
        t.removeItem(String(p));
        return true;
      }
    });
  }
  try{
    Object.defineProperty(window,"localStorage",{configurable:true,enumerable:true,value:createStorage("${ARTIFACT_LOCAL_STORAGE_PREFIX}")});
    Object.defineProperty(window,"sessionStorage",{configurable:true,enumerable:true,value:createStorage("${ARTIFACT_SESSION_STORAGE_PREFIX}")});
  }catch(err){}
  var state={
    get:function(key){return call("get",{key:String(key)});},
    set:function(key,value){
      var encoded;
      try{encoded=JSON.stringify(value);}
      catch(e){return Promise.reject(e);}
      var next=copyStore();
      next[String(key)]=encoded;
      if(!fits(next))return Promise.reject(new Error("State exceeds quota."));
      store=next;
      return call("set",{key:String(key),value:encoded});
    },
    getAll:function(){return call("getAll");},
    remove:function(key){
      var next=copyStore();
      delete next[String(key)];
      store=next;
      return call("remove",{key:String(key)});
    },
    reset:function(){
      store={};
      return call("reset");
    }
  };
  window.artifactState=state;
  for(var a=0;a<aliases.length;a++){
    if(typeof aliases[a]==="string")window[aliases[a]]={state:state};
  }
  window.addEventListener("message",function(event){
    var data=event.data;
    if(!data||typeof data!=="object")return;
    if(data.type==="${ARTIFACT_PORT_TYPE}"&&event.ports&&event.ports[0]){
      port=event.ports[0];
      port.onmessage=function(e){
        var msg=e.data;
        if(msg&&msg.type==="${ARTIFACT_STATE_RESULT_TYPE}")handleResult(msg);
      };
      return;
    }
    if(data.type==="${ARTIFACT_STATE_RESULT_TYPE}")handleResult(data);
  });
  send({type:"${ARTIFACT_READY_TYPE}"});
})();`;

export type ArtifactGuestOptions = {
  /**
   * Extra globals for the state API: `["app"]` makes `window.app.state` the
   * same object as `window.artifactState`. Each must be a JavaScript
   * identifier and must not name a built-in global (`window`, `document`, …).
   */
  stateGlobalAliases?: readonly string[];
};

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const RESERVED_ALIASES = new Set([
  "artifactState",
  "window",
  "self",
  "globalThis",
  "document",
  "location",
  "top",
  "parent",
  "frames",
  "localStorage",
  "sessionStorage",
  "ReactNativeWebView",
  ARTIFACT_SNAPSHOT_GLOBAL,
  ARTIFACT_ALIASES_GLOBAL,
]);

/** Throws on an alias that is not an identifier or would replace a global the page or the bootstrap needs. */
export function assertStateGlobalAliases(aliases: readonly string[]): void {
  for (const alias of aliases) {
    if (!IDENTIFIER.test(alias) || RESERVED_ALIASES.has(alias)) {
      throw new Error(`Invalid artifact state alias: ${JSON.stringify(alias)}`);
    }
  }
}

/** JSON for an inline <script>: `<` is escaped so the data cannot close the script element. */
export function embedJsonInScript(value: object): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * The inline script for the guest: the snapshot and aliases, then
 * `GUEST_BOOTSTRAP_SCRIPT`. A React Native WebView can pass it as
 * `injectedJavaScriptBeforeContentLoaded`.
 */
export function artifactGuestScript(snapshot?: ArtifactStateMap, options: ArtifactGuestOptions = {}): string {
  const aliases = options.stateGlobalAliases ?? [];
  assertStateGlobalAliases(aliases);
  return (
    `window.${ARTIFACT_SNAPSHOT_GLOBAL}=${embedJsonInScript(snapshot ?? {})};` +
    `window.${ARTIFACT_ALIASES_GLOBAL}=${embedJsonInScript(aliases)};` +
    GUEST_BOOTSTRAP_SCRIPT
  );
}

/** Put the CSP meta tag and the guest script at the start of the document's <head>, adding a <head> or a whole document when missing. */
export function wrapArtifactHtml(html: string, snapshot?: ArtifactStateMap, options: ArtifactGuestOptions = {}): string {
  const headInject =
    `<meta http-equiv="Content-Security-Policy" content="${ARTIFACT_CSP}">` +
    `<script>${artifactGuestScript(snapshot, options)}</script>`;
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch && headMatch.index !== undefined) {
    const insertAt = headMatch.index + headMatch[0].length;
    return html.slice(0, insertAt) + headInject + html.slice(insertAt);
  }
  if (/<html/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (open) => `${open}<head>${headInject}</head>`);
  }
  return `<!doctype html><html><head>${headInject}<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body>${html}</body></html>`;
}
