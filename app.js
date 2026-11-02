(function(){
'use strict';
var SUPA_URL='https://grbbwgdyzkiynneawvmz.supabase.co';
var SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYmJ3Z2R5emtpeW5uZWF3dm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MjkyNDQsImV4cCI6MjEwOTIwNTI0NH0.fo93TDA9TgaNnaV3v2g1t4z92pr_NwexlipRDsgb6OU';
var PROYECTO='https://claude.ai/project/01a19c91-8981-7673-af2e-d3fb45c1ebc4';
var sb=window.supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:true,autoRefreshToken:true}});

var S={clientes:[],tareas:[],citas:[],incidencias:[],diario:[],reuniones:[],objetivos:null,mercado:null,config:null};
var filter='prio',query='';
var DIAS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
var $=function(id){return document.getElementById(id)};
function el(tag,attrs,kids){var n=document.createElement(tag);if(attrs)for(var k in attrs){if(k==='text')n.textContent=attrs[k];else if(k==='style')n.style.cssText=attrs[k];else if(k==='cls')n.className=attrs[k];else n.setAttribute(k,attrs[k]);}(kids||[]).forEach(function(c){if(c)n.appendChild(typeof c==='string'?document.createTextNode(c):c)});return n}
function clear(n){while(n.firstChild)n.removeChild(n.firstChild);return n}
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function parse(s){var p=String(s).slice(0,10).split('-');return new Date(+p[0],+p[1]-1,+p[2])}
function eur(v){if(v==null||v==='')return '–';return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v)}
function eurM(v){return (v/1e6).toLocaleString('es-ES',{maximumFractionDigits:2})+' M€'}
function daysBetween(a,b){return Math.round((b-a)/864e5)}
var today,monday,friday;
function setToday(){var now=new Date();today=new Date(now.getFullYear(),now.getMonth(),now.getDate());monday=new Date(today);monday.setDate(today.getDate()-((today.getDay()+6)%7));friday=new Date(monday);friday.setDate(monday.getDate()+4);$('today').textContent=DIAS[today.getDay()]+' '+today.getDate()+' de '+MESES[today.getMonth()]}
setToday();
function showStatus(msg){var s=$('status');s.textContent=msg||'';s.hidden=!msg}

// ---------- Datos ----------
function mapC(r){return {_id:r.id,alias:r.alias,nombre:r.nombre,oficina:r.oficina,oficinaNombre:r.oficina_nombre,tipo:r.tipo,etapa:r.etapa,unidad:r.unidad,carterizacion:r.carterizacion,clienteNuevo2026:r.cliente_nuevo_2026,prioritario:r.prioritario,grupos:r.grupos||[],nivel:r.nivel,contactoCadaDias:r.contacto_cada_dias,ultimoContacto:r.ultimo_contacto,perfil:r.perfil,cartera:r.cartera||[],patrimonioFuera:r.patrimonio_fuera||[],operaciones:r.operaciones||[],notasExcel:r.notas_excel,compartidoCon:r.compartido_con}}
function mapT(r){return {_id:r.id,texto:r.texto,clienteId:r.cliente_id,cliente:r.cliente,categoria:r.categoria,estado:r.estado,vence:r.vence}}
function mapCi(r){return {_id:r.id,fecha:r.fecha,hora:r.hora,clienteId:r.cliente_id,cliente:r.cliente,tipo:r.tipo,estado:r.estado}}
function mapI(r){return {_id:r.id,clienteId:r.cliente_id,cliente:r.cliente,texto:r.texto,abierta:r.abierta,estado:r.estado}}
async function load(){
  try{
    var res=await Promise.all([
      sb.from('clientes').select('*'),
      sb.from('tareas').select('*').or('estado.eq.abierta,cerrada.gte.'+iso(new Date(Date.now()-7*864e5))),
      sb.from('citas').select('*').gte('fecha',iso(new Date(Date.now()-30*864e5))),
      sb.from('incidencias').select('*'),
      sb.from('diario').select('*').order('fecha',{ascending:false}).limit(5),
      sb.from('reuniones').select('*').order('fecha',{ascending:false}).limit(3),
      sb.from('objetivos').select('data').eq('anio',today.getFullYear()).maybeSingle(),
      sb.from('mercado').select('data').eq('id','hoy').maybeSingle(),
      sb.from('config').select('data').eq('id','app').maybeSingle()
    ]);
    if(res[0].error)throw res[0].error;
    S.clientes=(res[0].data||[]).map(mapC);S.tareas=(res[1].data||[]).map(mapT);S.citas=(res[2].data||[]).map(mapCi);S.incidencias=(res[3].data||[]).map(mapI);
    S.diario=res[4].data||[];S.reuniones=res[5].data||[];S.objetivos=res[6].data?res[6].data.data:null;S.mercado=res[7].data?res[7].data.data:null;S.config=res[8].data?res[8].data.data:null;
    showStatus('');render();
  }catch(e){showStatus('No se pudieron cargar los datos. Revisa la conexión y vuelve a abrir la app.')}
}

function plazo(c){if(c.contactoCadaDias)return c.contactoCadaDias;var p=(S.config&&S.config.plazos)||{A:30,B:60,C:90};return c.nivel?p[c.nivel]:null}
function desatendidos(){return S.clientes.filter(function(c){var pl=plazo(c);return pl&&c.ultimoContacto&&daysBetween(parse(c.ultimoContacto),today)>pl})}
function pendientes(){return S.citas.filter(function(c){return (c.estado==='programada'||c.estado==='realizada')&&(parse(c.fecha)<today||(c.fecha===iso(today)&&c.estado==='realizada'))})}

