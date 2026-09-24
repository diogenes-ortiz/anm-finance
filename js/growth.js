// ─── CRECIMIENTO / ADQUISICIÓN ────────────────────────────────────────────────
// CRM: prospectos, pipeline comercial, ex clientes, evaluador de empresas (ICP) y métricas.
(function(){
  const { esc, $ } = UI;
  const L = () => Store.all('growth','leads');

  const STAGES = [
    ['objetivo','Queremos contactar','🎯',0.05], ['contactado','Contactado','📨',0.1], ['reunion','Reunión','🤝',0.25],
    ['propuesta','Propuesta enviada','📄',0.5], ['negociacion','Negociación','⚖️',0.75], ['ganado','Ganado','🏆',1],
    ['perdido','Perdido / no avanzó','🪦',0], ['ex','Ex cliente','↩️',0],
  ];
  const OPEN = ['objetivo','contactado','reunion','propuesta','negociacion'];
  const stage = k => STAGES.find(s=>s[0]===k) || STAGES[0];
  const SOURCES = ['Referido','Instagram','LinkedIn','Web / formulario','Evento','Prospección propia','Ex cliente','Otro'];
  const TOUCH = [['whatsapp','💬 WhatsApp'],['llamada','📞 Llamada'],['email','✉️ Email'],['reunion','🤝 Reunión'],['dm','📱 DM redes'],['visita','🚶 Visita'],['otro','· Otro']];
  const DEFAULT_ICP = [
    { id:'budget', label:'Tiene presupuesto acorde a nuestro fee', w:3 },
    { id:'need', label:'Necesita claramente lo que hacemos', w:3 },
    { id:'decider', label:'Hablamos con quien decide', w:2 },
    { id:'multi', label:'Potencial de sumar varias unidades (redes + pauta + web…)', w:2 },
    { id:'recurring', label:'Relación recurrente, no solo un proyecto puntual', w:2 },
    { id:'industry', label:'Rubro que conocemos o queremos trabajar', w:2 },
    { id:'brand', label:'Marca que suma a nuestro portfolio', w:1 },
    { id:'chem', label:'Buena química / fácil de trabajar', w:1 },
  ];
  const icp = () => Store.setting('icp', DEFAULT_ICP);
  const inUnit = l => !l.units?.length || App.matchUnit(l.units);

  function score(lead){
    const crit = icp(), sc = lead.score||{};
    const rated = crit.filter(c=>sc[c.id]);
    if(rated.length<3) return { pct:null, grade:'', rated:rated.length };
    const wsum = rated.reduce((s,c)=>s+c.w,0);
    const pct = Math.round(rated.reduce((s,c)=>s+c.w*(sc[c.id]-1)/4,0)/wsum*100);
    return { pct, grade: pct>=75?'A':pct>=55?'B':pct>=35?'C':'D', rated:rated.length };
  }
  const GRADE_TXT = { A:'Cliente ideal: priorizar y dedicarle tiempo.', B:'Buen fit: vale la pena avanzar.', C:'Fit dudoso: avanzar solo si hay capacidad.', D:'Bajo fit: probablemente no nos conviene.', '':'Calificá al menos 3 criterios para ver el puntaje.' };

  function alerts(){
    const t = UI.today(), out = [];
    L().filter(inUnit).forEach(l=>{
      const link = '#/crecimiento/lead/'+l.id;
      if(OPEN.includes(l.stage) && l.nextFollowUp && l.nextFollowUp<=t)
        out.push({ level:l.nextFollowUp<t?'danger':'warn', icon:'📞', title:`Seguimiento: ${l.company}`, desc:`${l.nextAction||'Hacer seguimiento'} · ${l.nextFollowUp<t?'vencido '+UI.fdate(l.nextFollowUp):'hoy'}`, link, to:l.ownerId });
      else if(OPEN.includes(l.stage) && l.stage!=='objetivo' && UI.diffDays((l.stageAt||l.createdAt).slice(0,10))>21 && !l.nextFollowUp)
        out.push({ level:'warn', icon:'🧊', title:`${l.company} está estancado`, desc:`Hace ${UI.diffDays((l.stageAt||l.createdAt).slice(0,10))} días en “${stage(l.stage)[1]}” y sin próximo seguimiento.`, link, to:l.ownerId });
      if(l.stage==='ex' && l.winbackDate && l.winbackDate<=t)
        out.push({ level:'warn', icon:'↩️', title:`Momento de recontactar a ${l.company}`, desc:`Ex cliente${l.churnReason?' · se fue por: '+l.churnReason:''}`, link, to:l.ownerId });
    });
    return out;
  }

  // ── Vistas ──────────────────────────────────────────────────────────────────
  const TABS = [['pipeline','Pipeline'],['contactos','Base de contactos'],['ex','Ex clientes'],['evaluador','¿Es buena empresa?'],['metricas','Métricas']];
  let q = '', stageF = '', sourceF = '';

  App.route('crecimiento', ([tab='pipeline', id])=>{
    if(tab==='lead') return leadDetail(id);
    const al = alerts();
    const tabs = `<div class="tabs">${TABS.map(([k,l])=>`<a href="#/crecimiento/${k}" class="${tab===k?'active':''}">${l}</a>`).join('')}</div>`;
    const views = { pipeline:viewPipeline, contactos:viewContacts, ex:viewEx, evaluador:viewScore, metricas:viewMetrics };
    const v = (views[tab]||viewPipeline)();
    const alHtml = al.length && tab==='pipeline' ? `<div style="margin-bottom:20px">${al.slice(0,6).map(Ops.alertRow).join('')}${al.length>6?`<div class="xs faint">y ${al.length-6} más…</div>`:''}</div>` : '';
    return { title:'Crecimiento', crumb:'Adquisición · CRM', html: tabs + `<div class="toolbar">${App.unitBar()}</div>` + alHtml + v.html, after:v.after };
  });


  function viewPipeline(){
    const leads = L().filter(inUnit);
    const cols = STAGES.filter(s=>OPEN.includes(s[0])||s[0]==='ganado');
    const lanes = cols.map(([k,l,e,p])=>{
      let items = leads.filter(x=>x.stage===k);
      if(k==='ganado') items = items.filter(x=>UI.diffDays((x.stageAt||x.updatedAt).slice(0,10))<=60);
      items.sort((a,b)=>(score(b).pct??-1)-(score(a).pct??-1));
      const sum = items.reduce((s,x)=>s+(+x.value||0),0);
      return `<div class="lane" data-lane="${k}"><div class="lane-h">${e} ${l} <span class="n">${items.length}</span><span class="sum">${sum?UI.money(sum):''}</span></div>
        ${items.map(leadCard).join('')}
        ${k==='objetivo'?`<button class="btn g sm" style="width:100%;justify-content:center" onclick="Growth.editLead()">＋ Agregar</button>`:''}</div>`;
    }).join('');
    const open = leads.filter(l=>OPEN.includes(l.stage));
    const weighted = open.reduce((s,l)=>s+(+l.value||0)*stage(l.stage)[3],0);
    return { html:`<div class="toolbar"><div class="small muted grow">${open.length} oportunidades abiertas · Pipeline ponderado <b style="color:var(--text)">${UI.money(weighted)}</b>/mes</div>
      <button class="btn g" onclick="Growth.logTouch()">＋ Registrar contacto</button><button class="btn p" onclick="Growth.editLead()">＋ Prospecto</button></div>
      <div class="board" id="lboard">${lanes}</div><p class="xs faint" style="margin-top:8px">Arrastrá para mover de etapa. Ordenado por puntaje de fit.</p>`,
      after:()=>UI.kanban($('#lboard'), (id,st)=>Growth.setStage(id,st)) };
  }

  function leadCard(l){
    const s = score(l), over = l.nextFollowUp && l.nextFollowUp<UI.today() && OPEN.includes(l.stage);
    return `<div class="kc ${over?'over':''}" data-drag="${l.id}" onclick="App.go('#/crecimiento/lead/${l.id}')">
      <div class="row" style="align-items:flex-start"><div class="grow"><div class="t">${esc(l.company)}</div><div class="xs faint">${esc(l.contactName||'')}${l.industry?' · '+esc(l.industry):''}</div></div>${s.grade?`<span class="score s-${s.grade}" style="width:30px;height:30px;font-size:13px">${s.grade}</span>`:''}</div>
      <div class="m" style="margin-top:8px">${UI.avatar(App.member(l.ownerId),'sm')}${l.value?`<span class="b">${UI.money(l.value)}</span>`:''}${l.nextFollowUp?`<span class="tag ${over?'t-red':''}">📞 ${UI.fdate(l.nextFollowUp)}</span>`:''}</div></div>`;
  }

  function contactsTable(leads){
    if(!leads.length) return '<div class="card empty"><div class="big">🎯</div>No hay contactos con estos filtros.</div>';
    return `<div class="card tbl-wrap" style="padding:6px"><table class="tbl"><thead><tr><th>Empresa</th><th>Etapa</th><th>Fit</th><th class="hide-m">Fuente</th><th class="hide-m">Valor/mes</th><th>Próximo seguimiento</th><th class="hide-m">Resp.</th></tr></thead><tbody>
      ${leads.map(l=>{ const s = score(l), st = stage(l.stage); return `<tr style="cursor:pointer" onclick="App.go('#/crecimiento/lead/${l.id}')">
        <td><div class="b">${esc(l.company)}</div><div class="xs faint">${esc([l.contactName,l.industry].filter(Boolean).join(' · '))}</div></td>
        <td><span class="tag">${st[2]} ${st[1]}</span></td><td>${s.grade?`<span class="score s-${s.grade}" style="width:30px;height:30px;font-size:13px">${s.grade}</span>`:'<span class="faint">—</span>'}</td>
        <td class="hide-m small">${esc(l.source||'—')}</td><td class="hide-m small">${l.value?UI.money(l.value):'—'}</td>
        <td>${l.nextFollowUp?`<span class="tag ${l.nextFollowUp<UI.today()?'t-red':''}">${UI.fdate(l.nextFollowUp)}</span>`:'<span class="faint small">—</span>'}</td>
        <td class="hide-m">${UI.avatar(App.member(l.ownerId),'sm')}</td></tr>`; }).join('')}</tbody></table></div>`;
  }

  function viewContacts(){
    let leads = L().filter(inUnit);
    if(stageF) leads = leads.filter(l=>l.stage===stageF);
    if(sourceF) leads = leads.filter(l=>l.source===sourceF);
    if(q) leads = leads.filter(l=>[l.company,l.contactName,l.industry,l.notes,l.email,l.instagram].join(' ').toLowerCase().includes(q.toLowerCase()));
    leads.sort((a,b)=>a.company.localeCompare(b.company));
    return { html:`<div class="toolbar"><div class="search grow"><input class="inp" placeholder="Buscar empresa, persona, rubro…" value="${esc(q)}" oninput="Growth.setQ(this.value)"></div>
      <select class="inp sm" onchange="Growth.setStageF(this.value)"><option value="">Todas las etapas</option>${STAGES.map(s=>`<option value="${s[0]}" ${stageF===s[0]?'selected':''}>${s[2]} ${s[1]}</option>`).join('')}</select>
      <select class="inp sm" onchange="Growth.setSourceF(this.value)"><option value="">Todas las fuentes</option>${SOURCES.map(s=>`<option ${sourceF===s?'selected':''}>${s}</option>`).join('')}</select>
      <button class="btn g" onclick="Growth.importCsv()">⇡ Importar CSV</button><button class="btn p" onclick="Growth.editLead()">＋ Contacto</button></div>${contactsTable(leads)}` };
  }

  function viewEx(){
    const ex = L().filter(l=>l.stage==='ex').filter(inUnit).sort((a,b)=>(a.winbackDate||'9').localeCompare(b.winbackDate||'9'));
    const lost = L().filter(l=>l.stage==='perdido').filter(inUnit);
    const reasons = {}; [...ex.map(l=>l.churnReason), ...lost.map(l=>l.lostReason)].filter(Boolean).forEach(r=>reasons[r]=(reasons[r]||0)+1);
    return { html:`<div class="grid g3"><div class="span2">
      <div class="card"><div class="card-h"><h3>↩️ Ex clientes</h3><span class="sub">${ex.length}</span><span class="grow"></span><button class="btn sm p" onclick="Growth.editLead(null,{stage:'ex'})">＋ Ex cliente</button></div>
        ${ex.length?`<div class="list">${ex.map(l=>`<div class="li click" onclick="App.go('#/crecimiento/lead/${l.id}')"><div class="grow"><div class="b">${esc(l.company)}</div><div class="xs faint">${l.churnedAt?'Se fue '+UI.fdate(l.churnedAt,{abs:true}):''}${l.churnReason?' · '+esc(l.churnReason):''}</div></div>
          ${l.winbackDate?`<span class="tag ${l.winbackDate<=UI.today()?'t-yellow':''}">Recontactar ${UI.fdate(l.winbackDate)}</span>`:''}<button class="btn xs g" onclick="event.stopPropagation();Growth.setStage('${l.id}','contactado')">Reactivar →</button></div>`).join('')}</div>`
        :'<div class="empty small">Cuando des de baja un cliente en Operaciones, te ofrezco guardarlo acá para recuperarlo después.</div>'}</div>
      <div class="card" style="margin-top:18px"><div class="card-h"><h3>🪦 Oportunidades perdidas</h3><span class="sub">${lost.length}</span></div>
        ${lost.length?`<div class="list">${lost.map(l=>`<div class="li click" onclick="App.go('#/crecimiento/lead/${l.id}')"><div class="grow"><div class="b small">${esc(l.company)}</div><div class="xs faint">${esc(l.lostReason||'Sin motivo registrado')}</div></div><span class="xs faint">${UI.ago(l.stageAt)}</span></div>`).join('')}</div>`:'<div class="empty small">Nada por acá</div>'}</div>
      </div><div class="card"><div class="card-h"><h3>¿Por qué se van / no cierran?</h3></div>
        ${Object.keys(reasons).length?Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(([r,n])=>`<div style="margin-bottom:12px"><div class="row small"><span class="grow">${esc(r)}</span><b>${n}</b></div><div class="bar"><div style="width:${n/Math.max(...Object.values(reasons))*100}%;background:var(--red)"></div></div></div>`).join(''):'<div class="small faint">Registrá los motivos para detectar patrones.</div>'}</div></div>` };
  }

  function viewScore(){
    const crit = icp();
    const ranked = L().filter(inUnit).filter(l=>OPEN.includes(l.stage)).map(l=>({ l, s:score(l) })).sort((a,b)=>(b.s.pct??-1)-(a.s.pct??-1));
    // Qué perfil de empresa nos funciona: tasa de cierre por fuente y rubro
    const closed = L().filter(l=>['ganado','perdido','ex'].includes(l.stage));
    const by = key => { const g = {}; closed.forEach(l=>{ const k = l[key]||'Sin dato'; g[k] = g[k]||{ won:0, n:0, val:0 }; g[k].n++; if(l.stage!=='perdido'){ g[k].won++; g[k].val += +l.value||0; } });
      return Object.entries(g).map(([k,v])=>({ k, ...v, rate:Math.round(v.won/v.n*100) })).sort((a,b)=>b.rate-a.rate||b.n-a.n); };
    const table = (rows, t) => `<div class="card"><div class="card-h"><h3>${t}</h3></div>${rows.length?rows.map(r=>`<div style="margin-bottom:12px"><div class="row small"><span class="grow b">${esc(r.k)}</span><span class="faint">${r.won}/${r.n}</span><b style="min-width:42px;text-align:right">${r.rate}%</b></div><div class="bar"><div style="width:${r.rate}%;background:${r.rate>=50?'var(--green)':r.rate>=25?'var(--yellow)':'var(--red)'}"></div></div></div>`).join(''):'<div class="small faint">Aparece cuando haya oportunidades ganadas o perdidas.</div>'}</div>`;
    return { html:`<div class="grid g3"><div class="span2 col" style="gap:18px">
      <div class="card"><div class="card-h"><h3>Ranking de oportunidades por fit</h3><span class="grow"></span><button class="btn sm p" onclick="Growth.quickScore()">＋ Evaluar empresa nueva</button></div>
        ${ranked.length?`<div class="list">${ranked.map(({l,s})=>`<div class="li click" onclick="Growth.rate('${l.id}')"><span class="score s-${s.grade}">${s.grade||'?'}</span><div class="grow"><div class="b">${esc(l.company)}</div><div class="xs faint">${s.pct!=null?s.pct+' / 100 · ':''}${esc(GRADE_TXT[s.grade])}</div></div><span class="tag">${stage(l.stage)[1]}</span></div>`).join('')}</div>`:'<div class="empty small">Cargá prospectos y calificalos para priorizar.</div>'}</div>
      <div class="grid g2">${table(by('source'),'Tasa de cierre por fuente')}${table(by('industry'),'Tasa de cierre por rubro')}</div>
      </div><div class="card"><div class="card-h"><h3>Criterios del cliente ideal</h3><span class="grow"></span><button class="btn xs g" onclick="Growth.editIcp()">Editar</button></div>
        <p class="small muted" style="margin-bottom:14px">Cada empresa se califica del 1 al 5 en cada criterio. El peso define cuánto importa.</p>
        ${crit.map(c=>`<div class="row small" style="padding:8px 0;border-bottom:1px solid var(--border)"><span class="grow">${esc(c.label)}</span><span class="tag">×${c.w}</span></div>`).join('')}
        <div class="small" style="margin-top:14px">${['A','B','C','D'].map(g=>`<div class="row" style="margin-bottom:6px"><span class="score s-${g}" style="width:26px;height:26px;font-size:12px">${g}</span><span class="muted xs">${GRADE_TXT[g]}</span></div>`).join('')}</div></div></div>` };
  }

  function viewMetrics(){
    const leads = L().filter(inUnit);
    const won = leads.filter(l=>l.stage==='ganado'), lost = leads.filter(l=>l.stage==='perdido');
    const open = leads.filter(l=>OPEN.includes(l.stage));
    const rate = won.length+lost.length ? Math.round(won.length/(won.length+lost.length)*100) : null;
    const qStart = UI.addDays(UI.today(),-90);
    const wonQ = won.filter(l=>(l.stageAt||'').slice(0,10)>=qStart);
    const cycle = won.filter(l=>l.stageAt&&l.createdAt).map(l=>UI.diffDays(l.createdAt.slice(0,10), l.stageAt.slice(0,10)));
    const avgCycle = cycle.length ? Math.round(cycle.reduce((a,b)=>a+b,0)/cycle.length) : null;
    const touches = Store.all('growth','interactions');
    const wk = Game.weekStart();
    const funnel = STAGES.filter(s=>OPEN.includes(s[0])||s[0]==='ganado').map(s=>({ s, n:leads.filter(l=>l.stage===s[0] || (stageIdx(l.stage)>stageIdx(s[0]) && l.stage!=='perdido' && l.stage!=='ex')).length }));
    const max = Math.max(1, ...funnel.map(f=>f.n));
    return { html:`<div class="grid g4" style="margin-bottom:22px">
      <div class="card kpi"><div class="l">Oportunidades abiertas</div><div class="v">${open.length}</div><div class="s">${UI.money(open.reduce((s,l)=>s+(+l.value||0),0))}/mes en juego</div></div>
      <div class="card kpi"><div class="l">Tasa de cierre</div><div class="v" style="color:var(--green)">${rate!=null?rate+'%':'—'}</div><div class="s">${won.length} ganadas · ${lost.length} perdidas</div></div>
      <div class="card kpi"><div class="l">Ganados (90 días)</div><div class="v">${wonQ.length}</div><div class="s">+${UI.money(wonQ.reduce((s,l)=>s+(+l.value||0),0))}/mes</div></div>
      <div class="card kpi"><div class="l">Ciclo de venta</div><div class="v">${avgCycle!=null?avgCycle+' d':'—'}</div><div class="s">promedio de alta a cierre</div></div></div>
      <div class="grid g2"><div class="card"><div class="card-h"><h3>Embudo</h3><span class="sub">cuántos llegaron a cada etapa</span></div>
        ${funnel.map(f=>`<div style="margin-bottom:12px"><div class="row small"><span class="grow">${f.s[2]} ${f.s[1]}</span><b>${f.n}</b></div><div class="bar" style="height:12px"><div style="width:${f.n/max*100}%"></div></div></div>`).join('')}</div>
      <div class="card"><div class="card-h"><h3>Actividad comercial</h3></div>
        <div class="grid g2" style="margin-bottom:16px"><div class="kpi"><div class="l">Contactos esta semana</div><div class="v">${touches.filter(t=>t.at>=wk).length}</div></div><div class="kpi"><div class="l">Últimos 30 días</div><div class="v">${touches.filter(t=>t.at>=UI.addDays(UI.today(),-30)).length}</div></div></div>
        <div class="list">${touches.sort((a,b)=>b.at.localeCompare(a.at)).slice(0,8).map(t=>{ const l = Store.get('growth','leads',t.leadId); return `<div class="li">${UI.avatar(App.member(t.by),'sm')}<div class="grow"><div class="small b ellip">${esc(l?.company||'—')}</div><div class="xs faint ellip">${esc(label(TOUCH,t.type))} · ${esc(t.text||'')}</div></div><span class="xs faint">${UI.ago(t.at)}</span></div>`; }).join('')||'<div class="small faint">Sin actividad</div>'}</div></div></div>` };
  }
  const stageIdx = k => STAGES.findIndex(s=>s[0]===k);
  const label = (opts,v) => (opts.find(o=>o[0]===v)||[,v])[1];

  // ── Detalle ─────────────────────────────────────────────────────────────────
  function leadDetail(id){
    const l = Store.get('growth','leads',id);
    if(!l) return { title:'Contacto', html:'<div class="empty">No encontrado. <a href="#/crecimiento">Volver</a></div>' };
    const s = score(l), st = stage(l.stage);
    const touches = Store.all('growth','interactions').filter(t=>t.leadId===id).sort((a,b)=>b.at.localeCompare(a.at));
    const links = [l.email&&`<a href="mailto:${esc(l.email)}">✉️ ${esc(l.email)}</a>`, l.phone&&`<a href="${UI.waLink('',l.phone)}" target="_blank">💬 ${esc(l.phone)}</a>`,
      l.instagram&&`<a href="https://instagram.com/${esc(l.instagram.replace('@',''))}" target="_blank">📷 ${esc(l.instagram)}</a>`, l.web&&`<a href="${esc(/^https?:/.test(l.web)?l.web:'https://'+l.web)}" target="_blank">🌐 Web</a>`].filter(Boolean);
    const crit = icp();
    const html = `<div class="row" style="margin-bottom:20px"><a href="#/crecimiento" class="btn g sm">← Pipeline</a></div>
      <div class="hero" style="margin-bottom:22px"><div class="grow"><span class="tag">${st[2]} ${st[1]}</span><h2 style="margin-top:8px">${esc(l.company)}</h2>
        <div class="small muted" style="margin-top:6px">${esc([l.contactName, l.role, l.industry, l.city].filter(Boolean).join(' · '))}</div>
        <div class="row wrap small" style="margin-top:10px;gap:14px">${links.join('')}</div><div class="row wrap" style="margin-top:10px">${App.unitTags(l.units)}</div></div>
        <div class="col" style="align-items:stretch"><select class="inp" onchange="Growth.setStage('${id}',this.value)">${STAGES.map(x=>`<option value="${x[0]}" ${x[0]===l.stage?'selected':''}>${x[2]} ${x[1]}</option>`).join('')}</select>
          <button class="btn p" onclick="Growth.logTouch('${id}')">＋ Registrar contacto</button><button class="btn g sm" onclick="Growth.editLead('${id}')">✎ Editar</button></div></div>
      <div class="grid g3"><div class="span2 col" style="gap:18px">
        ${l.nextFollowUp||l.nextAction?`<div class="alert ${l.nextFollowUp&&l.nextFollowUp<UI.today()?'danger':'info'}" style="margin:0"><div class="ai">📞</div><div class="grow"><div class="at">${esc(l.nextAction||'Hacer seguimiento')}</div><div class="ad">${l.nextFollowUp?UI.fdate(l.nextFollowUp,{abs:true}):'Sin fecha'}</div></div></div>`:''}
        <div class="card"><div class="card-h"><h3>Historial de contactos</h3><span class="sub">${touches.length}</span></div>
          ${touches.length?`<div class="tl">${touches.map(t=>`<div class="tl-i"><div class="when">${UI.fdate(t.at.slice(0,10),{abs:true})} · ${esc(label(TOUCH,t.type))} · ${esc(App.member(t.by)?.name||'')}</div><div class="small prewrap">${esc(t.text||'')}</div></div>`).join('')}</div>`:'<div class="empty small">Todavía no registraste contactos.</div>'}</div>
        ${l.notes?`<div class="card"><div class="card-h"><h3>Notas</h3></div><div class="small prewrap muted">${esc(l.notes)}</div></div>`:''}
      </div><div class="col" style="gap:18px">
        <div class="card"><div class="card-h"><h3>Fit con ANM</h3><span class="grow"></span><span class="score s-${s.grade}">${s.grade||'?'}</span></div>
          <div class="small muted" style="margin-bottom:12px">${s.pct!=null?`<b style="color:var(--text)">${s.pct}/100</b> · `:''}${esc(GRADE_TXT[s.grade])}</div>
          ${crit.map(c=>`<div style="margin-bottom:12px"><div class="xs b" style="margin-bottom:5px">${esc(c.label)}</div><div class="rate">${[1,2,3,4,5].map(n=>`<button class="${(l.score||{})[c.id]===n?'on':''}" onclick="Growth.setScore('${id}','${c.id}',${n})">${n}</button>`).join('')}</div></div>`).join('')}</div>
        <div class="card small"><div class="card-h"><h3>Datos</h3></div>
          <div class="list">${[['Valor estimado',l.value?UI.money(l.value)+'/mes':'—'],['Fuente',l.source||'—'],['Responsable',App.member(l.ownerId)?.name||'—'],['Alta',UI.fdate((l.createdAt||'').slice(0,10),{abs:true})],['En esta etapa desde',l.stageAt?UI.ago(l.stageAt):'—'],
            ...(l.lostReason?[['Motivo de pérdida',l.lostReason]]:[]),...(l.churnReason?[['Motivo de baja',l.churnReason]]:[])].map(([k,v])=>`<div class="li"><span class="faint grow">${k}</span><b>${esc(v)}</b></div>`).join('')}</div></div>
      </div></div>`;
    return { title:l.company, crumb:'Crecimiento · Contacto', html };
  }

  // ── Acciones ────────────────────────────────────────────────────────────────
  const Growth = {
    STAGES, alerts, score,
    setQ(v){ q = v; const pos = document.activeElement?.selectionStart; App.render(); const i = $('.search input'); if(i){ i.focus(); try{ i.setSelectionRange(pos,pos); }catch(e){} } },
    setStageF(v){ stageF = v; App.render(); }, setSourceF(v){ sourceF = v; App.render(); },

    editLead(id, preset={}){
      const l = id ? Store.get('growth','leads',id) : { stage:'objetivo', ownerId:App.me().id, ...preset };
      UI.form({ title: id ? 'Editar contacto' : 'Nuevo prospecto', values:l, wide:true, fields:[
        { k:'company', label:'Empresa / marca', req:true, half:true }, { k:'industry', label:'Rubro', half:true, placeholder:'Gastronomía, retail, salud…' },
        { k:'contactName', label:'Persona de contacto', half:true }, { k:'role', label:'Cargo', half:true },
        { k:'email', label:'Email', type:'email', half:true }, { k:'phone', label:'WhatsApp / teléfono', half:true },
        { k:'instagram', label:'Instagram', half:true, placeholder:'@marca' }, { k:'web', label:'Web', half:true },
        { k:'stage', label:'Etapa', type:'select', options:STAGES.map(s=>[s[0],s[2]+' '+s[1]]), half:true }, { k:'source', label:'¿Cómo llegó?', type:'select', options:[['','—'],...SOURCES.map(s=>[s,s])], half:true },
        { k:'value', label:'Valor estimado mensual ($)', type:'number', half:true }, { k:'ownerId', label:'Responsable', type:'select', options:App.memberOpts(), half:true },
        { k:'units', label:'Servicios de interés', type:'multi', options:App.unitOpts() },
        { k:'nextAction', label:'Próxima acción', half:true, placeholder:'Mandar portfolio' }, { k:'nextFollowUp', label:'Fecha de seguimiento', type:'date', half:true },
        ...(l.stage==='ex'||preset.stage==='ex' ? [{ k:'churnReason', label:'¿Por qué se fue?', half:true }, { k:'winbackDate', label:'Volver a contactar el', type:'date', half:true }] : []),
        { k:'notes', label:'Notas', type:'textarea', rows:3 },
      ], danger: id ? { label:'Eliminar', confirm:'¿Eliminar el contacto y su historial?', fn:()=>{ Store.remove('growth','leads',id); App.go('#/crecimiento'); } } : null,
      onSubmit:v=>{
        const stageChanged = id && v.stage!==l.stage;
        const r = Store.upsert('growth','leads',{ ...l, ...v, stage:l.stage, stageAt:l.stageAt||new Date().toISOString() });
        if(!id){ Game.log('lead', `Nuevo contacto: ${v.company}`, { icon:'🎯' }); if(v.stage!=='objetivo') Growth.setStage(r.id, v.stage, true); App.go('#/crecimiento/lead/'+r.id); }
        else if(stageChanged) Growth.setStage(id, v.stage);
        else App.render();
      } });
    },

    setStage(id, st, quiet){
      const l = Store.get('growth','leads',id); if(!l || l.stage===st) return;
      const extra = {};
      if(st==='perdido'){ const r = prompt(`¿Por qué no avanzó ${l.company}? (precio, timing, eligieron a otro, no respondió…)`); if(r===null) return App.render(); extra.lostReason = r; }
      if(st==='ex'){ extra.churnedAt = UI.today(); extra.winbackDate = UI.addDays(UI.today(), 90); }
      Store.upsert('growth','leads',{ id, stage:st, stageAt:new Date().toISOString(), ...extra });
      Store.upsert('growth','interactions',{ leadId:id, at:new Date().toISOString(), by:App.me().id, type:'otro', text:`Etapa: ${stage(l.stage)[1]} → ${stage(st)[1]}` });
      if(st==='ganado'){
        Game.log('lead_won', `¡Ganamos a ${l.company}!`, { icon:'🏆' }); UI.confetti(140);
        App.notify('all', `🏆 ¡Nuevo cliente: ${l.company}!`, '#/crecimiento/lead/'+id);
        const has = Store.all('ops','clients').some(c=>c.name.toLowerCase()===l.company.toLowerCase());
        if(!has && confirm(`¡Bien ahí! 🎉\n\n¿Creo a ${l.company} como cliente en Operaciones para empezar el seguimiento?`)){
          const c = Store.upsert('ops','clients',{ name:l.company, units:l.units?.length?l.units:['otros'], ownerId:l.ownerId, health:'ok', active:true, contactName:l.contactName, contactPhone:l.phone, contactEmail:l.email, notes:l.notes||'' });
          Store.upsert('ops','updates',{ clientId:c.id, at:new Date().toISOString(), by:App.me().id, health:'ok', text:'Cliente nuevo — viene del CRM. ¡Arranca el onboarding!' });
          Store.upsert('ops','clients',{ id:c.id, status:'Cliente nuevo — viene del CRM. ¡Arranca el onboarding!' });
          if(App.me().role==='admin') UI.toast('Recordá cargar su retainer en Finanzas','💡');
        }
      } else if(stageIdx(st)>stageIdx(l.stage) && OPEN.includes(st) && !quiet) Game.log('lead_advance', `${l.company} → ${stage(st)[1]}`, { icon:'➡️' });
      App.render();
    },

    logTouch(id){
      const leads = L().filter(l=>l.stage!=='perdido').sort((a,b)=>a.company.localeCompare(b.company));
      if(!leads.length) return Growth.editLead();
      const l = id ? Store.get('growth','leads',id) : null;
      UI.form({ title:'Registrar contacto', submit:`Guardar (+${Game.XP.interaction} XP)`, values:{ leadId:id||'', type:'whatsapp', nextFollowUp:UI.addDays(UI.today(),7), nextAction:l?.nextAction||'' }, fields:[
        ...(id ? [] : [{ k:'leadId', label:'Con quién', type:'select', options:leads.map(x=>[x.id,x.company]), req:true }]),
        { k:'type', label:'Canal', type:'select', options:TOUCH },
        { k:'text', label:'¿Qué pasó?', type:'textarea', req:true, rows:3, placeholder:'Le mandé el portfolio, quedó en verlo con su socio.' },
        { k:'nextAction', label:'Próxima acción', half:true }, { k:'nextFollowUp', label:'Seguimiento', type:'date', half:true },
      ], onSubmit:v=>{
        const lid = id || v.leadId, lead = Store.get('growth','leads',lid);
        Store.upsert('growth','interactions',{ leadId:lid, at:new Date().toISOString(), by:App.me().id, type:v.type, text:v.text });
        Store.upsert('growth','leads',{ id:lid, nextAction:v.nextAction, nextFollowUp:v.nextFollowUp });
        Game.log('interaction', `Contacto con ${lead.company}`, { icon:'🤝' });
        if(lead.stage==='objetivo' && confirm(`¿Paso a ${lead.company} a “Contactado”?`)) Growth.setStage(lid,'contactado');
        else App.render();
      } });
    },

    setScore(id, crit, n){
      const l = Store.get('growth','leads',id); const had = score(l).grade;
      Store.upsert('growth','leads',{ id, score:{ ...(l.score||{}), [crit]:n } });
      const now = score(Store.get('growth','leads',id));
      if(!had && now.grade) Game.log('score', `${l.company} calificado: ${now.grade}`, { icon:'🧭' });
      App.render();
    },
    rate(id){ App.go('#/crecimiento/lead/'+id); },

    quickScore(){
      UI.form({ title:'Evaluar empresa', submit:'Crear y calificar', fields:[
        { k:'company', label:'Empresa', req:true }, { k:'industry', label:'Rubro' },
        { k:'source', label:'¿Cómo la conocemos?', type:'select', options:[['','—'],...SOURCES.map(s=>[s,s])] },
      ], onSubmit:v=>{ const r = Store.upsert('growth','leads',{ ...v, stage:'objetivo', ownerId:App.me().id, stageAt:new Date().toISOString() }); Game.log('lead', `Nuevo contacto: ${v.company}`, { icon:'🎯' }); App.go('#/crecimiento/lead/'+r.id); } });
    },

    editIcp(){
      const crit = icp();
      UI.form({ title:'Criterios del cliente ideal', submit:'Guardar', fields:[
        { k:'txt', label:'Un criterio por línea — formato: peso | descripción', type:'textarea', rows:10, default:crit.map(c=>`${c.w} | ${c.label}`).join('\n'), hint:'Peso de 1 (poco importante) a 3 (clave). Si borrás un criterio, se pierden sus calificaciones.' },
      ], onSubmit:v=>{
        const next = v.txt.split('\n').map(s=>s.trim()).filter(Boolean).map(line=>{
          const m = line.match(/^(\d)\s*\|\s*(.+)$/); const w = m ? Math.min(3,Math.max(1,+m[1])) : 1; const label = m ? m[2].trim() : line;
          const prev = crit.find(c=>c.label===label); return { id:prev?.id||Store.uid(), label, w };
        });
        Store.setSetting('icp', next); App.render();
      } });
    },

    importCsv(){
      UI.form({ title:'Importar contactos (CSV)', submit:'Importar', fields:[
        { k:'csv', label:'Pegá el CSV (primera fila = encabezados)', type:'textarea', rows:10, req:true, hint:'Columnas reconocidas: empresa, contacto, email, telefono, instagram, web, rubro, fuente, valor, notas. Separador coma o punto y coma.' },
      ], onSubmit:v=>{
        const rows = v.csv.split(/\r?\n/).filter(Boolean); if(rows.length<2) return UI.toast('Faltan filas','⚠️');
        const sep = rows[0].includes(';') ? ';' : ',';
        const heads = rows[0].split(sep).map(h=>h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''));
        const map = { empresa:'company', marca:'company', company:'company', contacto:'contactName', nombre:'contactName', email:'email', mail:'email', telefono:'phone', whatsapp:'phone', instagram:'instagram', web:'web', rubro:'industry', industria:'industry', fuente:'source', valor:'value', notas:'notes' };
        let n = 0; const have = new Set(L().map(l=>l.company.toLowerCase()));
        rows.slice(1).forEach(r=>{ const cells = r.split(sep); const rec = { stage:'objetivo', ownerId:App.me().id, stageAt:new Date().toISOString() };
          heads.forEach((h,i)=>{ if(map[h]) rec[map[h]] = (cells[i]||'').trim(); });
          if(rec.value) rec.value = parseFloat(String(rec.value).replace(/[^\d.]/g,''))||null;
          if(rec.company && !have.has(rec.company.toLowerCase())){ Store.upsert('growth','leads',rec); have.add(rec.company.toLowerCase()); n++; } });
        UI.toast(`${n} contactos importados`,'⇡'); App.render();
      } });
    },

    fromChurn(c){
      const reason = prompt(`¿Por qué se fue ${c.name}? (opcional)`) || '';
      const ex = L().find(l=>l.company.toLowerCase()===c.name.toLowerCase());
      const data = { company:c.name, units:c.units, contactName:c.contactName, phone:c.contactPhone, email:c.contactEmail, stage:'ex', stageAt:new Date().toISOString(), churnedAt:UI.today(), churnReason:reason, winbackDate:UI.addDays(UI.today(),90), ownerId:c.ownerId||App.me().id };
      Store.upsert('growth','leads', ex ? { ...ex, ...data } : data);
      UI.toast(`${c.name} guardado en Ex clientes`,'↩️');
    },
  };
  window.Growth = Growth;
})();
