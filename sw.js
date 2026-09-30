// Suba de versão a CADA atualização publicada — é o que faz o navegador notar
// que existe algo novo. Sem isso, nenhum aparelho detecta a atualização.
const CACHE_NAME='pomodoro-v7';
const SHELL=['./','index.html','manifest.json','icon-192.png','icon-512.png','changelog.json'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL)));
  // Sem self.skipWaiting() aqui de propósito: a versão nova fica pronta e
  // esperando; só assume quando a página pedir (ver 'message' abaixo).
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

// A página manda essa mensagem quando o usuário confirma a atualização.
self.addEventListener('message',e=>{
  if(e.data==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET')return;

  // changelog.json precisa sempre vir da rede: é ele que a página consulta
  // para saber se existe versão nova e o que mudou, antes de aplicar.
  if(u.origin===location.origin&&u.pathname.endsWith('/changelog.json')){
    e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request)));
    return;
  }

  const ok=u.origin===location.origin||['www.gstatic.com','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname);
  if(!ok)return;

  // Tudo mais é servido direto do cache da versão instalada (carregamento
  // instantâneo e consistente); só busca na rede o que ainda não foi
  // cacheado. O conteúdo do app só muda quando uma versão nova é aplicada.
  e.respondWith(
    caches.match(e.request,{ignoreSearch:true}).then(cached=>cached||fetch(e.request).then(r=>{
      if(r.ok||r.type==='opaque'){const c=r.clone();caches.open(CACHE_NAME).then(x=>x.put(e.request,c))}
      return r;
    }))
  );
});
