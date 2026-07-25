const CACHE="baobao-pwa-v425-complete-20260726";
const CORE=["./","./index.html","./app.css","./app.js","./baobao-manifest.json","./apple-touch-icon.png","./icon-512.png","./default-wallpaper.jpg","./page1-polaroid-widget.png","./page2-song-frame.png"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(CORE.map(url=>cache.add(url)))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("baobao-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
async function networkFirst(req,fallback){
  try{
    const res=await fetch(req,{cache:"no-store"});
    if(res&&res.ok){const c=await caches.open(CACHE);c.put(req,res.clone());}
    return res;
  }catch(_){return (await caches.match(req,{ignoreSearch:true}))||(fallback?await caches.match(fallback):Response.error());}
}
self.addEventListener("fetch",event=>{
  const req=event.request;if(req.method!=="GET")return;
  const url=new URL(req.url);if(url.origin!==location.origin)return;
  if(req.mode==="navigate"){event.respondWith(networkFirst(req,"./index.html"));return;}
  if(/\.(?:js|css)$/.test(url.pathname)){event.respondWith(networkFirst(req));return;}
  event.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(res=>{if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;})));
});
