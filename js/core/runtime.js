'use strict';
/* We Live Quran — architecture runtime v10.5.5
   Explicit namespace + legacy override registry. This replaces accidental
   "last function declaration wins" behavior for newly-refactored layers. */
(function initImamRuntime(g){
  const root=g.ImamApp||(g.ImamApp={});
  root.meta=Object.freeze({version:'10.5.5',schema:12});
  const registry=new Map();
  const history=[];
  root.Legacy={
    override(name,impl,source='unknown'){
      if(typeof impl!=='function')throw new TypeError(`Override ${name} must be a function`);
      const previous=g[name];
      registry.set(name,{name,source,impl,previous});
      history.push({name,source,hadPrevious:typeof previous==='function'});
      g[name]=impl;
      return impl;
    },
    get(name){return registry.get(name)||null;},
    list(){return [...registry.values()].map(({name,source,previous})=>({name,source,hadPrevious:typeof previous==='function'}));},
    history(){return history.slice();}
  };
  root.Utils={
    makeId(prefix='x'){
      if(typeof g.makeId==='function')return g.makeId(prefix);
      return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    },
    escapeHtml(value){
      if(typeof g.esc==='function')return g.esc(value);
      return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    },
    normalizeGrade(value){return value==='جيد جدًا'?'جيد جداً':value;}
  };
})(globalThis);
