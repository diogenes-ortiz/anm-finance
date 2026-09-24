// ─── CRECIMIENTO / ADQUISICIÓN ────────────────────────────────────────────────
// CRM: prospectos con puntaje de "ganas", armador de mensajes por toques, seguimiento,
// pipeline, ex clientes y métricas. (Nada económico acá: eso vive en Finanzas.)
(function(){
  const { esc, $ } = UI;
  const L = () => Store.all('growth','leads');

  const STAGES = [
    ['objetivo','Queremos contactar','🎯'], ['contactado','Contactado','📨'], ['reunion','Reunión','🤝'],
    ['propuesta','Propuesta enviada','📄'], ['negociacion','Negociación','⚖️'], ['ganado','Ganado','🏆'],
    ['perdido','Perdido / no avanzó','🪦'], ['ex','Ex cliente','↩️'],
  ];
  const OPEN = ['objetivo','contactado','reunion','propuesta','negociacion'];
  const stage = k => STAGES.find(s=>s[0]===k) || STAGES[0];
  const stageIdx = k => STAGES.findIndex(s=>s[0]===k);
  const SOURCES = ['Hunter (investigación)','Referido','Instagram','LinkedIn','Web / formulario','Evento','Prospección propia','Ex cliente','Otro'];
  const TOUCH = [['whatsapp','💬 WhatsApp'],['email','✉️ Email'],['linkedin','in LinkedIn'],['llamada','📞 Llamada'],['reunion','🤝 Reunión'],['dm','📱 DM redes'],['visita','🚶 Visita'],['otro','· Otro']];
  const label = (opts,v) => (opts.find(o=>o[0]===v)||[,v])[1];

  // Enfoques de propuesta y lo que le podemos aportar en cada caso
  const PITCH = {
    rescate:     { t:'Rescatar presencia y convertirla', e:'🛟', aporte:['Una presencia digital a la altura de su trayectoria','Web / landing pensada para convertir consultas','Google Business + Meta local para aparecer cuando los buscan','WhatsApp como canal de ventas ordenado'] },
    demanda:     { t:'Generación de demanda + WhatsApp', e:'📈', aporte:['Campañas por necesidad (“me falta presión”, “renovar el baño”) en vez de por producto','Click-to-WhatsApp y formularios de presupuesto','Reels técnicos y de showroom que explican y venden','Retargeting del catálogo para no perder a quien ya miró'] },
    performance: { t:'Performance, CRM y omnicanal', e:'🎯', aporte:['Medir qué campañas terminan en venta (sucursal, obra, online)','CRM y seguimiento de leads de punta a punta','Pauta omnicanal con creatividades testeadas','Contenido para arquitectos, obras y profesionales'] },
  };
  const CREDENCIAL = 'Conocemos el rubro: trabajamos con MiPileta, que comparte canal con muchas casas de sanitarios.';
  const aporteOf = l => (l.aporte && l.aporte.trim()) ? l.aporte : [...(PITCH[l.pitch]?.aporte||[]), CREDENCIAL].map(x=>'• '+x).join('\n');

  // ── Ganas (1 a 5 🔥) ────────────────────────────────────────────────────────
  const flames = (n, id) => `<span class="ganas" title="Ganas de trabajar con ellos">${[1,2,3,4,5].map(i=>
    `<span class="${i<=(n||0)?'on':''}" ${id?`onclick="event.stopPropagation();Growth.setGanas('${id}',${i})"`:''}>🔥</span>`).join('')}</span>`;

  // ── Plantillas de mensajes (secuencia de toques) ────────────────────────────
  const DEFAULT_TPL = [
    { id:'t1', name:'1º toque · observación concreta', text:'{saludo}, ¿cómo estás? Soy {yo}, de ANM Content Studio.\n\nEstuve mirando la presencia digital de {empresa} y vi algo bastante concreto: {oportunidad}\n\nSe me ocurrió una forma de arrancar: {pieza}\n\n¿Te parece si te lo muestro en una llamada de 15 minutos?' },
    { id:'t2', name:'2º toque · aportar una idea', text:'{saludo}! Te escribo de nuevo porque armamos algo pensando en {empresa}.\n\nEn concreto, lo que les podríamos sumar:\n{aporte}\n\nSi te sirve, te lo mando armado para que lo veas con el equipo.' },
    { id:'t3', name:'3º toque · credencial del rubro', text:'{saludo}, último mensaje para no molestar 🙂\n\nTrabajamos con MiPileta, que comparte canal con ustedes, así que conocemos bien cómo se mueve el rubro. Creo que en {empresa} hay una oportunidad clara: {oportunidad}\n\nSi en algún momento lo quieren charlar, acá estoy.' },
    { id:'t4', name:'Recontacto · ex cliente', text:'{saludo}, ¿cómo va todo en {empresa}? Hace un tiempo que no hablamos y quería contarte en qué estamos en ANM. ¿Te va un café o una llamada corta?' },
  ];
  const templates = () => Store.setting('msgTemplates', DEFAULT_TPL);
  function fill(tpl, l){
    const me = App.me(), first = (l.contactName||'').trim().split(' ')[0];
    const lc = s => s ? s.charAt(0).toLowerCase()+s.slice(1) : '';
    return tpl.replace(/\{saludo\}/g, first ? 'Hola '+first : 'Hola')
      .replace(/\{nombre\}/g, first || '')
      .replace(/\{empresa\}/g, l.company)
      .replace(/\{yo\}/g, me?.name || '')
      .replace(/\{oportunidad\}/g, lc(l.gap) || 'hay espacio para que lo digital trabaje mucho más para las ventas.')
      .replace(/\{pieza\}/g, lc(l.pieza) || 'una propuesta concreta pensada para ustedes.')
      .replace(/\{aporte\}/g, aporteOf(l));
  }
  const waNumber = l => {
    if(l.whatsapp) return l.whatsapp.replace(/\D/g,'');
    const d = (l.phone||'').split(/[·\/]/)[0].replace(/\D/g,'');
    if(d.startsWith('549')) return d;
    if(d.startsWith('54')) return '549'+d.slice(2);
    if(d.length===10 && d.startsWith('11')) return '549'+d;
    return '';
  };

  function alerts(){
    const t = UI.today(), out = [];
    L().filter(inUnit).forEach(l=>{
      const link = '#/crecimiento/lead/'+l.id;
      if(OPEN.includes(l.stage) && l.nextFollowUp && l.nextFollowUp<=t)
        out.push({ level:l.nextFollowUp<t?'danger':'warn', icon:'📞', title:`Toca contactar: ${l.company}`, desc:`${l.nextAction||'Hacer seguimiento'} · ${l.nextFollowUp<t?'vencido '+UI.fdate(l.nextFollowUp):'hoy'}`, link, to:l.ownerId });
      else if(OPEN.includes(l.stage) && l.stage!=='objetivo' && UI.diffDays((l.stageAt||l.createdAt).slice(0,10))>21 && !l.nextFollowUp)
        out.push({ level:'warn', icon:'🧊', title:`${l.company} se enfrió`, desc:`Hace ${UI.diffDays((l.stageAt||l.createdAt).slice(0,10))} días en “${stage(l.stage)[1]}” y sin próximo contacto.`, link, to:l.ownerId });
      if(l.stage==='ex' && l.winbackDate && l.winbackDate<=t)
        out.push({ level:'warn', icon:'↩️', title:`Momento de recontactar a ${l.company}`, desc:`Ex cliente${l.churnReason?' · se fue por: '+l.churnReason:''}`, link, to:l.ownerId });
    });
    return out;
  }
  const inUnit = l => !l.units?.length || App.matchUnit(l.units);
  const byGanas = (a,b) => (b.ganas||0)-(a.ganas||0) || (a.rank||999)-(b.rank||999) || a.company.localeCompare(b.company);

  // ── Vistas ──────────────────────────────────────────────────────────────────
  const TABS = [['hoy','Hoy toca contactar'],['pipeline','Pipeline'],['contactos','Base de contactos'],['ex','Ex clientes'],['mensajes','Mensajes'],['metricas','Métricas']];
  let q = '', stageF = '', ganasF = 0;

  App.route('crecimiento', ([tab='hoy', id])=>{
    if(tab==='lead') return leadDetail(id);
    const due = L().filter(l=>OPEN.includes(l.stage) && l.nextFollowUp && l.nextFollowUp<=UI.today()).length;
    const tabs = `<div class="tabs">${TABS.map(([k,l])=>`<a href="#/crecimiento/${k}" class="${tab===k?'active':''}">${l}${k==='hoy'&&due?`<span class="cnt">${due}</span>`:''}</a>`).join('')}</div>`;
    const views = { hoy:viewToday, pipeline:viewPipeline, contactos:viewContacts, ex:viewEx, mensajes:viewTemplates, metricas:viewMetrics };
    const v = (views[tab]||viewToday)();
    return { title:'Crecimiento', crumb:'Adquisición · CRM', html: tabs + `<div class="toolbar">${App.unitBar()}</div>` + v.html, after:v.after };
  });

  function leadRow(l, action=true){
    const s = stage(l.stage), over = l.nextFollowUp && l.nextFollowUp<UI.today();
    return `<div class="li click" onclick="App.go('#/crecimiento/lead/${l.id}')">
      <div class="grow"><div class="row" style="gap:8px"><span class="b">${esc(l.company)}</span>${l.validate?'<span class="tag t-yellow">validar</span>':''}</div>
        <div class="xs faint ellip">${esc([l.contactName, l.industry, l.city].filter(Boolean).join(' · '))}</div>
        ${l.nextAction?`<div class="xs" style="margin-top:3px">→ ${esc(l.nextAction)}</div>`:''}</div>
      ${flames(l.ganas, l.id)}
      <span class="tag hide-m">${s[2]} ${s[1]}${l.touches?` · ${l.touches} toque${l.touches>1?'s':''}`:''}</span>
      ${l.nextFollowUp?`<span class="tag ${over?'t-red':l.nextFollowUp===UI.today()?'t-yellow':''}">${UI.fdate(l.nextFollowUp)}</span>`:''}
      ${action?`<button class="btn xs p" onclick="event.stopPropagation();Growth.compose('${l.id}')">✉️ Mensaje</button>`:''}</div>`;
  }

  function viewToday(){
    const t = UI.today(), leads = L().filter(inUnit);
    const due = leads.filter(l=>OPEN.includes(l.stage) && l.nextFollowUp && l.nextFollowUp<=t).sort((a,b)=>a.nextFollowUp.localeCompare(b.nextFollowUp)||byGanas(a,b));
    const fresh = leads.filter(l=>l.stage==='objetivo' && !l.touches).sort(byGanas);
    const week = leads.filter(l=>OPEN.includes(l.stage) && l.nextFollowUp>t && l.nextFollowUp<=UI.addDays(t,7)).sort((a,b)=>a.nextFollowUp.localeCompare(b.nextFollowUp));
    const wk = Game.weekStart(), sent = Store.all('growth','interactions').filter(x=>x.at>=wk && x.type!=='etapa').length;
    const hasHunter = leads.some(l=>l.source==='Hunter (investigación)');
    return { html:`
      <div class="grid g4" style="margin-bottom:22px">
        <div class="card kpi"><div class="l">Toca hoy</div><div class="v" style="color:${due.length?'var(--red)':'var(--green)'}">${due.length}</div><div class="s">seguimientos pendientes</div></div>
        <div class="card kpi"><div class="l">Sin contactar</div><div class="v">${fresh.length}</div><div class="s">prospectos esperando el 1º mensaje</div></div>
        <div class="card kpi"><div class="l">Contactos esta semana</div><div class="v">${sent}</div><div class="s">meta: 10 🎯</div><div class="bar" style="margin-top:8px"><div style="width:${Math.min(sent/10,1)*100}%"></div></div></div>
        <div class="card kpi"><div class="l">En conversación</div><div class="v">${leads.filter(l=>['reunion','propuesta','negociacion'].includes(l.stage)).length}</div><div class="s">reunión, propuesta o negociación</div></div>
      </div>
      <div class="toolbar"><div class="small muted grow">Tu lista del día: primero los seguimientos vencidos, después los prospectos con más 🔥 ganas. Tocá “✉️ Mensaje” para armarlo y mandarlo en un clic.</div>
        ${hasHunter?'':'<button class="btn g" onclick="Growth.importHunter()">⇣ Importar lista Hunter (50)</button>'}<button class="btn p" onclick="Growth.editLead()">＋ Prospecto</button></div>
      <div class="grid g3"><div class="span2 col" style="gap:18px">
        <div class="card"><div class="card-h"><h3>📞 Seguimientos de hoy</h3><span class="sub">${due.length}</span></div>${due.length?`<div class="list">${due.map(l=>leadRow(l)).join('')}</div>`:'<div class="empty small">Nada vencido. 🎉</div>'}</div>
        <div class="card"><div class="card-h"><h3>🎯 Para escribirles por primera vez</h3><span class="sub">ordenados por ganas</span></div>${fresh.length?`<div class="list">${fresh.slice(0,15).map(l=>leadRow(l)).join('')}</div>${fresh.length>15?`<a class="xs" href="#/crecimiento/contactos">Ver los ${fresh.length} →</a>`:''}`:'<div class="empty small">No hay prospectos sin contactar.</div>'}</div>
      </div><div class="col" style="gap:18px">
        <div class="card"><div class="card-h"><h3>📅 Próximos 7 días</h3></div>${week.length?`<div class="list">${week.map(l=>`<div class="li click" onclick="App.go('#/crecimiento/lead/${l.id}')"><div class="grow small b ellip">${esc(l.company)}</div><span class="tag">${UI.fdate(l.nextFollowUp)}</span></div>`).join('')}</div>`:'<div class="small faint">Sin seguimientos agendados.</div>'}</div>
        <div class="card small"><div class="card-h"><h3>Cómo funciona la secuencia</h3></div>
          <div class="muted" style="line-height:1.7">1º toque: una observación concreta de su negocio.<br>2º toque (4 días después): aportar una idea, no “¿viste mi mensaje?”.<br>3º toque: credencial del rubro (MiPileta).<br>Cada envío suma +${Game.XP.interaction} XP y agenda solo el próximo contacto.</div></div>
      </div></div>` };
  }

  function viewPipeline(){
    const leads = L().filter(inUnit);
    const cols = STAGES.filter(s=>OPEN.includes(s[0])||s[0]==='ganado');
    const lanes = cols.map(([k,l,e])=>{
      let items = leads.filter(x=>x.stage===k);
      if(k==='ganado') items = items.filter(x=>UI.diffDays((x.stageAt||x.updatedAt).slice(0,10))<=60);
      items.sort(byGanas);
      return `<div class="lane" data-lane="${k}"><div class="lane-h">${e} ${l} <span class="n">${items.length}</span></div>
        ${items.map(leadCard).join('')}
        ${k==='objetivo'?`<button class="btn g sm" style="width:100%;justify-content:center" onclick="Growth.editLead()">＋ Agregar</button>`:''}</div>`;
    }).join('');
    return { html:`<div class="toolbar"><div class="small muted grow">Arrastrá las tarjetas para cambiar de etapa. Ordenadas por 🔥 ganas.</div>
      <button class="btn g" onclick="Growth.logTouch()">＋ Registrar contacto</button><button class="btn p" onclick="Growth.editLead()">＋ Prospecto</button></div>
      <div class="board" id="lboard">${lanes}</div>`,
      after:()=>UI.kanban($('#lboard'), (id,st)=>Growth.setStage(id,st)) };
  }

  function leadCard(l){
    const over = l.nextFollowUp && l.nextFollowUp<UI.today() && OPEN.includes(l.stage);
    return `<div class="kc ${over?'over':''}" data-drag="${l.id}" onclick="App.go('#/crecimiento/lead/${l.id}')">
      <div class="t">${esc(l.company)}</div><div class="xs faint ellip">${esc([l.contactName,l.industry].filter(Boolean).join(' · '))}</div>
      <div class="m" style="margin-top:8px">${flames(l.ganas, l.id)}<span class="grow"></span>${UI.avatar(App.member(l.ownerId),'sm')}</div>
      ${l.nextFollowUp?`<div class="m" style="margin-top:6px"><span class="tag ${over?'t-red':''}">📞 ${UI.fdate(l.nextFollowUp)}</span>${l.touches?`<span class="xs faint">${l.touches} toque${l.touches>1?'s':''}</span>`:''}</div>`:''}</div>`;
  }

  function viewContacts(){
    let leads = L().filter(inUnit);
    if(stageF) leads = leads.filter(l=>l.stage===stageF);
    if(ganasF) leads = leads.filter(l=>(l.ganas||0)>=ganasF);
    if(q) leads = leads.filter(l=>[l.company,l.contactName,l.industry,l.city,l.notes,l.email,l.gap].join(' ').toLowerCase().includes(q.toLowerCase()));
    leads.sort(byGanas);
    const hasHunter = L().some(l=>l.source==='Hunter (investigación)');
    return { html:`<div class="toolbar"><div class="search grow"><input class="inp" placeholder="Buscar empresa, persona, rubro, zona…" value="${esc(q)}" oninput="Growth.setQ(this.value)"></div>
      <select class="inp sm" onchange="Growth.setStageF(this.value)"><option value="">Todas las etapas</option>${STAGES.map(s=>`<option value="${s[0]}" ${stageF===s[0]?'selected':''}>${s[2]} ${s[1]}</option>`).join('')}</select>
      <select class="inp sm" onchange="Growth.setGanasF(+this.value)"><option value="0">Cualquier nivel de ganas</option>${[5,4,3].map(n=>`<option value="${n}" ${ganasF===n?'selected':''}>${'🔥'.repeat(n)} o más</option>`).join('')}</select>
      ${hasHunter?'':'<button class="btn g" onclick="Growth.importHunter()">⇣ Lista Hunter (50)</button>'}<button class="btn g" onclick="Growth.importCsv()">⇡ CSV</button><button class="btn p" onclick="Growth.editLead()">＋ Contacto</button></div>
      ${leads.length?`<div class="card"><div class="list">${leads.map(l=>leadRow(l)).join('')}</div></div>`:'<div class="card empty"><div class="big">🎯</div>No hay contactos con estos filtros.</div>'}` };
  }

  function viewEx(){
    const ex = L().filter(l=>l.stage==='ex').filter(inUnit).sort((a,b)=>(a.winbackDate||'9').localeCompare(b.winbackDate||'9'));
    const lost = L().filter(l=>l.stage==='perdido').filter(inUnit);
    const reasons = {}; [...ex.map(l=>l.churnReason), ...lost.map(l=>l.lostReason)].filter(Boolean).forEach(r=>reasons[r]=(reasons[r]||0)+1);
    return { html:`<div class="grid g3"><div class="span2">
      <div class="card"><div class="card-h"><h3>↩️ Ex clientes</h3><span class="sub">${ex.length}</span><span class="grow"></span><button class="btn sm p" onclick="Growth.editLead(null,{stage:'ex'})">＋ Ex cliente</button></div>
        ${ex.length?`<div class="list">${ex.map(l=>`<div class="li click" onclick="App.go('#/crecimiento/lead/${l.id}')"><div class="grow"><div class="b">${esc(l.company)}</div><div class="xs faint">${l.churnedAt?'Se fue '+UI.fdate(l.churnedAt,{abs:true}):''}${l.churnReason?' · '+esc(l.churnReason):''}</div></div>
          ${flames(l.ganas, l.id)}${l.winbackDate?`<span class="tag ${l.winbackDate<=UI.today()?'t-yellow':''}">Recontactar ${UI.fdate(l.winbackDate)}</span>`:''}<button class="btn xs p" onclick="event.stopPropagation();Growth.compose('${l.id}','t4')">✉️</button></div>`).join('')}</div>`
        :'<div class="empty small">Cuando des de baja un cliente en Operaciones, te ofrezco guardarlo acá para recuperarlo después.</div>'}</div>
      <div class="card" style="margin-top:18px"><div class="card-h"><h3>🪦 Oportunidades perdidas</h3><span class="sub">${lost.length}</span></div>
        ${lost.length?`<div class="list">${lost.map(l=>`<div class="li click" onclick="App.go('#/crecimiento/lead/${l.id}')"><div class="grow"><div class="b small">${esc(l.company)}</div><div class="xs faint">${esc(l.lostReason||'Sin motivo registrado')}</div></div><span class="xs faint">${UI.ago(l.stageAt)}</span></div>`).join('')}</div>`:'<div class="empty small">Nada por acá</div>'}</div>
      </div><div class="card"><div class="card-h"><h3>¿Por qué se van o no avanzan?</h3></div>
        ${Object.keys(reasons).length?Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(([r,n])=>`<div style="margin-bottom:12px"><div class="row small"><span class="grow">${esc(r)}</span><b>${n}</b></div><div class="bar"><div style="width:${n/Math.max(...Object.values(reasons))*100}%;background:var(--red)"></div></div></div>`).join(''):'<div class="small faint">Registrá los motivos para detectar patrones.</div>'}</div></div>` };
  }

  function viewTemplates(){
    const tpls = templates();
    return { html:`<div class="toolbar"><div class="small muted grow">Plantillas para armar mensajes en un clic. Variables: <code>{saludo}</code> <code>{nombre}</code> <code>{empresa}</code> <code>{oportunidad}</code> <code>{pieza}</code> <code>{aporte}</code> <code>{yo}</code> — se completan con los datos de cada prospecto.</div>
      <button class="btn g" onclick="Growth.editTemplate()">＋ Plantilla</button></div>
      <div class="grid g2">${tpls.map(t=>`<div class="card"><div class="card-h"><h3>${esc(t.name)}</h3><span class="grow"></span><button class="btn xs g" onclick="Growth.editTemplate('${t.id}')">✎ Editar</button></div><div class="small muted prewrap">${esc(t.text)}</div></div>`).join('')}</div>` };
  }

  function viewMetrics(){
    const leads = L().filter(inUnit);
    const won = leads.filter(l=>l.stage==='ganado'), lost = leads.filter(l=>l.stage==='perdido');
    const contacted = leads.filter(l=>(l.touches||0)>0 || stageIdx(l.stage)>=1);
    const replied = leads.filter(l=>['reunion','propuesta','negociacion','ganado'].includes(l.stage) || (l.stage==='perdido' && l.touches));
    const rate = won.length+lost.length ? Math.round(won.length/(won.length+lost.length)*100) : null;
    const reply = contacted.length ? Math.round(leads.filter(l=>['reunion','propuesta','negociacion','ganado'].includes(l.stage)).length/contacted.length*100) : null;
    const cycle = won.filter(l=>l.stageAt&&l.createdAt).map(l=>UI.diffDays(l.createdAt.slice(0,10), l.stageAt.slice(0,10)));
    const avgCycle = cycle.length ? Math.round(cycle.reduce((a,b)=>a+b,0)/cycle.length) : null;
    const touches = Store.all('growth','interactions').filter(t=>t.type!=='etapa');
    const funnel = STAGES.filter(s=>OPEN.includes(s[0])||s[0]==='ganado').map(s=>({ s, n:leads.filter(l=>l.stage===s[0] || (stageIdx(l.stage)>stageIdx(s[0]) && !['perdido','ex'].includes(l.stage))).length }));
    const max = Math.max(1, ...funnel.map(f=>f.n));
    const bySrc = {}; leads.forEach(l=>{ const k = l.source||'Sin dato'; bySrc[k] = bySrc[k]||{ n:0, adv:0 }; bySrc[k].n++; if(['reunion','propuesta','negociacion','ganado'].includes(l.stage)) bySrc[k].adv++; });
    return { html:`<div class="grid g4" style="margin-bottom:22px">
      <div class="card kpi"><div class="l">Prospectos abiertos</div><div class="v">${leads.filter(l=>OPEN.includes(l.stage)).length}</div><div class="s">${contacted.length} ya contactados</div></div>
      <div class="card kpi"><div class="l">Tasa de respuesta</div><div class="v" style="color:var(--blue-l)">${reply!=null?reply+'%':'—'}</div><div class="s">contactados que llegaron a reunión</div></div>
      <div class="card kpi"><div class="l">Tasa de cierre</div><div class="v" style="color:var(--green)">${rate!=null?rate+'%':'—'}</div><div class="s">${won.length} ganados · ${lost.length} perdidos</div></div>
      <div class="card kpi"><div class="l">Ciclo de venta</div><div class="v">${avgCycle!=null?avgCycle+' d':'—'}</div><div class="s">de alta a cierre</div></div></div>
      <div class="grid g2"><div class="card"><div class="card-h"><h3>Embudo</h3><span class="sub">cuántos llegaron a cada etapa</span></div>
        ${funnel.map(f=>`<div style="margin-bottom:12px"><div class="row small"><span class="grow">${f.s[2]} ${f.s[1]}</span><b>${f.n}</b></div><div class="bar" style="height:12px"><div style="width:${f.n/max*100}%"></div></div></div>`).join('')}</div>
      <div class="col" style="gap:18px"><div class="card"><div class="card-h"><h3>¿De dónde vienen las mejores oportunidades?</h3></div>
        ${Object.entries(bySrc).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>`<div style="margin-bottom:10px"><div class="row small"><span class="grow b">${esc(k)}</span><span class="faint">${v.adv}/${v.n} avanzaron</span></div><div class="bar"><div style="width:${v.n?v.adv/v.n*100:0}%;background:var(--green)"></div></div></div>`).join('')||'<div class="small faint">Sin datos</div>'}</div>
      <div class="card"><div class="card-h"><h3>Actividad comercial reciente</h3><span class="sub">${touches.filter(t=>t.at>=Game.weekStart()).length} esta semana</span></div>
        <div class="list">${touches.sort((a,b)=>b.at.localeCompare(a.at)).slice(0,8).map(t=>{ const l = Store.get('growth','leads',t.leadId); return `<div class="li">${UI.avatar(App.member(t.by),'sm')}<div class="grow"><div class="small b ellip">${esc(l?.company||'—')}</div><div class="xs faint ellip">${esc(label(TOUCH,t.type))} · ${esc(t.text||'')}</div></div><span class="xs faint">${UI.ago(t.at)}</span></div>`; }).join('')||'<div class="small faint">Sin actividad</div>'}</div></div></div></div>` };
  }

  // ── Ficha del prospecto ─────────────────────────────────────────────────────
  function leadDetail(id){
    const l = Store.get('growth','leads',id);
    if(!l) return { title:'Contacto', html:'<div class="empty">No encontrado. <a href="#/crecimiento">Volver</a></div>' };
    const st = stage(l.stage), wa = waNumber(l);
    const touches = Store.all('growth','interactions').filter(t=>t.leadId===id).sort((a,b)=>b.at.localeCompare(a.at));
    const links = [l.web&&`<a href="${esc(/^https?:/.test(l.web)?l.web:'https://'+l.web)}" target="_blank">🌐 Web</a>`, l.email&&`<a href="mailto:${esc(l.email)}">✉️ ${esc(l.email)}</a>`,
      wa&&`<a href="${UI.waLink('',wa)}" target="_blank">💬 WhatsApp</a>`, l.phone&&`<span>📞 ${esc(l.phone)}</span>`,
      l.linkedin&&`<a href="${esc(l.linkedin)}" target="_blank">in LinkedIn</a>`, l.instagram&&`<a href="https://instagram.com/${esc(l.instagram.replace('@',''))}" target="_blank">📷 ${esc(l.instagram)}</a>`].filter(Boolean);
    const pitch = PITCH[l.pitch];
    const html = `<div class="row" style="margin-bottom:20px"><a href="#/crecimiento" class="btn g sm">← Crecimiento</a></div>
      <div class="hero" style="margin-bottom:22px"><div class="grow"><div class="row wrap"><span class="tag">${st[2]} ${st[1]}</span>${l.rank?`<span class="tag t-blue">Hunter #${l.rank}</span>`:''}${l.validate?'<span class="tag t-yellow">Validar tamaño y dueño antes</span>':''}</div>
        <h2 style="margin-top:8px">${esc(l.company)}</h2>
        <div class="small muted" style="margin-top:6px">${esc([l.contactName && (l.contactName+(l.role?' ('+l.role+')':'')), l.industry, l.city].filter(Boolean).join(' · '))}</div>
        <div class="row wrap small" style="margin-top:10px;gap:14px">${links.join('')}</div>
        <div class="row" style="margin-top:14px;gap:12px"><span class="xs faint b">GANAS DE TRABAJAR CON ELLOS</span>${flames(l.ganas, id)}</div></div>
        <div class="col" style="align-items:stretch;min-width:220px"><button class="btn p" onclick="Growth.compose('${id}')">✉️ Armar y mandar mensaje</button>
          <select class="inp" onchange="Growth.setStage('${id}',this.value)">${STAGES.map(x=>`<option value="${x[0]}" ${x[0]===l.stage?'selected':''}>${x[2]} ${x[1]}</option>`).join('')}</select>
          <div class="row"><button class="btn g sm grow" onclick="Growth.logTouch('${id}')">＋ Registrar contacto</button><button class="btn g sm" onclick="Growth.editLead('${id}')">✎</button></div></div></div>
      <div class="grid g3"><div class="span2 col" style="gap:18px">
        ${l.nextFollowUp||l.nextAction?`<div class="alert ${l.nextFollowUp&&l.nextFollowUp<UI.today()?'danger':'info'}" style="margin:0"><div class="ai">📞</div><div class="grow"><div class="at">${esc(l.nextAction||'Hacer seguimiento')}</div><div class="ad">${l.nextFollowUp?UI.fdate(l.nextFollowUp,{abs:true}):'Sin fecha'}${l.touches?` · ${l.touches} toque${l.touches>1?'s':''} hechos`:''}</div></div></div>`:''}
        <div class="card"><div class="card-h"><h3>💪 Lo que le podemos aportar</h3>${pitch?`<span class="tag t-purple">${pitch.e} ${esc(pitch.t)}</span>`:''}<span class="grow"></span><button class="btn xs g" onclick="Growth.editLead('${id}')">Editar</button></div>
          ${l.gap?`<div class="xs faint b" style="margin-bottom:4px">OPORTUNIDAD QUE VEMOS</div><div class="small" style="margin-bottom:14px">${esc(l.gap)}</div>`:''}
          ${l.pieza?`<div class="xs faint b" style="margin-bottom:4px">CON QUÉ ENTRARÍAMOS</div><div class="small" style="margin-bottom:14px">${esc(l.pieza)}</div>`:''}
          <div class="xs faint b" style="margin-bottom:4px">PUNTOS FUERTES DE ANM PARA ELLOS</div><div class="small prewrap">${esc(aporteOf(l))}</div></div>
        <div class="card"><div class="card-h"><h3>Historial de contactos</h3><span class="sub">${touches.length}</span></div>
          ${touches.length?`<div class="tl">${touches.map(t=>`<div class="tl-i"><div class="when">${UI.fdate(t.at.slice(0,10),{abs:true})} · ${esc(label(TOUCH,t.type))} · ${esc(App.member(t.by)?.name||'')}</div><div class="small prewrap">${esc(t.text||'')}</div></div>`).join('')}</div>`:'<div class="empty small">Todavía no hubo contacto. Arrancá con “✉️ Armar y mandar mensaje”.</div>'}</div>
      </div><div class="col" style="gap:18px">
        ${l.why?`<div class="card small"><div class="card-h"><h3>¿Por qué nos interesa?</h3></div><div class="muted">${esc(l.why)}</div></div>`:''}
        <div class="card small"><div class="card-h"><h3>Datos</h3></div>
          <div class="list">${[['Fuente',l.source||'—'],['Responsable',App.member(l.ownerId)?.name||'—'],['Alta',UI.fdate((l.createdAt||'').slice(0,10),{abs:true})],['En esta etapa',l.stageAt?UI.ago(l.stageAt):'—'],
            ...(l.lostReason?[['Motivo de pérdida',l.lostReason]]:[]),...(l.churnReason?[['Motivo de baja',l.churnReason]]:[])].map(([k,v])=>`<div class="li"><span class="faint grow">${k}</span><b>${esc(v)}</b></div>`).join('')}</div>
          ${l.alt?`<div class="xs muted" style="margin-top:10px"><b>Otros contactos:</b> ${esc(l.alt)}</div>`:''}</div>
        ${l.notes?`<div class="card"><div class="card-h"><h3>Notas</h3></div><div class="small prewrap muted">${esc(l.notes)}</div></div>`:''}
      </div></div>`;
    return { title:l.company, crumb:'Crecimiento · Prospecto', html };
  }

  // ── Acciones ────────────────────────────────────────────────────────────────
  const Growth = {
    STAGES, alerts,
    setQ(v){ q = v; const pos = document.activeElement?.selectionStart; App.render(); const i = $('.search input'); if(i){ i.focus(); try{ i.setSelectionRange(pos,pos); }catch(e){} } },
    setStageF(v){ stageF = v; App.render(); }, setGanasF(v){ ganasF = v; App.render(); },
    setGanas(id, n){ const l = Store.get('growth','leads',id); Store.upsert('growth','leads',{ id, ganas: l.ganas===n ? n-1 : n }); App.render(); },

    // Armador de mensajes: elige plantilla, completa datos, manda por el canal y registra el toque
    compose(id, tplId){
      const l = Store.get('growth','leads',id); if(!l) return;
      const tpls = templates();
      const def = tplId || (l.stage==='ex' ? 't4' : tpls[Math.min(l.touches||0, 2)]?.id) || tpls[0].id;
      const wa = waNumber(l);
      const box = UI.modal(`<h2>✉️ Mensaje para ${esc(l.company)}<button class="icon-btn x" data-close>✕</button></h2>
        <div class="fld"><label>Plantilla</label><select class="inp" id="cm-tpl">${tpls.map(t=>`<option value="${t.id}" ${t.id===def?'selected':''}>${esc(t.name)}</option>`).join('')}</select></div>
        <div class="fld"><label>Mensaje (podés editarlo)</label><textarea class="inp" id="cm-text" rows="11"></textarea></div>
        <div class="small muted" style="margin-bottom:12px">Para: <b>${esc(l.contactName||'—')}</b>${l.role?' · '+esc(l.role):''} ${wa?'· 💬 '+esc(wa):''} ${l.email?'· ✉️ '+esc(l.email):''}</div>
        <div class="row wrap">
          <button class="btn p" id="cm-wa" ${wa?'':'disabled style="opacity:.4" title="No hay WhatsApp cargado"'}>💬 WhatsApp</button>
          <button class="btn p" id="cm-mail" ${l.email?'':'disabled style="opacity:.4" title="No hay email cargado"'}>✉️ Email</button>
          <button class="btn g" id="cm-li">in LinkedIn</button>
          <button class="btn g" id="cm-copy">📋 Copiar</button></div>
        <p class="xs faint" style="margin-top:12px">Al enviar se registra el toque (+${Game.XP.interaction} XP), pasa a “Contactado” y se agenda el próximo contacto en 4 días.</p>`, true);
      const ta = box.querySelector('#cm-text'), sel = box.querySelector('#cm-tpl');
      const load = ()=>{ ta.value = fill(tpls.find(t=>t.id===sel.value).text, l); };
      sel.onchange = load; load();
      const done = channel => { Growth.recordSend(id, channel, sel.options[sel.selectedIndex].text, ta.value); UI.close(); };
      box.querySelector('#cm-wa').onclick = ()=>{ if(!wa) return; window.open(UI.waLink(ta.value, wa), '_blank'); done('whatsapp'); };
      box.querySelector('#cm-mail').onclick = ()=>{ if(!l.email) return; location.href = UI.mailLink(l.email, `${l.company} + ANM`, ta.value); done('email'); };
      box.querySelector('#cm-li').onclick = ()=>{ UI.copy(ta.value); window.open(l.linkedin || `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent((l.contactName||'')+' '+l.company)}`, '_blank'); done('linkedin'); };
      box.querySelector('#cm-copy').onclick = ()=>{ UI.copy(ta.value); if(confirm('¿Lo registro como enviado?')) done('otro'); };
    },

    recordSend(id, channel, tplName, text){
      const l = Store.get('growth','leads',id);
      const n = (l.touches||0)+1;
      Store.upsert('growth','interactions',{ leadId:id, at:new Date().toISOString(), by:App.me().id, type:channel, text:`${tplName}\n\n${text}` });
      Store.upsert('growth','leads',{ id, touches:n, lastTouchAt:new Date().toISOString(), nextFollowUp:UI.addDays(UI.today(), 4),
        nextAction: n>=3 ? 'Último seguimiento: llamar o cerrar como “no avanzó”' : `${n+1}º toque` });
      Game.log('interaction', `Mensaje a ${l.company} (${n}º toque)`, { icon:'✉️' });
      if(l.stage==='objetivo') Growth.setStage(id, 'contactado', true); else App.render();
    },

    editLead(id, preset={}){
      const l = id ? Store.get('growth','leads',id) : { stage:'objetivo', ownerId:App.me().id, ganas:3, ...preset };
      UI.form({ title: id ? 'Editar prospecto' : 'Nuevo prospecto', values:{ ...l, aporte:l.aporte||'' }, wide:true, fields:[
        { k:'company', label:'Empresa / marca', req:true, half:true }, { k:'industry', label:'Rubro', half:true },
        { k:'contactName', label:'Persona de contacto', half:true }, { k:'role', label:'Cargo', half:true },
        { k:'email', label:'Email', type:'email', half:true }, { k:'whatsapp', label:'WhatsApp', half:true, placeholder:'5491112345678' },
        { k:'phone', label:'Teléfono', half:true }, { k:'city', label:'Zona / ciudad', half:true },
        { k:'web', label:'Web', half:true }, { k:'linkedin', label:'LinkedIn del contacto', half:true },
        { k:'stage', label:'Etapa', type:'select', options:STAGES.map(s=>[s[0],s[2]+' '+s[1]]), half:true }, { k:'source', label:'¿Cómo llegó?', type:'select', options:[['','—'],...SOURCES.map(s=>[s,s])], half:true },
        { k:'ganas', label:'Ganas de trabajar con ellos (1 a 5)', type:'select', options:[[1,'🔥'],[2,'🔥🔥'],[3,'🔥🔥🔥'],[4,'🔥🔥🔥🔥'],[5,'🔥🔥🔥🔥🔥']], half:true }, { k:'ownerId', label:'Responsable', type:'select', options:App.memberOpts(), half:true },
        { k:'pitch', label:'Enfoque de propuesta', type:'select', options:[['','—'],...Object.entries(PITCH).map(([k,p])=>[k,p.e+' '+p.t])], half:true },
        { k:'units', label:'Servicios de interés', type:'multi', options:App.unitOpts() },
        { k:'gap', label:'Oportunidad que vemos', type:'textarea', rows:2, placeholder:'Ej: la web tiene textos de plantilla; no hay campañas por necesidad…' },
        { k:'pieza', label:'Con qué entraríamos', type:'textarea', rows:2, placeholder:'Ej: mockup de home + campaña de una línea' },
        { k:'aporte', label:'Puntos fuertes que le aportamos (vacío = según el enfoque)', type:'textarea', rows:3 },
        { k:'nextAction', label:'Próxima acción', half:true }, { k:'nextFollowUp', label:'Fecha de contacto', type:'date', half:true },
        ...(l.stage==='ex' ? [{ k:'churnReason', label:'¿Por qué se fue?', half:true }, { k:'winbackDate', label:'Volver a contactar el', type:'date', half:true }] : []),
        { k:'notes', label:'Notas', type:'textarea', rows:3 },
      ], danger: id ? { label:'Eliminar', confirm:'¿Eliminar el prospecto y su historial?', fn:()=>{ Store.remove('growth','leads',id); App.go('#/crecimiento'); } } : null,
      onSubmit:v=>{
        v.ganas = +v.ganas || 0;
        const stageChanged = id && v.stage!==l.stage;
        const r = Store.upsert('growth','leads',{ ...l, ...v, stage:l.stage, stageAt:l.stageAt||new Date().toISOString() });
        if(!id){ Game.log('lead', `Nuevo prospecto: ${v.company}`, { icon:'🎯' }); if(v.stage!=='objetivo') Growth.setStage(r.id, v.stage, true); App.go('#/crecimiento/lead/'+r.id); }
        else if(stageChanged) Growth.setStage(id, v.stage);
        else App.render();
      } });
    },

    setStage(id, st, quiet){
      const l = Store.get('growth','leads',id); if(!l || l.stage===st) return;
      const extra = {};
      if(st==='perdido'){ const r = prompt(`¿Por qué no avanzó ${l.company}? (no respondió, timing, eligieron a otro…)`); if(r===null) return App.render(); extra.lostReason = r; extra.nextFollowUp = ''; }
      if(st==='ex'){ extra.churnedAt = UI.today(); extra.winbackDate = UI.addDays(UI.today(), 90); }
      if(st==='ganado') extra.nextFollowUp = '';
      Store.upsert('growth','leads',{ id, stage:st, stageAt:new Date().toISOString(), ...extra });
      Store.upsert('growth','interactions',{ leadId:id, at:new Date().toISOString(), by:App.me().id, type:'etapa', text:`Etapa: ${stage(l.stage)[1]} → ${stage(st)[1]}` });
      if(st==='ganado'){
        Game.log('lead_won', `¡Ganamos a ${l.company}!`, { icon:'🏆' }); UI.confetti(140);
        App.notify('all', `🏆 ¡Nuevo cliente: ${l.company}!`, '#/crecimiento/lead/'+id);
        const has = Store.all('ops','clients').some(c=>c.name.toLowerCase()===l.company.toLowerCase());
        if(!has && confirm(`¡Bien ahí! 🎉\n\n¿Creo a ${l.company} como cliente en Operaciones para empezar el seguimiento?`)){
          const c = Store.upsert('ops','clients',{ name:l.company, units:l.units?.length?l.units:['otros'], ownerId:l.ownerId, health:'ok', active:true, contactName:l.contactName, contactPhone:l.whatsapp||l.phone, contactEmail:l.email, notes:l.notes||'', status:'Cliente nuevo — viene del CRM. ¡Arranca el onboarding!' });
          Store.upsert('ops','updates',{ clientId:c.id, at:new Date().toISOString(), by:App.me().id, health:'ok', text:'Cliente nuevo — viene del CRM. ¡Arranca el onboarding!' });
          if(App.isAdmin()) UI.toast('Recordá cargar su retainer en Finanzas','💡');
        }
      } else if(stageIdx(st)>stageIdx(l.stage) && OPEN.includes(st) && !quiet) Game.log('lead_advance', `${l.company} → ${stage(st)[1]}`, { icon:'➡️' });
      App.render();
    },

    logTouch(id){
      const leads = L().filter(l=>l.stage!=='perdido').sort((a,b)=>a.company.localeCompare(b.company));
      if(!leads.length) return Growth.editLead();
      const l = id ? Store.get('growth','leads',id) : null;
      UI.form({ title:'Registrar contacto', submit:`Guardar (+${Game.XP.interaction} XP)`, values:{ leadId:id||'', type:'llamada', nextFollowUp:UI.addDays(UI.today(),4), nextAction:l?.nextAction||'' }, fields:[
        ...(id ? [] : [{ k:'leadId', label:'Con quién', type:'select', options:leads.map(x=>[x.id,x.company]), req:true }]),
        { k:'type', label:'Canal', type:'select', options:TOUCH },
        { k:'text', label:'¿Qué pasó?', type:'textarea', req:true, rows:3, placeholder:'Atendió el dueño, pidió que le mandemos el caso MiPileta.' },
        { k:'nextAction', label:'Próxima acción', half:true }, { k:'nextFollowUp', label:'Próximo contacto', type:'date', half:true },
      ], onSubmit:v=>{
        const lid = id || v.leadId, lead = Store.get('growth','leads',lid);
        Store.upsert('growth','interactions',{ leadId:lid, at:new Date().toISOString(), by:App.me().id, type:v.type, text:v.text });
        Store.upsert('growth','leads',{ id:lid, nextAction:v.nextAction, nextFollowUp:v.nextFollowUp, touches:(lead.touches||0)+1, lastTouchAt:new Date().toISOString() });
        Game.log('interaction', `Contacto con ${lead.company}`, { icon:'🤝' });
        if(lead.stage==='objetivo') Growth.setStage(lid,'contactado', true); else App.render();
      } });
    },

    editTemplate(id){
      const tpls = templates(), t = id ? tpls.find(x=>x.id===id) : { name:'', text:'{saludo}, ' };
      UI.form({ title: id ? 'Editar plantilla' : 'Nueva plantilla', values:t, fields:[
        { k:'name', label:'Nombre', req:true }, { k:'text', label:'Texto', type:'textarea', rows:10, req:true, hint:'Variables: {saludo} {nombre} {empresa} {oportunidad} {pieza} {aporte} {yo}' },
      ], danger: id ? { label:'Eliminar', confirm:'¿Eliminar la plantilla?', fn:()=>{ Store.setSetting('msgTemplates', tpls.filter(x=>x.id!==id)); App.render(); } } : null,
      onSubmit:v=>{ Store.setSetting('msgTemplates', id ? tpls.map(x=>x.id===id?{ ...x, ...v }:x) : [...tpls, { id:Store.uid(), ...v }]); App.render(); } });
    },

    importHunter(){
      const list = window.HUNTER_PROSPECTS || [];
      const have = new Set(L().map(l=>l.company.toLowerCase()));
      const nuevos = list.filter(p=>!have.has(p.company.toLowerCase()));
      if(!nuevos.length) return UI.toast('La lista ya está cargada','👌');
      if(!confirm(`Voy a cargar ${nuevos.length} prospectos del informe Hunter (sanitarios, grifería, bombas, calefacción) en “Queremos contactar”, con su oportunidad, contacto y pieza de entrada.\n\nLas 🔥 ganas arrancan según el ranking del informe y las podés cambiar. ¿Seguimos?`)) return;
      const units = { rescate:['web','social'], demanda:['pauta','social'], performance:['pauta'] };
      nuevos.forEach(p=>Store.upsert('growth','leads',{
        company:p.company, industry:p.industry, city:p.city||'', contactName:p.contactName||'', role:p.role||'', email:p.email||'', phone:p.phone||'', whatsapp:p.whatsapp||'',
        web:p.web||'', linkedin:p.linkedin||'', instagram:p.instagram||'', alt:p.alt||'', why:p.why, gap:p.gap, pieza:p.pieza, pitch:p.pitch, rank:p.r, validate:!!p.validate,
        ganas: p.r<=5?5 : p.r<=20?4 : p.r<=39?3 : 2, units:units[p.pitch]||[], stage:'objetivo', stageAt:new Date().toISOString(), source:'Hunter (investigación)', ownerId:App.me().id,
      }));
      Game.log('lead', `Cargó ${nuevos.length} prospectos de la lista Hunter`, { icon:'🎯', xp:25 });
      App.go('#/crecimiento/hoy');
    },

    importCsv(){
      UI.form({ title:'Importar contactos (CSV)', submit:'Importar', fields:[
        { k:'csv', label:'Pegá el CSV (primera fila = encabezados)', type:'textarea', rows:10, req:true, hint:'Columnas reconocidas: empresa, contacto, cargo, email, whatsapp, telefono, web, rubro, zona, fuente, oportunidad, notas. Separador coma o punto y coma.' },
      ], onSubmit:v=>{
        const rows = v.csv.split(/\r?\n/).filter(Boolean); if(rows.length<2) return UI.toast('Faltan filas','⚠️');
        const sep = rows[0].includes(';') ? ';' : ',';
        const heads = rows[0].split(sep).map(h=>h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''));
        const map = { empresa:'company', marca:'company', company:'company', contacto:'contactName', nombre:'contactName', cargo:'role', email:'email', mail:'email', whatsapp:'whatsapp', telefono:'phone', instagram:'instagram', web:'web', rubro:'industry', zona:'city', ciudad:'city', fuente:'source', oportunidad:'gap', notas:'notes' };
        let n = 0; const have = new Set(L().map(l=>l.company.toLowerCase()));
        rows.slice(1).forEach(r=>{ const cells = r.split(sep); const rec = { stage:'objetivo', ownerId:App.me().id, stageAt:new Date().toISOString(), ganas:3 };
          heads.forEach((h,i)=>{ if(map[h]) rec[map[h]] = (cells[i]||'').trim(); });
          if(rec.company && !have.has(rec.company.toLowerCase())){ Store.upsert('growth','leads',rec); have.add(rec.company.toLowerCase()); n++; } });
        UI.toast(`${n} contactos importados`,'⇡'); App.render();
      } });
    },

    fromChurn(c){
      const reason = prompt(`¿Por qué se fue ${c.name}? (opcional)`) || '';
      const ex = L().find(l=>l.company.toLowerCase()===c.name.toLowerCase());
      const data = { company:c.name, units:c.units, contactName:c.contactName, whatsapp:c.contactPhone, email:c.contactEmail, stage:'ex', stageAt:new Date().toISOString(), churnedAt:UI.today(), churnReason:reason, winbackDate:UI.addDays(UI.today(),90), ownerId:c.ownerId||App.me().id, ganas:3 };
      Store.upsert('growth','leads', ex ? { ...ex, ...data } : data);
      UI.toast(`${c.name} guardado en Ex clientes`,'↩️');
    },
  };
  window.Growth = Growth;
})();
