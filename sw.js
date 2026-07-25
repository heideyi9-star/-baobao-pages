const CACHE="baobao-pwa-v422-20260725-2345";
const CORE=["./","./index.html","./app.js","./baobao-manifest.json","./apple-touch-icon.png","./icon-512.png","./assets/default-wallpaper.jpg","./assets/page1-polaroid-widget.png","./assets/page2-song-frame.png"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(CORE.map(url=>cache.add(url)))).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith("baobao-")).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{
  const req=event.request;if(req.method!=="GET")return;
  const url=new URL(req.url);if(url.origin!==location.origin)return;
  if(req.mode==="navigate"){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put("./index.html",copy));return res;}).catch(()=>caches.match("./index.html")));return;
  }
  event.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>{
    const network=fetch(req).then(res=>{if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;});
    return hit||network;
  }));
});
