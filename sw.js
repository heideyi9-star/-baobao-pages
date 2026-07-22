/* 豹豹机 331：首页大组件稳定防回弹版。 */
const CACHE_NAME = "baobao-shell-v336";
const SHELL = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./apple-touch-icon.png",
  "./baobao-manifest.json",
  "./sw.js"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of SHELL) {
      try { await cache.add(new Request(url, { cache: "reload" })); } catch (_) {}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("baobao-shell-") && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkAndCache(request, cacheKey) {
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(cacheKey || request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const forceUpdate = url.searchParams.has("v") || url.searchParams.has("fresh");
    event.respondWith((async () => {
      const canonical = new Request(new URL("./index.html", self.registration.scope).href);
      if (forceUpdate) {
        try { return await networkAndCache(request, canonical); }
        catch (_) { return (await caches.match(canonical)) || Response.error(); }
      }
      const cached = await caches.match(canonical) || await caches.match("./");
      if (cached) return cached;
      try { return await networkAndCache(request, canonical); }
      catch (_) { return Response.error(); }
    })());
    return;
  }

  if (["script","style","image","manifest","font"].includes(request.destination)) {
    event.respondWith((async () => {
      const cached = await caches.match(request,{ignoreSearch:true});
      if (cached) return cached;
      try { return await networkAndCache(request,request); }
      catch (_) { return Response.error(); }
    })());
  }
});


/* 312：与缓存共用同一个 Service Worker，避免同一作用域注册两个脚本。 */
function bbParsePush(event){
  if(!event.data)return {};
  try{return event.data.json()||{};}catch(error){
    try{return {body:event.data.text()};}catch(inner){return {};}
  }
}

self.addEventListener("push",event=>{
  const data=bbParsePush(event);
  const title=String(data.title||data.personaName||"豹豹机");
  const body=String(data.body||data.message||data.text||"收到一条新消息");
  const chatId=String(data.chatId||data.personaId||"");
  const target=String(data.url||data.appUrl||"./");
  const icon=new URL("./apple-touch-icon.png",self.registration.scope).href;
  const options={
    body,
    icon:data.icon||icon,
    badge:data.badge||icon,
    tag:String(data.tag||("baobao-chat-"+(chatId||"message"))),
    renotify:true,
    data:{url:target,chatId},
    silent:false
  };
  event.waitUntil(Promise.all([
    self.registration.showNotification(title,options),
    self.clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
      list.forEach(client=>client.postMessage({type:"BAOBAO_PUSH_RECEIVED",chatId}));
    })
  ]));
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const data=event.notification.data||{};
  const chatId=String(data.chatId||data.personaId||"");
  const url=new URL(data.url||"./",self.registration.scope);
  if(chatId)url.searchParams.set("bbPushChat",chatId);
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async list=>{
    for(const client of list){
      try{
        const current=new URL(client.url);
        if(current.origin!==url.origin)continue;
        await client.focus();
        try{
          if(typeof client.navigate==="function"){
            await client.navigate(url.href);
            return;
          }
        }catch(error){}
        client.postMessage({type:"BAOBAO_OPEN_CHAT",chatId});
        return;
      }catch(error){}
    }
    return self.clients.openWindow(url.href);
  }));
});