// ---------- Render ----------
function render(){
  renderRank();
  var week=S.citas.filter(function(c){var d=parse(c.fecha);return d>=monday&&d<=friday&&c.estado!=='cancelada'});
  var hoy=week.filter(function(c){return c.fecha===iso(today)});
  var prio=S.tareas.filter(function(t){return t.estado!=='hecha'&&t.categoria==='prioritaria'});
  var incA=S.incidencias.filter(function(i){return i.estado!=='resuelta'});
  var des=desatendidos();
  var sinDatos=S.clientes.filter(function(c){return c.prioritario&&(!c.nivel||!c.ultimoContacto)}).length;
  var pend=pendientes();
  $('kCitas').textContent=week.length;$('kCitasSub').textContent=hoy.length+' hoy';
  $('kTareas').textContent=prio.length;$('kTareasSub').textContent=S.tareas.filter(function(t){return t.estado!=='hecha'}).length+' tareas abiertas en total';
  $('kInc').textContent=incA.length;$('kIncSub').textContent=incA.length?'La más antigua, '+Math.max.apply(null,incA.map(function(i){return daysBetween(parse(i.abierta),today)}))+' días':'Ninguna abierta';
  $('kDes').textContent=des.length;$('kDesSub').textContent=sinDatos?sinDatos+' prioritarios sin fecha de contacto o nivel':'Todos con datos de contacto';
  var bits=[];if(hoy.length)bits.push(hoy.length+(hoy.length===1?' cita hoy':' citas hoy'));if(prio.length)bits.push(prio.length+' tareas prioritarias');if(pend.length)bits.push(pend.length+' visitas sin contarme');
  $('lead').textContent=bits.length?'Tienes '+bits.join(', ')+'.':'Día despejado: buen momento para llamar a quien hace tiempo que no ves.';
  $('pending').hidden=!pend.length;
  $('pendingList').textContent=pend.map(function(c){return c.cliente+' ('+DIAS[parse(c.fecha).getDay()]+' '+(c.hora||'')+')'}).join(' · ');

  $('weekRange').textContent=monday.getDate()+' – '+friday.getDate()+' '+MESES[friday.getMonth()].slice(0,3);
  var wg=clear($('week'));
  for(var i=0;i<5;i++){var d=new Date(monday);d.setDate(monday.getDate()+i);var isT=iso(d)===iso(today);
    var col=el('div',{cls:'day'},[el('span',{cls:'small',style:'font-weight:'+(isT?800:700)+';color:'+(isT?'var(--accent-ink)':'var(--muted)'),text:DIAS[d.getDay()]+' '+d.getDate()+(isT?' · Hoy':'')})]);
    var evs=S.citas.filter(function(c){return c.fecha===iso(d)&&c.estado!=='cancelada'}).sort(function(a,b){return (a.hora||'').localeCompare(b.hora||'')});
    if(!evs.length)col.appendChild(el('div',{cls:'xs muted',style:'padding:10px 2px',text:'Sin citas'}));
    evs.forEach(function(c){col.appendChild(el('div',{cls:'ev'+(isT?' today':'')},[el('span',{cls:'xs muted',text:(c.hora||'')+(c.tipo?' · '+c.tipo:'')}),el('span',{style:'font-size:14px;font-weight:600',text:c.cliente||''})]))});
    wg.appendChild(col)}

  var CATS=[['prioritaria','Prioritarias','var(--red)','var(--red-soft)'],['fecha','Con fecha límite','var(--amber)','var(--amber-soft)'],['esperar','Pueden esperar','var(--muted)','var(--soft)'],['delegar','Delegar por ticket','var(--blue)','var(--blue-soft)'],['consultar','Consultar','var(--purple)','var(--purple-soft)']];
  var tg=clear($('tasks'));$('tCount').textContent=S.tareas.filter(function(t){return t.estado!=='hecha'}).length+' abiertas';
  CATS.forEach(function(cat){var list=S.tareas.filter(function(t){return t.categoria===cat[0]&&(t.estado!=='hecha'||t._justDone)});
    var col=el('div',{cls:'tcol'},[el('span',{cls:'small',style:'font-weight:700;color:'+cat[2],text:'● '+cat[1]+' ('+list.filter(function(t){return t.estado!=='hecha'}).length+')'})]);
    if(!list.length)col.appendChild(el('div',{cls:'empty',text:'Nada por aquí'}));
    list.sort(function(a,b){return (a.vence||'9').localeCompare(b.vence||'9')}).forEach(function(t){
      var cb=el('input',{type:'checkbox'});cb.checked=t.estado==='hecha';
      var sub=t.vence?el('span',{cls:'xs muted',style:'display:block',text:'Antes del '+parse(t.vence).getDate()+' '+MESES[parse(t.vence).getMonth()].slice(0,3)}):null;
      var lab=el('label',{cls:'task'+(t.estado==='hecha'?' done':''),style:'background:'+cat[3]},[cb,el('span',{},[t.texto,sub])]);
      cb.addEventListener('change',function(){toggleTask(t,cb.checked)});col.appendChild(lab)});
    tg.appendChild(col)});

  renderClients();

  var dy=clear($('diary'));
  if(!S.diario.length)dy.appendChild(el('div',{cls:'empty',text:'Aún no hay entradas. Dicta cómo ha ido el día y aparecerá aquí.'}));
  S.diario.slice(0,3).forEach(function(e,ix,arr){var d=parse(e.fecha);dy.appendChild(el('div',{style:'display:flex;flex-direction:column;gap:4px;'+(ix<arr.length-1?'padding-bottom:12px;border-bottom:1px solid var(--line)':'')},[el('span',{cls:'xs muted',style:'font-weight:600',text:DIAS[d.getDay()]+' '+d.getDate()+' '+MESES[d.getMonth()].slice(0,3)}),el('p',{style:'margin:0;line-height:1.5;white-space:pre-line',text:e.texto})]))});

  var ru=clear($('reus'));
  if(!S.reuniones.length)ru.appendChild(el('div',{cls:'empty',text:'Dicta el resumen de la reunión de los lunes o sube la foto de tus notas.'}));
  S.reuniones.forEach(function(r){var d=parse(r.fecha);var pj=(r.puntos_jefe||[]);ru.appendChild(el('div',{cls:'note',style:'display:flex;flex-direction:column;gap:6px'},[el('span',{cls:'xs muted',style:'font-weight:700',text:DIAS[d.getDay()]+' '+d.getDate()+' '+MESES[d.getMonth()].slice(0,3)+' · '+(r.tipo||'')}),el('span',{text:r.resumen||''}),pj.length?el('span',{cls:'small',text:'Lo que recalca el jefe: '+pj.join(' · ')}):null]))});

  var ob=clear($('obj'));var o=S.objetivos;
  if(!o){ob.appendChild(el('div',{cls:'empty',text:'Sin datos de objetivos.'}))}else{
    $('objUpd').textContent='Actualizado '+parse(o.actualizado).getDate()+' '+MESES[parse(o.actualizado).getMonth()].slice(0,3);
    var yS=new Date(o.anio,0,1),yE=new Date(o.anio,11,31);var frac=Math.min(1,Math.max(0,daysBetween(yS,today)/daysBetween(yS,yE)));
    [['Volumen neto captado',o.volumenRealizado,o.volumenObjetivo,eurM],['Clientes nuevos',o.clientesCaptados,o.clientesObjetivo,function(v){return String(v)}]].forEach(function(r){
      var pct=r[2]?r[1]/r[2]:0,ritmo=r[2]*frac,ok=r[1]>=ritmo;
      ob.appendChild(el('div',{style:'display:flex;flex-direction:column;gap:6px'},[el('div',{cls:'between'},[el('span',{style:'font-weight:700;font-size:14px',text:r[0]}),el('span',{style:'font-weight:800;font-size:14px;color:'+(ok?'var(--accent-ink)':'var(--amber)'),text:Math.round(pct*100)+'%'})]),el('div',{cls:'bar',style:'height:10px'},[el('i',{style:'width:'+Math.min(100,pct*100)+'%;background:'+(ok?'var(--accent)':'var(--amber-bar)')})]),el('span',{cls:'xs muted',text:r[3](r[1])+' de '+r[3](r[2])+' · '+(ok?'por delante del ritmo del año':'por detrás del ritmo ('+r[3](Math.round(ritmo))+' a esta fecha)')})]))});
    if(o.sinCarterizar)ob.appendChild(el('span',{cls:'xs muted',text:o.sinCarterizar+' clientes nuevos aún sin carterizar'}));}

  $('incCount').textContent=incA.length?incA.length+' abiertas':'';
  var ic=clear($('inc'));
  if(!incA.length)ic.appendChild(el('div',{cls:'empty',text:'Ninguna incidencia abierta.'}));
  incA.map(function(i){return [i,daysBetween(parse(i.abierta),today)]}).sort(function(a,b){return b[1]-a[1]}).forEach(function(p){var i=p[0],n=p[1];var bg=n>=10?'var(--red-soft)':n>=5?'var(--amber-soft)':'var(--soft)',fg=n>=10?'var(--red)':n>=5?'var(--amber)':'var(--muted)';
    ic.appendChild(el('div',{style:'display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px;border-radius:10px;background:'+bg},[el('div',{style:'display:flex;flex-direction:column;gap:2px'},[el('span',{style:'font-size:14px;font-weight:700',text:i.cliente||''}),el('span',{cls:'small muted',text:i.texto||''})]),el('span',{style:'font-size:13px;font-weight:800;white-space:nowrap;color:'+fg,text:n+(n===1?' día':' días')})]))});

  var dz=clear($('des'));
  var rows=S.clientes.filter(function(c){return plazo(c)&&c.ultimoContacto}).map(function(c){return [c,daysBetween(parse(c.ultimoContacto),today),plazo(c)]}).filter(function(r){return r[1]>=r[2]*0.8}).sort(function(a,b){return b[1]/b[2]-a[1]/a[2]}).slice(0,6);
  if(!rows.length)dz.appendChild(el('div',{cls:'empty',text:sinDatos?'Aún no sé cuándo hablaste por última vez con tus '+sinDatos+' clientes prioritarios. En cuanto me lo dictes, aparecerán aquí.':'Todos tus clientes están dentro de su plazo.'}));
  rows.forEach(function(r){var c=r[0],over=r[1]>r[2];var b=el('button',{type:'button',style:'all:unset;cursor:pointer;display:flex;flex-direction:column;gap:6px'},[el('div',{cls:'between',style:'font-size:14px'},[el('span',{},[el('strong',{text:c.alias+' '}),c.nivel?el('span',{cls:'tag',style:'background:var(--soft)',text:c.nivel}):null]),el('span',{style:'font-weight:700;color:'+(over?'var(--red)':'var(--amber)'),text:r[1]+' / '+r[2]+' días'})]),el('div',{cls:'bar'},[el('i',{style:'width:'+Math.min(100,r[1]/r[2]*100)+'%;background:'+(over?'var(--red)':'var(--amber-bar)')})])]);
    b.addEventListener('click',function(){openClient(c)});dz.appendChild(b)});

  var pr=clear($('pros'));var ps=S.clientes.filter(function(c){return c.tipo==='prospect'});$('pCount').textContent=ps.length+' en total';
  if(!ps.length)pr.appendChild(el('div',{cls:'empty',text:'Todavía no hay prospects. Díctalos y los vamos situando en el embudo.'}));
  else{var ET=['Primer contacto','Reunión hecha','Propuesta enviada','Traspaso en curso'];var mx=Math.max(1,ET.reduce(function(m,e){return Math.max(m,ps.filter(function(p){return p.etapa===e}).length)},0));
    ET.forEach(function(e,ix){var n=ps.filter(function(p){return p.etapa===e}).length;pr.appendChild(el('div',{style:'display:flex;align-items:center;gap:12px'},[el('span',{style:'width:130px;font-size:14px',text:e}),el('div',{style:'flex:1;height:24px;border-radius:6px;background:var(--soft);overflow:hidden'},[el('i',{style:'display:block;height:100%;width:'+(n/mx*100)+'%;background:var(--accent);opacity:'+(0.35+ix*0.2)})]),el('span',{style:'width:24px;text-align:right;font-weight:700;font-size:14px',text:String(n)})]))})}

  var m=S.mercado;$('ticker').hidden=!(m&&m.items&&m.items.length);
  if(m&&m.items){var tp=clear($('tape'));[0,1].forEach(function(copy){var g=el('div',{style:'display:flex;flex:none'});if(copy)g.setAttribute('aria-hidden','true');
    m.items.forEach(function(it){var cls=it.dir==='up'?'up':it.dir==='down'?'down':'';var a=el(copy?'span':'a',{cls:'ti'},[it.nombre?el('b',{text:it.nombre}):null,it.valor?el('span',{style:'font-weight:700',text:it.valor}):null,it.cambio?el('span',{cls:cls,text:it.cambio}):null]);if(!copy&&it.url){a.href=it.url;a.target='_blank';a.rel='noopener'}g.appendChild(a)});tp.appendChild(g)})}
}

