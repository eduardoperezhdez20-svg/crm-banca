var CACHE='crm-v1';
var SHELL=['./','index.html','styles.css','app.js','manifest.webmanifest','icon-192.png','icon-512.png','icon-180.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL)}));self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}));self.clients.claim()});
self.addEventListener('fetch',function(e){
  var u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(function(r){var cp=r.clone();caches.open(CACHE).then(function(c){c.put(e.request,cp)});return r}).catch(function(){return caches.match(e.request)}));
});
self.addEventListener('push',function(e){
  var d={};try{d=e.data.json()}catch(_){d={title:'CRM',body:e.data?e.data.text():''}}
  e.waitUntil(self.registration.showNotification(d.title||'CRM',{body:d.body||'',icon:'icon-192.png',badge:'icon-192.png',data:{url:d.url||'./'}}));
});
self.addEventListener('notificationclick',function(e){
  e.notification.close();
  var url=new URL((e.notification.data&&e.notification.data.url)||'./',self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(cs){for(var c of cs){if('focus' in c){c.navigate(url);return c.focus()}}return self.clients.openWindow(url)}));
});