function renderClients(){
  var cl=clear($('clients'));var q=query.trim().toLowerCase();
  var list=S.clientes.filter(function(c){if(filter==='prospect')return c.tipo==='prospect';if(c.tipo==='prospect'&&filter!=='all')return false;if(filter==='prio'&&!c.prioritario)return false;if((filter==='vip'||filter==='traspaso')&&c.grupos.indexOf(filter)<0)return false;return !q||(c.alias+' '+(c.oficinaNombre||'')).toLowerCase().indexOf(q)>=0});
  list.sort(function(a,b){return (b.prioritario-a.prioritario)||a.alias.localeCompare(b.alias)});
  $('cCount').textContent=list.length+' de '+S.clientes.length;
  if(!list.length)cl.appendChild(el('div',{cls:'empty',text:'Ningún cliente coincide.'}));
  var GT={vip:['VIP','var(--accent-ink)','var(--accent-soft)'],traspaso:['Traspaso','var(--amber)','var(--amber-soft)'],revisar:['Revisar','var(--purple)','var(--purple-soft)']};
  list.forEach(function(c){var tags=el('div',{cls:'chips',style:'gap:6px'});c.grupos.forEach(function(g){var t=GT[g];if(t)tags.appendChild(el('span',{cls:'tag',style:'color:'+t[1]+';background:'+t[2],text:t[0]}))});
    if(c.nivel)tags.appendChild(el('span',{cls:'tag',style:'background:var(--soft)',text:'Nivel '+c.nivel}));
    if(c.tipo==='prospect')tags.appendChild(el('span',{cls:'tag',style:'color:var(--blue);background:var(--blue-soft)',text:c.etapa||'Prospect'}));
    var last=c.ultimoContacto?'Último contacto: hace '+daysBetween(parse(c.ultimoContacto),today)+' días':'Sin fecha de último contacto';
    var b=el('button',{type:'button',cls:'ccard'},[el('span',{style:'font-weight:700',text:c.alias}),el('span',{cls:'xs muted',text:(c.oficinaNombre||'Oficina '+c.oficina)+(c.unidad?' · '+c.unidad:'')}),tags,el('span',{cls:'xs muted',text:last})]);
    b.addEventListener('click',function(){openClient(c)});cl.appendChild(b)});
}
document.querySelectorAll('.chip').forEach(function(ch){ch.addEventListener('click',function(){filter=ch.dataset.f;document.querySelectorAll('.chip').forEach(function(x){x.setAttribute('aria-pressed',String(x===ch))});renderClients()})});
$('q').addEventListener('input',function(e){query=e.target.value;renderClients()});

// ---------- Ranking ----------
function scoreClient(c){
  var s=0,why=[],pl=plazo(c);var in7=new Date(today);in7.setDate(today.getDate()+7);
  if(S.citas.some(function(x){return x.clienteId===c._id&&x.estado==='programada'&&parse(x.fecha)>=today&&parse(x.fecha)<=in7}))return null;
  if(pl&&c.ultimoContacto){var d=daysBetween(parse(c.ultimoContacto),today),r=d/pl;if(r>=0.8){s+=Math.min(r,3)*40;why.push({t:d+' / '+pl+' días sin contacto',hot:r>1})}}
  else if(c.prioritario&&!c.ultimoContacto){s+=18;why.push({t:'Sin contacto registrado'})}
  if(c.nivel==='A')s+=20;else if(c.nivel==='B')s+=10;
  var g=c.grupos;if(g.indexOf('traspaso')>=0){s+=25;why.push({t:'Traspaso pendiente',hot:true})}if(g.indexOf('vip')>=0){s+=15;why.push({t:'VIP'})}if(g.indexOf('revisar')>=0){s+=10;why.push({t:'Revisar'})}
  var inc=S.incidencias.filter(function(i){return i.clienteId===c._id&&i.estado!=='resuelta'});if(inc.length){s+=20*inc.length;why.push({t:inc.length+(inc.length>1?' incidencias':' incidencia'),hot:true})}
  s+=10*S.tareas.filter(function(t){return t.clienteId===c._id&&t.estado!=='hecha'&&t.categoria==='prioritaria'}).length;
  var fuera=c.patrimonioFuera.reduce(function(a,x){return a+(+x.importe||0)},0);if(fuera>0){s+=Math.min(fuera/100000,5)*6;why.push({t:eur(fuera)+' fuera'})}
  if(c.tipo==='prospect'){s+=12;why.push({t:'Prospect · '+(c.etapa||'')})}
  return s>0?{c:c,s:s,why:why}:null;
}
function renderRank(){var box=clear($('rank'));var list=S.clientes.map(scoreClient).filter(Boolean).sort(function(a,b){return b.s-a.s}).slice(0,5);
  if(!list.length){box.appendChild(el('div',{cls:'empty',text:'Nadie urgente hoy. Buen día para prospectar.'}));return}
  list.forEach(function(r,ix){var b=el('button',{type:'button',cls:'ritem'},[el('span',{cls:'rnum',text:String(ix+1)}),el('div',{style:'flex:1;min-width:0'},[el('div',{style:'font-weight:700',text:r.c.alias}),el('div',{cls:'why'},r.why.slice(0,4).map(function(w){return el('span',{cls:w.hot?'hot':'',text:w.t})}))])]);b.addEventListener('click',function(){openClient(r.c)});box.appendChild(b)})}

// ---------- Panel lateral ----------
var drawer=$('drawer'),panel=$('dPanel'),lastFocus=null,onClose=null;
function openDrawer(build){lastFocus=document.activeElement;clear(panel);onClose=null;build(panel);drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');var x=panel.querySelector('.x');if(x)x.focus()}
function closeDrawer(){if(onClose)onClose();drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');if(lastFocus)lastFocus.focus()}
drawer.addEventListener('click',function(e){if(e.target.closest('[data-close]'))closeDrawer()});
drawer.addEventListener('keydown',function(e){if(e.key==='Escape')closeDrawer()});
function head(title,sub){var x=el('button',{type:'button',cls:'x','aria-label':'Cerrar','data-close':''});x.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>';return el('div',{style:'display:flex;justify-content:space-between;align-items:flex-start;gap:12px'},[el('div',{style:'display:flex;flex-direction:column;gap:4px'},[el('h2',{id:'dTitle',style:'font-size:22px;font-weight:800',text:title}),sub?el('span',{cls:'small muted',text:sub}):null]),x])}
function sec(t){return el('span',{cls:'xs',style:'font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)',text:t})}
function table(cols,rows){var t=el('table',{},[el('thead',{},[el('tr',{},cols.map(function(c,i){return el('th',{text:c,style:i===cols.length-1?'text-align:right':''})}))])]);var tb=el('tbody');rows.forEach(function(r){tb.appendChild(el('tr',{},r.map(function(v,i){return el('td',{cls:i===r.length-1?'num':'',text:v})})))});t.appendChild(tb);return t}

function openClient(c){openDrawer(function(p){
  p.appendChild(head(c.alias,(c.oficinaNombre?c.oficinaNombre+' · ':'')+'Oficina '+c.oficina));
  var eb=el('button',{type:'button',cls:'btn',style:'justify-content:center',text:'✎ Editar ficha a mano'});eb.addEventListener('click',function(){openEdit(c)});p.appendChild(eb);
  var dl=el('dl',{cls:'kv'});[['Tipo',c.tipo==='prospect'?'Prospect'+(c.etapa?' · '+c.etapa:''):null],['Unidad',c.unidad],['Carterización',c.carterizacion],['Nivel',c.nivel||'Por definir'],['Contactar cada',plazo(c)?plazo(c)+' días':'Por definir'],['Último contacto',c.ultimoContacto?parse(c.ultimoContacto).toLocaleDateString('es-ES'):'Sin dato'],['Cliente nuevo 2026',c.clienteNuevo2026?'Sí':null],['Lo lleva también',c.compartidoCon]].forEach(function(r){if(r[1]){dl.appendChild(el('dt',{text:r[0]}));dl.appendChild(el('dd',{text:String(r[1])}))}});p.appendChild(dl);
  p.appendChild(sec('Cómo es'));p.appendChild(c.perfil?el('div',{cls:'note',style:'white-space:pre-line',text:c.perfil}):editEmpty('Toca para escribir cómo es, qué le preocupa, cómo le gusta que le contactes…',c,'perfil'))
  if(c.notasExcel){p.appendChild(sec('Nota del Excel'));p.appendChild(el('div',{cls:'note',text:c.notasExcel}))}
  var dentro=c.cartera.reduce(function(a,x){return a+(+x.importe||0)},0),fuera=c.patrimonioFuera.reduce(function(a,x){return a+(+x.importe||0)},0);
  if(dentro+fuera>0){var pc=dentro/(dentro+fuera);p.appendChild(sec('Cuota de patrimonio'));p.appendChild(el('div',{style:'display:flex;flex-direction:column;gap:6px'},[el('div',{cls:'bar',style:'height:12px'},[el('i',{style:'width:'+(pc*100)+'%;background:var(--accent)'})]),el('span',{cls:'small muted',text:'Con nosotros '+eur(dentro)+' ('+Math.round(pc*100)+'%) · Fuera '+eur(fuera)})]))}
  p.appendChild(sec('Cartera en CajaSiete'));
  p.appendChild(c.cartera.length?table(['Producto','Importe'],c.cartera.map(function(x){return [x.producto||'',eur(x.importe)]})):editEmpty('Pendiente. Toca para escribirla o díctala.',c,'cartera'));
  p.appendChild(sec('Patrimonio en otras entidades'));
  p.appendChild(c.patrimonioFuera.length?table(['Entidad','Producto','Importe'],c.patrimonioFuera.map(function(x){return [x.entidad||'',x.producto||'',eur(x.importe)]})):editEmpty('Sin datos. Toca para añadir.',c,'fuera'));
  if(c.operaciones.length){p.appendChild(sec('Operaciones 2026'));p.appendChild(table(['Fecha','Entrada','Salida','Neto'],c.operaciones.map(function(o){return [parse(o.fecha).toLocaleDateString('es-ES'),o.productoEntrada?o.productoEntrada+' · '+eur(o.volumenEntrada):'–',o.productoSalida?o.productoSalida+' · '+eur(o.volumenSalida):(o.volumenSalida?eur(o.volumenSalida):'–'),eur(o.neto)]})))}
  var ts=S.tareas.filter(function(t){return t.clienteId===c._id&&t.estado!=='hecha'});
  if(ts.length){p.appendChild(sec('Tareas abiertas'));ts.forEach(function(t){p.appendChild(el('div',{cls:'note',text:t.texto}))})}
  var hist=el('div',{style:'display:flex;flex-direction:column;gap:10px'},[el('div',{cls:'empty',text:'Cargando historial…'})]);p.appendChild(sec('Historial'));p.appendChild(hist);
  sb.from('interacciones').select('*').eq('cliente_id',c._id).order('fecha',{ascending:false}).then(function(r){clear(hist);var it=r.data||[];if(!it.length)hist.appendChild(el('div',{cls:'empty',text:'Aún no hay visitas ni llamadas registradas.'}));
    it.forEach(function(x){hist.appendChild(el('div',{style:'display:flex;flex-direction:column;gap:2px;padding-bottom:10px;border-bottom:1px solid var(--line)'},[el('span',{cls:'xs muted',style:'font-weight:600',text:parse(x.fecha).toLocaleDateString('es-ES')+(x.tipo?' · '+x.tipo:'')}),el('span',{style:'font-size:14px',text:x.resumen||''}),x.proximos_pasos?el('span',{cls:'small muted',text:'Próximos pasos: '+x.proximos_pasos}):null]))})});
  var b=el('button',{type:'button',cls:'btn primary',style:'justify-content:center',text:'Dictar algo sobre '+c.nombre});b.addEventListener('click',function(){openDictation(c.alias+': ')});p.appendChild(b);
})}


function editEmpty(txt,c,focus){var b=el('button',{type:'button',cls:'empty',style:'text-align:left;border:1px dashed var(--line);cursor:pointer;width:100%;font:inherit;color:var(--muted)',text:txt});b.addEventListener('click',function(){openEdit(c,focus)});return b}
function inp(attrs){return el('input',Object.assign({cls:'inp'},attrs))}
function fld(label,control){var id='f'+Math.random().toString(36).slice(2,8);control.id=id;return el('div',{cls:'fld'},[el('label',{for:id,text:label}),control])}
function listEditor(rows,three){
  var box=el('div',{style:'display:flex;flex-direction:column;gap:8px'});
  function add(r){r=r||{};var parts=[];
    if(three)parts.push(inp({type:'text',placeholder:'Entidad','aria-label':'Entidad',value:r.entidad||''}));
    parts.push(inp({type:'text',placeholder:'Producto / fondo','aria-label':'Producto',value:r.producto||''}));
    parts.push(inp({type:'number',inputmode:'decimal',placeholder:'Importe €','aria-label':'Importe en euros',value:r.importe!=null&&r.importe!==''?String(r.importe):''}));
    var d=el('button',{type:'button',cls:'del','aria-label':'Quitar fila',text:'×'});
    var row=el('div',{cls:'lrow'+(three?' three':'')},parts.concat([d]));d.addEventListener('click',function(){row.remove()});box.insertBefore(row,addB);return parts[0]}
  var addB=el('button',{type:'button',cls:'btn',style:'justify-content:center',text:'+ Añadir línea'});addB.addEventListener('click',function(){add().focus()});
  box.appendChild(addB);(rows||[]).forEach(add);
  box.read=function(){return Array.prototype.map.call(box.querySelectorAll('.lrow'),function(r){var v=r.querySelectorAll('input');return three?{entidad:v[0].value.trim(),producto:v[1].value.trim(),importe:v[2].value===''?null:+v[2].value}:{producto:v[0].value.trim(),importe:v[1].value===''?null:+v[1].value}}).filter(function(x){return (x.producto||x.entidad||x.importe!=null)})};
  box.add=add;return box}

function openEdit(c,focus){var nuevo=!c;c=c||{grupos:[],cartera:[],patrimonioFuera:[],tipo:'cliente'};
  openDrawer(function(p){
    p.appendChild(head(nuevo?'Nuevo cliente':'Editar '+c.alias,'Escribe solo lo que quieras cambiar.'));
    var fNom=inp({type:'text',value:c.nombre||'',placeholder:'Nombre de pila (sin apellidos)'});
    var fOf=inp({type:'text',inputmode:'numeric',maxlength:'4',value:c.oficina||'',placeholder:'0280'});
    p.appendChild(el('div',{cls:'grid2'},[fld('Nombre',fNom),fld('Oficina',fOf)]));
    var fTipo=el('select',{cls:'inp'},[el('option',{value:'cliente',text:'Cliente'}),el('option',{value:'prospect',text:'Prospect'})]);fTipo.value=c.tipo||'cliente';
    var ETS=['Primer contacto','Reunión hecha','Propuesta enviada','Traspaso en curso'];
    var fEt=el('select',{cls:'inp'},[el('option',{value:'',text:'—'})].concat(ETS.map(function(e){return el('option',{value:e,text:e})})));fEt.value=c.etapa||'';
    var fNiv=el('select',{cls:'inp'},[el('option',{value:'',text:'Por definir'}),el('option',{value:'A',text:'A'}),el('option',{value:'B',text:'B'}),el('option',{value:'C',text:'C'})]);fNiv.value=c.nivel||'';
    var fCada=inp({type:'number',inputmode:'numeric',min:'1',value:c.contactoCadaDias||'',placeholder:'Según nivel'});
    var fUlt=inp({type:'date',value:c.ultimoContacto||''});
    var etW=fld('Etapa (prospect)',fEt);
    p.appendChild(el('div',{cls:'grid2'},[fld('Tipo',fTipo),etW,fld('Nivel',fNiv),fld('Contactar cada (días)',fCada),fld('Último contacto',fUlt)]));
    function syncEt(){etW.style.display=fTipo.value==='prospect'?'':'none'}fTipo.addEventListener('change',syncEt);syncEt();
    var chk={};var gw=el('div',{cls:'chips'});[['vip','VIP'],['traspaso','Traspaso pendiente'],['revisar','Revisar']].forEach(function(g){var cb=el('input',{type:'checkbox'});cb.checked=c.grupos.indexOf(g[0])>=0;chk[g[0]]=cb;gw.appendChild(el('label',{cls:'chip',style:'display:inline-flex;align-items:center;gap:6px'},[cb,g[1]]))});
    var cbP=el('input',{type:'checkbox'});cbP.checked=!!c.prioritario;gw.appendChild(el('label',{cls:'chip',style:'display:inline-flex;align-items:center;gap:6px'},[cbP,'Prioritario']));
    p.appendChild(el('div',{cls:'fld'},[el('span',{cls:'lb',text:'Marcas'}),gw]));
    var fPer=el('textarea',{cls:'inp',placeholder:'Cómo es, qué le preocupa, cómo le gusta que le contactes…'});fPer.value=c.perfil||'';
    p.appendChild(fld('Cómo es',fPer));
    p.appendChild(sec('Cartera en CajaSiete'));var lc=listEditor(c.cartera,false);p.appendChild(lc);
    p.appendChild(sec('Patrimonio en otras entidades'));var lf=listEditor(c.patrimonioFuera,true);p.appendChild(lf);
    var err=el('p',{cls:'err',hidden:''});p.appendChild(err);
    var save=el('button',{type:'button',cls:'btn primary',text:'Guardar'}),cancel=el('button',{type:'button',cls:'btn',text:'Cancelar'});
    p.appendChild(el('div',{cls:'editbar'},[cancel,save]));
    cancel.addEventListener('click',function(){if(nuevo)closeDrawer();else openClient(c)});
    save.addEventListener('click',async function(){
      var nom=fNom.value.trim().split(/\s+/).slice(0,3).join(' '),of=fOf.value.replace(/\D/g,'').padStart(4,'0').slice(-4);
      if(!nom||!fOf.value.trim()){err.textContent='Pon al menos el nombre y la oficina.';err.hidden=false;return}
      var stamp=iso(today);
      var cart=lc.read().map(function(x){return {producto:x.producto,importe:x.importe||0,fecha:stamp}});
      var fue=lf.read().map(function(x){return {entidad:x.entidad,producto:x.producto,importe:x.importe||0,fecha:stamp}});
      var grupos=Object.keys(chk).filter(function(k){return chk[k].checked});
      var row={nombre:nom,oficina:of,alias:nom+' '+of,tipo:fTipo.value,etapa:fTipo.value==='prospect'?(fEt.value||'Primer contacto'):null,nivel:fNiv.value||null,contacto_cada_dias:fCada.value?+fCada.value:null,ultimo_contacto:fUlt.value||null,grupos:grupos,prioritario:cbP.checked||grupos.length>0,perfil:fPer.value.trim()||null,patrimonio_fuera:fue};
      var same=function(a,b){return JSON.stringify((a||[]).map(function(x){return [x.producto,+x.importe||0]}))===JSON.stringify((b||[]).map(function(x){return [x.producto,+x.importe||0]}))};
      if(nuevo||!same(c.cartera,cart))row.cartera=cart;
      save.disabled=true;save.textContent='Guardando…';
      try{
        if(nuevo){row.id=slug(row.alias);row.origen='Manual '+stamp;
          if(S.clientes.some(function(x){return x._id===row.id})){err.textContent='Ya existe un cliente '+row.alias+'.';err.hidden=false;save.disabled=false;save.textContent='Guardar';return}
          chk2(await sb.from('clientes').insert(row))}
        else{
          if(row.cartera&&c.cartera.length)chk2(await sb.from('interacciones').insert({cliente_id:c._id,cliente:row.alias,fecha:stamp,tipo:'Actualización de cartera',resumen:'Cartera anterior: '+c.cartera.map(function(x){return x.producto+' '+eur(x.importe)}).join(', ')}));
          chk2(await sb.from('clientes').update(row).eq('id',c._id))}
        await load();var nc=S.clientes.find(function(x){return x._id===(nuevo?row.id:c._id)});if(nc)openClient(nc);else closeDrawer();
      }catch(e){err.textContent='No se pudo guardar. Prueba otra vez.';err.hidden=false;save.disabled=false;save.textContent='Guardar'}
    });
    setTimeout(function(){var t=focus==='cartera'?lc:focus==='fuera'?lf:focus==='perfil'?fPer:(nuevo?fNom:null);if(!t)return;if(t.add&&!t.querySelector('.lrow'))t.add();var f=t.querySelector?t.querySelector('input')||t:t;if(t===fPer)f=fPer;f.scrollIntoView({block:'center'});f.focus()},60);
  });
}
function chk2(r){if(r.error)throw r.error;return r}
$('btnNuevo').addEventListener('click',function(){openEdit(null)});

// Secciones desplegables: recuerda cuáles dejas abiertas
document.querySelectorAll('details.sec').forEach(function(d){var k='sec:'+d.dataset.k;try{var v=localStorage.getItem(k);if(v==='1')d.open=true;else if(v==='0')d.open=false}catch(e){}
  d.addEventListener('toggle',function(){try{localStorage.setItem(k,d.open?'1':'0')}catch(e){}})});

$('btnMarket').addEventListener('click',function(){openDrawer(function(p){var m=S.mercado;
  p.appendChild(head('Mercado hoy',m&&m.fecha?'Actualizado '+parse(m.fecha).toLocaleDateString('es-ES')+(m.hora?' a las '+m.hora:''):null));
  if(!m){p.appendChild(el('div',{cls:'empty',text:'El resumen se prepara cada mañana a las 7:45.'}))}else{
    if(m.resumen)p.appendChild(el('div',{cls:'note',style:'line-height:1.55',text:m.resumen}));
    p.appendChild(sec('Noticias clave'));
    (m.noticias||[]).forEach(function(n){p.appendChild(el('article',{style:'display:flex;flex-direction:column;gap:8px;padding-bottom:16px;border-bottom:1px solid var(--line)'},[el('a',{href:n.url||'#',target:'_blank',rel:'noopener',style:'font-size:16px;font-weight:700;line-height:1.35;color:var(--ink);text-decoration:none',text:n.titular}),el('span',{cls:'xs muted',text:n.fuente||''}),n.afecta?el('div',{style:'display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:10px;background:var(--accent-soft)'},[el('span',{cls:'xs',style:'font-weight:800;color:var(--accent-ink)',text:'A quién afecta'}),el('span',{style:'font-size:14px',text:n.afecta})]):null]))})}
  var rf=el('button',{type:'button',cls:'btn',style:'justify-content:center',text:'Actualizar ahora'});
  rf.addEventListener('click',async function(){
    rf.disabled=true;rf.textContent='Actualizando… (1-2 minutos, puedes cerrar esto)';
    var antes=await sb.from('mercado').select('updated_at').eq('id','hoy').maybeSingle();var t0=antes.data?antes.data.updated_at:null;
    var r=await sb.functions.invoke('avisos?modo=mercado',{body:{}});
    if(r.error||!(r.data&&r.data.ok)){rf.textContent='No se pudo actualizar';rf.disabled=false;return}
    var tries=0;var iv=setInterval(async function(){tries++;var n=await sb.from('mercado').select('updated_at').eq('id','hoy').maybeSingle();
      if(n.data&&n.data.updated_at!==t0){clearInterval(iv);await load();if(drawer.classList.contains('open')&&$('dTitle')&&$('dTitle').textContent==='Mercado hoy'){closeDrawer();$('btnMarket').click()}}
      else if(tries>=24){clearInterval(iv);rf.textContent='Está tardando más de lo normal. Vuelve a mirar en un rato.'}},5000);
  });
  p.appendChild(rf);
  p.appendChild(el('a',{cls:'btn',href:'https://es.investing.com/markets/',target:'_blank',rel:'noopener',style:'justify-content:center',text:'Ver mercados en directo en Investing →'}));
})});

async function toggleTask(t,done){t.estado=done?'hecha':'abierta';t._justDone=done;render();
  var r=await sb.from('tareas').update({estado:t.estado,cerrada:done?iso(today):null}).eq('id',t._id);
  if(r.error){t.estado=done?'abierta':'hecha';render();showStatus('No se pudo guardar el cambio de la tarea.')}}

// ---------- Dictado ----------
var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function openDictation(prefill){
  openDrawer(function(p){
    p.appendChild(head('Dictar nota','Una visita, una llamada, una cita, una tarea, la reunión de equipo o cómo ha ido el día.'));
    var ta=el('textarea',{cls:'dict',id:'dictText','aria-label':'Nota',placeholder:'Ej.: Hoy he visto a Jose Gregorio 0280. Es nivel A, quiere revisar el plan de pensiones. Llamarle en dos semanas.'});ta.value=prefill||'';
    var hint=el('span',{cls:'small muted'});
    var rec=null,base='';
    if(SR){
      var micB=el('button',{type:'button',cls:'mic','aria-label':'Empezar a dictar'});micB.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><path d="M12 18v4"/></svg>';
      hint.textContent='Pulsa el micro y habla. Vuelve a pulsar para parar.';
      p.appendChild(el('div',{cls:'row',style:'flex-wrap:nowrap;align-items:center'},[micB,hint]));
      var stop=function(){if(rec){try{rec.stop()}catch(e){}}};
      onClose=stop;
      micB.addEventListener('click',function(){
        if(rec){stop();return}
        rec=new SR();rec.lang='es-ES';rec.continuous=true;rec.interimResults=true;base=ta.value?ta.value.replace(/\s*$/,' '):'';
        rec.onresult=function(e){var fin='',tmp='';for(var i=0;i<e.results.length;i++){if(e.results[i].isFinal)fin+=e.results[i][0].transcript;else tmp+=e.results[i][0].transcript}ta.value=base+fin+tmp};
        rec.onerror=function(e){if(e.error==='not-allowed'||e.error==='service-not-allowed')hint.textContent='Permite el micrófono para esta app en los ajustes del navegador.';else if(e.error==='no-speech')hint.textContent='No te he oído. Pulsa y prueba otra vez.'};
        rec.onend=function(){rec=null;micB.classList.remove('rec');micB.setAttribute('aria-label','Empezar a dictar');if(hint.textContent.indexOf('escucho')>=0)hint.textContent='Listo. Revisa el texto y pulsa Procesar.'};
        var got=false,r0=rec;var prevOn=rec.onresult;rec.onresult=function(e){got=true;prevOn(e)};
        setTimeout(function(){if(!got&&rec===r0)hint.textContent='No me llega audio. Si sigue así, usa el micrófono del teclado sobre el cuadro de texto.'},7000);
        try{rec.start();micB.classList.add('rec');micB.setAttribute('aria-label','Parar');hint.textContent='Te escucho… pulsa otra vez para parar.'}catch(e){rec=null;hint.textContent='No he podido abrir el micrófono. Usa el micrófono del teclado.'}
      });
    }else{
      var kb='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-5px"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><path d="M12 18v4"/></svg>';
      var tip=el('div',{cls:'note',style:'display:flex;flex-direction:column;gap:4px;background:var(--accent-soft)'});
      tip.innerHTML='<span style="font-weight:700;color:var(--accent-ink)">Para dictar</span><span class="small">Toca el cuadro de abajo y pulsa el micrófono del teclado '+kb+' (abajo, junto a la barra espaciadora). Habla y, al terminar, pulsa Procesar.</span>';
      p.appendChild(tip);
    }
    p.appendChild(ta);
    var file=null;var fi=el('input',{type:'file',accept:'image/*',id:'dictImg',style:'font-size:14px'});fi.addEventListener('change',function(){file=fi.files&&fi.files[0]||null});
    p.appendChild(el('div',{style:'display:flex;flex-direction:column;gap:6px'},[el('label',{for:'dictImg',cls:'small muted',text:'Foto de notas en papel (opcional)'}),fi]));
    var go=el('button',{type:'button',cls:'btn primary',style:'justify-content:center',text:'Procesar'});var out=el('div',{style:'display:flex;flex-direction:column;gap:10px'});
    p.appendChild(go);p.appendChild(out);
    go.addEventListener('click',function(){if(rec)try{rec.stop()}catch(e){};var txt=ta.value.trim();if(!txt&&!file){ta.focus();return}processNote(txt,file,go,out)});
    setTimeout(function(){if(!SR){ta.focus();var n=ta.value.length;try{ta.setSelectionRange(n,n)}catch(e){}}},350);
  });
}
$('btnDictar').addEventListener('click',function(){openDictation('')});
$('fab').addEventListener('click',function(){openDictation('')});
$('btnContar').addEventListener('click',function(){var pend=pendientes();openDictation(pend.length?pend[0].cliente+': ':'')});

function toB64(file){return new Promise(function(res,rej){var img=new Image();var u=URL.createObjectURL(file);img.onload=function(){var sc=Math.min(1,1600/Math.max(img.width,img.height));var cv=document.createElement('canvas');cv.width=Math.round(img.width*sc);cv.height=Math.round(img.height*sc);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);URL.revokeObjectURL(u);res(cv.toDataURL('image/jpeg',0.85).split(',')[1])};img.onerror=rej;img.src=u})}

async function processNote(txt,file,go,out){
  clear(out);out.appendChild(el('div',{cls:'note',text:'Pensando… (unos segundos)'}));go.disabled=true;go.textContent='Procesando…';
  try{
    var body={texto:txt,hoy:iso(today)};if(file){body.imagen=await toB64(file);body.imagenTipo='image/jpeg'}
    var r=await sb.functions.invoke('procesar-nota',{body:body});
    clear(out);
    if(r.error){var msg='Algo ha fallado. Prueba otra vez.';try{var j=await r.error.context.json();if(j.error==='falta_clave')msg='Falta configurar la clave de la API de Claude en Supabase.';else if(j.error==='formato')msg='No he entendido bien la respuesta. Prueba a reformular la nota.';else if(j.error==='claude')msg='Claude no ha respondido (código '+j.estado+'). Revisa el saldo de la API o prueba en un momento.'}catch(e){}out.appendChild(el('div',{cls:'empty',text:msg}));return}
    showProposal(r.data,out);
  }catch(e){clear(out);out.appendChild(el('div',{cls:'empty',text:'Algo ha fallado. Prueba otra vez.'}))}
  finally{go.disabled=false;go.textContent='Procesar'}
}

function cName(id){if(!id)return '';id=String(id);if(id.indexOf('nuevo:')===0)return id.slice(6)+' (nuevo)';var c=S.clientes.find(function(x){return x._id===id});return c?c.alias:id}
function fd(d){return d?parse(d).toLocaleDateString('es-ES',{day:'numeric',month:'short'}):''}
function describe(a){
  switch(a.tipo){
    case 'interaccion':return ['Interacción','var(--accent-ink)',cName(a.clienteId)+' · '+(a.canal||'')+' · '+fd(a.fecha)+(a.resumen?' — '+a.resumen:'')+(a.proximosPasos?' Próximos pasos: '+a.proximosPasos:'')];
    case 'actualizarCliente':var b=[];if(a.nivel)b.push('nivel '+a.nivel);if(a.ultimoContacto)b.push('último contacto '+fd(a.ultimoContacto));if(a.contactoCadaDias)b.push('contactar cada '+a.contactoCadaDias+' días');if(a.etapa)b.push('etapa '+a.etapa);if(a.notaPerfil)b.push('perfil: '+a.notaPerfil);if(a.carteraNueva)b.push('cartera: '+a.carteraNueva.map(function(x){return x.producto+' '+eur(x.importe)}).join(', '));if(a.fueraNueva)b.push('fuera: '+a.fueraNueva.map(function(x){return x.entidad+' '+(x.producto||'')+' '+eur(x.importe)}).join(', '));return b.length?['Ficha','var(--blue)',cName(a.clienteId)+' · '+b.join(' · ')]:null;
    case 'nuevoCliente':return ['Nuevo '+(a.esProspect?'prospect':'cliente'),'var(--blue)',a.nombre+' '+a.oficina+(a.notaPerfil?' — '+a.notaPerfil:'')];
    case 'tarea':return [a.indirecta?'Tarea · ¿va por ti?':'Tarea','var(--red)',a.texto+(a.vence?' (antes del '+fd(a.vence)+')':'')+' · '+({prioritaria:'Prioritaria',fecha:'Con fecha',esperar:'Puede esperar',delegar:'Delegar',consultar:'Consultar'}[a.categoria]||'')];
    case 'cita':return ['Cita','var(--accent-ink)',(cName(a.clienteId)||a.titulo||'')+' · '+fd(a.fecha)+(a.hora?' '+a.hora:'')+(a.canal?' · '+a.canal:'')];
    case 'incidencia':return ['Incidencia','var(--amber)',cName(a.clienteId)+' — '+a.texto];
    case 'completarTarea':var t=S.tareas.find(function(x){return x._id===a.tareaId});return t?['Tarea hecha','var(--muted)',t.texto]:null;
    case 'resolverIncidencia':var i=S.incidencias.find(function(x){return x._id===a.incidenciaId});return i?['Incidencia resuelta','var(--muted)',i.cliente+' — '+i.texto]:null;
    case 'diario':return ['Diario','var(--purple)',a.texto];
    case 'reunion':return ['Reunión '+(a.clase||''),'var(--purple)',fd(a.fecha)+' — '+(a.resumen||'')+((a.puntosJefe||[]).length?' Jefe: '+a.puntosJefe.join(' · '):'')];
  }return null}

function showProposal(res,out){
  var acts=(res&&Array.isArray(res.acciones)?res.acciones:[]).filter(function(a){return a&&describe(a)});
  if(res&&res.resumen)out.appendChild(el('div',{cls:'note',text:res.resumen}));
  (res&&res.dudas||[]).filter(Boolean).forEach(function(d){out.appendChild(el('div',{cls:'note',style:'background:var(--amber-soft)',text:'Duda: '+d}))});
  if(!acts.length){out.appendChild(el('div',{cls:'empty',text:'No he encontrado nada que guardar. Añade más detalle y vuelve a procesar.'}));return}
  out.appendChild(sec('Esto es lo que voy a guardar'));
  var boxes=[];
  acts.forEach(function(a){var d=describe(a);var cb=el('input',{type:'checkbox'});cb.checked=!(a.tipo==='tarea'&&a.indirecta);boxes.push([cb,a]);out.appendChild(el('label',{cls:'act'},[cb,el('div',{style:'display:flex;flex-direction:column;gap:2px'},[el('span',{cls:'k',style:'color:'+d[1],text:d[0]}),el('span',{style:'font-size:14px',text:d[2]})])]))});
  var save=el('button',{type:'button',cls:'btn primary',style:'justify-content:center',text:'Guardar'});out.appendChild(save);
  save.addEventListener('click',async function(){var chosen=boxes.filter(function(b){return b[0].checked}).map(function(b){return b[1]});if(!chosen.length)return;save.disabled=true;save.textContent='Guardando…';
    try{var n=await apply(chosen);clear(out);out.appendChild(el('div',{cls:'note',style:'background:var(--accent-soft)',text:'Guardado: '+n+(n===1?' cambio.':' cambios.')}));var t=$('dictText');if(t)t.value='';await load()}
    catch(e){save.disabled=false;save.textContent='Guardar';out.appendChild(el('div',{cls:'empty',text:'No se pudo guardar todo. Revisa y prueba otra vez.'}))}});
}

function slug(s){return String(s).normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function chk(r){if(r.error)throw r.error;return r}
async function apply(acts){
  var n=0,newIds={},stamp=iso(today),hoyTxt=today.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'});
  function rid(id){if(!id)return null;id=String(id);if(id.indexOf('nuevo:')===0){var k=id.slice(6).trim();return newIds[k]||slug(k)}return S.clientes.some(function(c){return c._id===id})?id:null}
  function cl(id){return S.clientes.find(function(x){return x._id===id})}
  for(const a of acts.filter(function(x){return x.tipo==='nuevoCliente'})){
    var of=String(a.oficina||'0000').replace(/\D/g,'').padStart(4,'0').slice(-4),nm=String(a.nombre||'').trim();if(!nm)continue;
    var alias=nm+' '+of,id=slug(alias);newIds[alias]=id;
    chk(await sb.from('clientes').upsert({id:id,alias:alias,nombre:nm,oficina:of,tipo:a.esProspect?'prospect':'cliente',etapa:a.esProspect?(a.etapa||'Primer contacto'):null,prioritario:!!a.esProspect,perfil:a.notaPerfil?'['+hoyTxt+'] '+a.notaPerfil:null,origen:'Dictado '+stamp},{onConflict:'id',ignoreDuplicates:true}));n++}
  var last={};
  for(const a of acts){var cid=rid(a.clienteId),c=cid?cl(cid):null,cn=c?c.alias:(a.clienteId?cName(a.clienteId):null);
    if(a.tipo==='interaccion'&&cid){chk(await sb.from('interacciones').insert({cliente_id:cid,cliente:cn,fecha:a.fecha||stamp,tipo:a.canal||'Visita',resumen:a.resumen||'',proximos_pasos:a.proximosPasos||null}));n++;
      if(a.canal!=='Propuesta'){var f=a.fecha||stamp;if(!last[cid]||f>last[cid])last[cid]=f}
      var cita=S.citas.find(function(x){return x.clienteId===cid&&(x.estado==='programada'||x.estado==='realizada')&&parse(x.fecha)<=today});if(cita)chk(await sb.from('citas').update({estado:'registrada'}).eq('id',cita._id))}
    else if(a.tipo==='actualizarCliente'&&cid){var u={};
      if(a.nivel&&/^[ABC]$/.test(a.nivel))u.nivel=a.nivel;if(a.contactoCadaDias)u.contacto_cada_dias=+a.contactoCadaDias;if(a.etapa)u.etapa=a.etapa;
      if(a.ultimoContacto&&(!last[cid]||a.ultimoContacto>last[cid]))last[cid]=a.ultimoContacto;
      if(a.notaPerfil){u.perfil=(c&&c.perfil?c.perfil+'\n':'')+'['+hoyTxt+'] '+a.notaPerfil}
      if(Array.isArray(a.carteraNueva)){u.cartera=a.carteraNueva.map(function(x){return {producto:String(x.producto||''),importe:+x.importe||0,fecha:stamp}});if(c&&c.cartera.length)chk(await sb.from('interacciones').insert({cliente_id:cid,cliente:cn,fecha:stamp,tipo:'Actualización de cartera',resumen:'Cartera anterior: '+c.cartera.map(function(x){return x.producto+' '+eur(x.importe)}).join(', ')}))}
      if(Array.isArray(a.fueraNueva))u.patrimonio_fuera=a.fueraNueva.map(function(x){return {entidad:String(x.entidad||''),producto:String(x.producto||''),importe:+x.importe||0,fecha:stamp}});
      if(Object.keys(u).length){chk(await sb.from('clientes').update(u).eq('id',cid));n++}}
    else if(a.tipo==='tarea'&&a.texto){chk(await sb.from('tareas').insert({texto:a.texto,cliente_id:cid,cliente:cn,categoria:['prioritaria','fecha','esperar','delegar','consultar'].indexOf(a.categoria)>=0?a.categoria:'esperar',vence:a.vence||null,origen:'Dictado'}));n++}
    else if(a.tipo==='cita'&&a.fecha){chk(await sb.from('citas').insert({fecha:a.fecha,hora:a.hora||'',cliente_id:cid,cliente:cn||a.titulo||'',tipo:a.canal||'Visita'}));n++}
    else if(a.tipo==='incidencia'&&a.texto){chk(await sb.from('incidencias').insert({cliente_id:cid,cliente:cn,texto:a.texto}));n++}
    else if(a.tipo==='completarTarea'&&a.tareaId){chk(await sb.from('tareas').update({estado:'hecha',cerrada:stamp}).eq('id',a.tareaId));n++}
    else if(a.tipo==='resolverIncidencia'&&a.incidenciaId){chk(await sb.from('incidencias').update({estado:'resuelta',resuelta:stamp}).eq('id',a.incidenciaId));n++}
    else if(a.tipo==='diario'&&a.texto){var ex=await sb.from('diario').select('texto').eq('fecha',stamp).maybeSingle();chk(await sb.from('diario').upsert({fecha:stamp,texto:(ex.data&&ex.data.texto?ex.data.texto+'\n\n':'')+a.texto}));n++}
    else if(a.tipo==='reunion'){var rf=a.fecha||stamp;chk(await sb.from('reuniones').upsert({id:rf+'-'+(a.clase||'semanal'),fecha:rf,tipo:a.clase==='mensual'?'Mensual':'Semanal',resumen:a.resumen||'',puntos_jefe:a.puntosJefe||[],temas:a.temas||[]}));n++}
  }
  for(const k in last){var cc=cl(k);if(!cc||!cc.ultimoContacto||last[k]>cc.ultimoContacto)chk(await sb.from('clientes').update({ultimo_contacto:last[k]}).eq('id',k))}
  return n;
}

// ---------- Notificaciones ----------
function b64ToU8(s){var p='='.repeat((4-s.length%4)%4);var b=(s+p).replace(/-/g,'+').replace(/_/g,'/');var r=atob(b);var a=new Uint8Array(r.length);for(var i=0;i<r.length;i++)a[i]=r.charCodeAt(i);return a}
async function setupPushButton(){
  var btn=$('btnPush');
  if(!('serviceWorker' in navigator)||!('PushManager' in window)){btn.hidden=true;return}
  var reg=await navigator.serviceWorker.ready;var sub=await reg.pushManager.getSubscription();
  btn.hidden=!!sub&&Notification.permission==='granted';
  btn.onclick=async function(){
    try{
      var perm=await Notification.requestPermission();if(perm!=='granted'){showStatus('Sin permiso para notificaciones. Actívalo en los ajustes del navegador.');return}
      var k=await sb.functions.invoke('avisos?modo=clave',{body:{}});if(k.error)throw k.error;
      var s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToU8(k.data.clave)});
      var j=s.toJSON();chk(await sb.from('push_subs').upsert({endpoint:j.endpoint,sub:j}));
      await sb.functions.invoke('avisos?modo=prueba',{body:{}});
      btn.hidden=true;showStatus('Avisos activados. Te debería llegar una notificación de prueba.');
    }catch(e){showStatus('No se pudieron activar los avisos. En iPhone, primero añade la app a la pantalla de inicio y ábrela desde ahí.')}
  };
}

// ---------- Sesión ----------
async function start(){
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(function(){});
  var s=(await sb.auth.getSession()).data.session;
  if(!s){$('login').hidden=false;$('app').hidden=true;return}
  $('login').hidden=true;$('app').hidden=false;
  await load();
  setupPushButton().catch(function(){});
  var dp=new URLSearchParams(location.search).get('dictar');if(dp!==null){history.replaceState(null,'',location.pathname);openDictation(dp)}
}
$('btnLogin').addEventListener('click',async function(){var e=$('email').value.trim(),p=$('pass').value;var err=$('loginErr');err.hidden=true;
  var r=await sb.auth.signInWithPassword({email:e,password:p});if(r.error){err.textContent=/confirm/i.test(r.error.message)?'Confirma primero tu email con el enlace que te hemos enviado.':'Email o contraseña incorrectos.';err.hidden=false;return}start()});
$('btnSignup').addEventListener('click',async function(){var e=$('email').value.trim(),p=$('pass').value;var err=$('loginErr');err.hidden=true;
  if(p.length<8){err.textContent='La contraseña debe tener al menos 8 caracteres.';err.hidden=false;return}
  var r=await sb.auth.signUp({email:e,password:p,options:{emailRedirectTo:location.origin+location.pathname}});
  if(r.error){err.textContent='No se pudo crear la cuenta: '+r.error.message;err.hidden=false;return}
  if(r.data.session){start()}else{$('loginHint').textContent='Te he enviado un email de confirmación. Púlsalo y vuelve aquí para entrar.'}});
$('btnLogout').addEventListener('click',async function(){await sb.auth.signOut();location.reload()});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&!$('app').hidden){setToday();load()}});
start();
})();
