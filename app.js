const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const ORDEN = [1,2,3,4,5,6,0];   // la semana empieza en lunes
const KEY = 'comidas-v1';
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 9);
const SUGERENCIAS = ['Arroz blanco hervido','Pan blanco','Pastas (sin nada más)','Papas hervidas','Pollo','Zanahorias hervidas','Algunas verduras','Agua'];

const defaults = () => ({
  comidas: [],     // vacía: cada persona agrega las suyas
  catalogo: [],
  hechos: {},      // {'2026-10-24': {idComida:true}}
  avisados: {},    // {'2026-10-24|idComida': true}
  agua: {},        // {'2026-10-24': 3}  vasos del día
  anticipacion: 0,
  alarmaCal: true, // alarma propia de Google Calendar en los eventos
  visto: false,    // ya vio la bienvenida
  nombre: '',
  tema: 'auto'
});

let S;
try { S = {...defaults(), ...JSON.parse(localStorage.getItem(KEY))}; } catch { S = defaults(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

const pad = n => String(n).padStart(2,'0');
const hoyStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const minutos = h => { const [a,b] = h.split(':').map(Number); return a*60+b; };
const ahoraMin = () => { const d = new Date(); return d.getHours()*60 + d.getMinutes(); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt12 = h => { const [a,b] = h.split(':').map(Number); return `${a%12||12}:${pad(b)} ${a<12?'a.m.':'p.m.'}`; };

const aplicarTema = () => { if (S.tema === 'claro' || S.tema === 'oscuro') document.documentElement.dataset.theme = S.tema; else delete document.documentElement.dataset.theme; };
aplicarTema();

function toast(t){ const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2400); }

/* ---------- Aspecto de cada comida (color y emoji) ---------- */
function tema(c){
  const n = c.nombre.toLowerCase(), h = minutos(c.hora);
  if (/desayun/.test(n)) return {k:'des', e:'🥞'};
  if (/colaci|merienda|snack|bocadillo/.test(n)) return {k:'col', e:'🍎'};
  if (/cena|cenar/.test(n)) return {k:'cen', e:'🌙'};
  if (/comida|almuerzo/.test(n)) return {k:'com', e:'🍲'};
  if (h < 600) return {k:'des', e:'🥞'};
  if (h < 780 || (h >= 900 && h < 1080)) return {k:'col', e:'🍎'};
  if (h < 900) return {k:'com', e:'🍲'};
  return {k:'cen', e:'🌙'};
}
const textoAlimentos = c => c.alimentos.length ? c.alimentos.join(', ') : 'Sin alimentos asignados';

/* ---------- Hoy ---------- */
function comidasDelDia(dia){ return S.comidas.filter(c => c.dias.includes(dia)).sort((a,b) => minutos(a.hora)-minutos(b.hora)); }

function cuando(c, ahora){
  const d = minutos(c.hora) - ahora;
  if (d > 60) return `en ${Math.floor(d/60)} h${d % 60 ? ' ' + d % 60 + ' min' : ''}`;
  if (d > 0) return `en ${d} min`;
  if (d === 0) return '¡Ahora!';
  return `hace ${-d} min`;
}

const META_AGUA = 8;
function renderAgua(){
  const n = S.agua[hoyStr()] || 0;
  $('#aguaTxt').textContent = `${n} de ${META_AGUA} vasos. Toca un vaso para marcarlo.`;
  $('#vasos').innerHTML = Array.from({length:META_AGUA}, (_,i) => `<button data-vaso="${i+1}" class="${i < n ? 'on' : ''}" aria-label="Vaso ${i+1}">💧</button>`).join('');
}
function renderBarras(){
  const hoy = new Date();
  $('#barras').innerHTML = Array.from({length:7}, (_,k) => {
    const d = new Date(hoy); d.setDate(hoy.getDate() - (6 - k));
    const lista = comidasDelDia(d.getDay()), hechos = S.hechos[hoyStr(d)] || {};
    const f = lista.length ? lista.filter(c => hechos[c.id]).length / lista.length : 0;
    return `<div class="${k === 6 ? 'hoy' : ''}"><i class="${f ? '' : 'vacia'}" style="height:${Math.max(6, f*100)}%"></i><span>${DIAS[d.getDay()]}</span></div>`;
  }).join('');
}

function renderHoy(){
  const d = new Date(), h = d.getHours();
  const quien = S.nombre ? ', ' + esc(S.nombre) : '';
  $('#saludo').innerHTML = (h < 12 ? '¡Buenos días' : h < 19 ? '¡Buenas tardes' : '¡Buenas noches') + quien + '! ' + (h < 12 ? '☀️' : h < 19 ? '🌤️' : '🌙');
  $('#fecha').textContent = d.toLocaleDateString('es-MX', {weekday:'long', day:'numeric', month:'long'});

  const lista = comidasDelDia(d.getDay());
  const hechos = S.hechos[hoyStr()] || {};
  const nHechos = lista.filter(c => hechos[c.id]).length;
  const ahora = ahoraMin();
  $('#anilloTxt').textContent = `${nHechos}/${lista.length}`;
  $('#anillo').style.strokeDashoffset = 263.9 * (1 - (lista.length ? nHechos/lista.length : 0));
  $('#resumen').textContent = !lista.length ? 'Hoy no hay comidas programadas.'
    : nHechos === lista.length ? '¡Terminaste todas!' : `Llevas ${nHechos} de ${lista.length}.`;
  renderAgua(); renderBarras();

  $('#bienvenida').innerHTML = S.visto ? '' : `<div class="card">
    <h2>👋 ¡Bienvenida!</h2>
    <ol class="pasos hint"><li>En <b>Alimentos</b> agrega lo que puedes comer.</li>
      <li>En <b>Mi semana</b> crea tus comidas, con su hora y sus días.</li>
      <li>Te avisaremos cuando sea la hora. Al terminar, toca <b>"Ya comí"</b>.</li></ol>
    <button class="btn" id="entendido">¡Entendido!</button></div>`;

  if (!lista.length){
    $('#sigue').innerHTML = '';
    $('#listaHoy').innerHTML = S.comidas.length
      ? `<div class="vacio"><span class="grande">🌿</span>Hoy no tienes comidas programadas.<br><br><button class="btn" data-nueva="1">Agregar una comida</button></div>`
      : `<div class="vacio"><span class="grande">🍽️</span>Aún no has creado ninguna comida.<br>Empieza con la primera: ponle nombre, hora y días.<br><br><button class="btn" data-nueva="1">＋ Crear mi primera comida</button></div>`;
    return;
  }

  const sig = lista.find(c => !hechos[c.id] && minutos(c.hora) >= ahora - 30);
  if (sig){
    const t = tema(sig);
    $('#sigue').innerHTML = `<div class="sigue t-${t.k}" data-emoji="${t.e}">
      <small>${minutos(sig.hora) - ahora <= 0 ? 'Es ahora' : 'Sigue'}</small>
      <h2>${esc(sig.nombre)}</h2>
      <div class="cuando">${fmt12(sig.hora)} · ${cuando(sig, ahora)}</div>
      <ul>${sig.alimentos.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
      <button class="btn" data-hecho="${sig.id}">Ya comí ✓</button></div>`;
  } else if (nHechos === lista.length){
    $('#sigue').innerHTML = `<div class="sigue t-col" data-emoji="🎉"><small>¡Muy bien!</small><h2>Terminaste hoy</h2><div class="cuando">Todas las comidas listas. ¡Descansa!</div></div>`;
  } else $('#sigue').innerHTML = '';

  $('#listaHoy').innerHTML = lista.map(c => {
    const hecho = !!hechos[c.id], t = tema(c);
    const tarde = !hecho && minutos(c.hora) < ahora - 30;
    const marca = hecho ? '<span class="etiqueta">Listo ✓</span>' : tarde ? '<span class="etiqueta tarde">Pendiente</span>' : '';
    return `<div class="comida t-${t.k} ${hecho?'hecha':''} ${tarde?'tarde':''}">
      <div class="ico">${t.e}</div>
      <div class="info"><div class="hora">${fmt12(c.hora)}</div><h3>${esc(c.nombre)}${marca}</h3>
        <div class="alim">${esc(textoAlimentos(c))}${c.nota ? ' · 📝 ' + esc(c.nota) : ''}</div></div>
      <div class="acc"><button class="btn chico btn-hecho ${hecho?'sec':'ok'}" data-hecho="${c.id}">${hecho ? 'Deshacer' : 'Ya comí ✓'}</button></div></div>`;
  }).join('');
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-hecho]');
  if (b){
    const id = b.dataset.hecho, k = hoyStr(); S.hechos[k] = S.hechos[k] || {};
    if (S.hechos[k][id]) delete S.hechos[k][id]; else { S.hechos[k][id] = true; toast('¡Muy bien! 🎉'); }
    save(); renderHoy(); return;
  }
  const v = e.target.closest('[data-vaso]');
  if (v){ const k = hoyStr(), n = +v.dataset.vaso; S.agua[k] = (S.agua[k] || 0) === n ? n - 1 : n; save(); renderAgua(); return; }
  if (e.target.closest('[data-nueva]')){ irA('semana'); abrirComida(null); return; }
  if (e.target.id === 'entendido'){ S.visto = true; save(); renderHoy(); return; }
  const ir = e.target.closest('[data-ir]'); if (ir) irA(ir.dataset.ir);
});

/* ---------- Semana ---------- */
let diaSel = new Date().getDay();
function tarjetaMini(c){ const t = tema(c);
  return `<div class="mini t-${t.k}" data-edit="${c.id}"><span class="hora">${fmt12(c.hora)}</span><b>${t.e} ${esc(c.nombre)}</b><small>${esc(c.alimentos.join(', '))}</small></div>`; }
function renderSemana(){
  const hoy = new Date().getDay();
  $('#diasSemana').innerHTML = ORDEN.map(i => `<button data-d="${i}" class="${i===diaSel?'on':''} ${i===hoy?'hoy':''}">${DIAS[i]}</button>`).join('');
  const lista = comidasDelDia(diaSel);
  $('#listaSemana').innerHTML = lista.length ? lista.map(c => { const t = tema(c); return `
    <div class="comida editable t-${t.k}" data-edit="${c.id}"><div class="ico">${t.e}</div>
      <div class="info"><div class="hora">${fmt12(c.hora)}</div><h3>${esc(c.nombre)}</h3><div class="alim">${esc(textoAlimentos(c))}</div></div>
      <span class="lapiz">✏️</span></div>`; }).join('')
    : `<div class="vacio"><span class="grande">🍽️</span>No hay comidas este día.<br>Toca "Agregar comida" para crear una.</div>`;
  const NOMBRES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  $('#tablero').innerHTML = ORDEN.map(i => `<div class="col-dia ${i===hoy?'hoy':''}">
    <header><b>${NOMBRES[i]}</b><button class="mas" data-mas="${i}" aria-label="Agregar comida el ${NOMBRES[i]}">＋</button></header>
    ${comidasDelDia(i).map(tarjetaMini).join('') || '<div class="nada">Sin comidas</div>'}</div>`).join('');
}
$('#diasSemana').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b){ diaSel = +b.dataset.d; renderSemana(); } });
const editarClick = e => { const c = e.target.closest('[data-edit]'); if (c) abrirComida(c.dataset.edit); };
$('#listaSemana').addEventListener('click', editarClick);
$('#tablero').addEventListener('click', e => { const m = e.target.closest('[data-mas]'); if (m) abrirComida(null, +m.dataset.mas); else editarClick(e); });
$('#nuevaComida').onclick = () => abrirComida(null);

/* ---------- Editor de comida ---------- */
$('#cHH').innerHTML = Array.from({length:24}, (_,h) => `<option value="${h}">${h%12||12} ${h<12?'a.m.':'p.m.'}</option>`).join('');
$('#cMM').innerHTML = Array.from({length:60}, (_,m) => `<option value="${pad(m)}">${pad(m)}</option>`).join('');
let editando = null, selDias = [], selAl = [];
function abrirComida(id, dia){
  editando = id;
  const c = id ? S.comidas.find(x => x.id === id) : null;
  $('#dlgTitulo').textContent = c ? 'Editar comida' : 'Nueva comida';
  $('#cNombre').value = c ? c.nombre : '';
  const [hh, mm] = (c ? c.hora : '12:00').split(':');
  $('#cHH').value = String(+hh); $('#cMM').value = mm;
  $('#cNota').value = c ? c.nota : '';
  selDias = c ? [...c.dias] : (dia === undefined ? [] : [dia]);   // sin días marcados: ella elige
  selAl = c ? [...c.alimentos] : [];
  $('#cBorrar').style.visibility = c ? 'visible' : 'hidden';
  pintarEditor();
  $('#dlg').showModal();
}
function pintarEditor(){
  $('#cDias').innerHTML = ORDEN.map(i => `<button type="button" data-d="${i}" class="${selDias.includes(i)?'on':''}">${DIAS[i]}</button>`).join('');
  const todos = [...new Set([...S.catalogo, ...selAl])];
  $('#cAlimentos').innerHTML = todos.map(a => `<button type="button" class="chip ${selAl.includes(a)?'on':''}" data-a="${esc(a)}">${selAl.includes(a)?'✓ ':''}${esc(a)}</button>`).join('');
  $('#cSinAlimentos').hidden = todos.length > 0;
}
$('#cDias').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b) return; const d = +b.dataset.d;
  selDias = selDias.includes(d) ? selDias.filter(x => x !== d) : [...selDias, d]; pintarEditor(); });
$('#cAlimentos').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
  selAl = selAl.includes(a) ? selAl.filter(x => x !== a) : [...selAl, a]; pintarEditor(); });
$('#cCancelar').onclick = () => $('#dlg').close();
$('#cBorrar').onclick = () => {
  if (!confirm('¿Eliminar esta comida?')) return;
  S.comidas = S.comidas.filter(c => c.id !== editando); save(); cambio(); $('#dlg').close(); renderTodo();
};
$('#formComida').addEventListener('submit', e => {
  if (!selDias.length){ e.preventDefault(); toast('Toca los días en que quieres esta comida'); return; }
  const datos = {nombre:$('#cNombre').value.trim(), hora:`${pad(+$('#cHH').value)}:${$('#cMM').value}`, dias:[...selDias].sort(), alimentos:selAl, nota:$('#cNota').value.trim()};
  if (editando) Object.assign(S.comidas.find(c => c.id === editando), datos);
  else S.comidas.push({id:uid(), ...datos});
  save(); cambio(); renderTodo(); toast('Guardado ✓');
});

/* ---------- Alimentos ---------- */
function agregarAlimento(v){
  v = v.trim(); if (!v) return;
  if (!S.catalogo.some(a => a.toLowerCase() === v.toLowerCase())) S.catalogo.push(v);
  save(); cambio(); renderAlimentos();
}
function renderAlimentos(){
  $('#listaAlimentos').innerHTML = S.catalogo.length
    ? S.catalogo.map(a => `<span class="chip">${esc(a)}<span class="x" data-del="${esc(a)}" role="button" aria-label="Quitar ${esc(a)}">✕</span></span>`).join('')
    : `<div class="vacio" style="width:100%"><span class="grande">🥣</span>Aún no hay alimentos.<br>Escribe uno arriba o toca una idea.</div>`;
  const sug = SUGERENCIAS.filter(s => !S.catalogo.some(a => a.toLowerCase() === s.toLowerCase()));
  $('#sugerencias').innerHTML = sug.map(s => `<button class="chip sug" data-sug="${esc(s)}">＋ ${esc(s)}</button>`).join('');
  $('#sugTitulo').hidden = $('#sugerencias').hidden = !sug.length;
}
$('#formAlimento').addEventListener('submit', e => {
  e.preventDefault(); agregarAlimento($('#nuevoAlimento').value); $('#nuevoAlimento').value = '';
});
$('#sugerencias').addEventListener('click', e => { const b = e.target.closest('[data-sug]'); if (b) agregarAlimento(b.dataset.sug); });
$('#listaAlimentos').addEventListener('click', e => {
  const a = e.target.dataset.del; if (!a) return;
  S.catalogo = S.catalogo.filter(x => x !== a);
  S.comidas.forEach(c => c.alimentos = c.alimentos.filter(x => x !== a));
  save(); cambio(); renderAlimentos();
});

/* ---------- Notificaciones ---------- */
const hayNotif = 'Notification' in window;
function estadoNotif(){
  const el = $('#notifEstado'), av = $('#avisoNotif');
  av.innerHTML = '';
  if (!hayNotif){ el.textContent = 'Este navegador no permite notificaciones.'; $('#btnNotif').hidden = true; return; }
  const p = Notification.permission;
  el.textContent = p === 'granted' ? '✅ Activadas. Para que lleguen, deja la app abierta o en segundo plano.'
    : p === 'denied' ? '🚫 Bloqueadas. Actívalas en los permisos del navegador.' : 'Aún no activadas.';
  $('#btnNotif').hidden = p === 'granted';
  if (p === 'default') av.innerHTML = `<div class="aviso"><span style="font-size:1.8rem">🔔</span><div><b>Activa los avisos</b>Así te recordamos cuándo toca comer.<br><button class="btn chico" data-ir="ajustes" style="margin-top:8px">Ir a Ajustes</button></div></div>`;
}
$('#btnNotif').onclick = async () => { if (hayNotif) { await Notification.requestPermission(); estadoNotif(); } };

const tituloAviso = (c, ahora) => minutos(c.hora) <= ahora ? `¡Ya es la hora de tu ${c.nombre}!` : `Tu ${c.nombre} es a las ${fmt12(c.hora)}`;
const cuerpoAviso = c => `${fmt12(c.hora)}${c.alimentos.length ? ' · ' + c.alimentos.join(', ') : ''}`;

async function notificar(titulo, cuerpo){
  if (hayNotif && Notification.permission === 'granted'){
    // El navegador solo muestra una imagen fija en la notificación; el GIF se mueve en la ventana de la app.
    const op = {body:cuerpo, icon:'icon-192.png', badge:'badge-96.png', image:'alerta.png', vibrate:[200,100,200,100,200], requireInteraction:true, tag:titulo+cuerpo};
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) { await reg.showNotification(titulo, op); return; }
      new Notification(titulo, op); return;
    } catch {}
  }
}

let alertaId = null;
function mostrarAlerta(c, ahora){
  alertaId = c.id;
  $('#alertaTitulo').textContent = tituloAviso(c, ahora);
  $('#alertaTexto').textContent = cuerpoAviso(c);
  $('#alertaListo').hidden = !c.id || c.id === 'prueba';
  const img = $('#alerta img'); img.src = 'ansioso.gif';   // reinicia la animación
  if (!$('#alerta').open) $('#alerta').showModal();
}
$('#alertaCerrar').onclick = () => $('#alerta').close();
$('#alertaListo').onclick = () => {
  const k = hoyStr(); S.hechos[k] = S.hechos[k] || {}; S.hechos[k][alertaId] = true;
  save(); renderHoy(); $('#alerta').close(); toast('¡Muy bien! 🎉');
};
function avisar(c){
  const ahora = ahoraMin();
  notificar(tituloAviso(c, ahora), cuerpoAviso(c));
  if (!document.hidden) mostrarAlerta(c, ahora);
}

function revisarRecordatorios(){
  const d = new Date(), k = hoyStr(), ahora = ahoraMin();
  const hechos = S.hechos[k] || {};
  comidasDelDia(d.getDay()).forEach(c => {
    if (hechos[c.id]) return;
    const objetivo = minutos(c.hora) - S.anticipacion;
    const clave = k + '|' + c.id;
    if (ahora >= objetivo && ahora <= minutos(c.hora) + 15 && !S.avisados[clave]){
      S.avisados[clave] = true;
      Object.keys(S.avisados).forEach(x => { if (!x.startsWith(k)) delete S.avisados[x]; });   // limpia días anteriores
      save();
      avisar(c);
    }
  });
  renderHoy();
}
$('#probarAviso').onclick = async () => {
  if (hayNotif && Notification.permission === 'default') { await Notification.requestPermission(); estadoNotif(); }
  const c = {id:'prueba', nombre:'Comida', hora:`${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`, alimentos:['Pollo', 'Arroz blanco hervido']};
  notificar(tituloAviso(c, ahoraMin()), cuerpoAviso(c)); mostrarAlerta(c, ahoraMin());
};

/* ---------- Ajustes / respaldo ---------- */
$('#aviso').value = S.anticipacion;
$('#aviso').onchange = e => { S.anticipacion = +e.target.value; save(); cambio(); toast('Guardado ✓'); };
$('#alarmaCal').checked = S.alarmaCal !== false;
$('#alarmaCal').onchange = e => { S.alarmaCal = e.target.checked; save(); cambio(); toast('Guardado ✓'); };
$('#nombreUsuario').value = S.nombre;
$('#nombreUsuario').oninput = e => { S.nombre = e.target.value.trim(); save(); renderHoy(); };
$('#tema').value = S.tema;
$('#tema').onchange = e => { S.tema = e.target.value; save(); aplicarTema(); };

/* ---------- Google Calendar (base de datos) ---------- */
const GKEY = 'comidas-google';
let G; try { G = JSON.parse(localStorage.getItem(GKEY)) || {}; } catch { G = {}; }
G = {clientId:'', calId:'', on:false, dirty:false, sincronizado:false, ...G};
const saveG = () => { try { localStorage.setItem(GKEY, JSON.stringify(G)); } catch {} };
const clientId = () => (window.CONFIG && window.CONFIG.googleClientId) || G.clientId;
const SCOPES = 'https://www.googleapis.com/auth/calendar.app.created https://www.googleapis.com/auth/calendar.calendarlist.readonly';
const ICS_DIAS = ['SU','MO','TU','WE','TH','FR','SA'];
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
let token = null, tokenExp = 0, ocupado = false, tmrSync;

function cargarGIS(){
  if (window.google && google.accounts) return Promise.resolve();
  return new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = ok; s.onerror = () => mal(new Error('Sin conexión con Google'));
    document.head.appendChild(s);
  });
}
async function pedirToken(prompt){
  if (!clientId()) throw new Error('Falta el ID de cliente de Google');
  await cargarGIS();
  return new Promise((ok, mal) => {
    google.accounts.oauth2.initTokenClient({
      client_id: clientId(), scope: SCOPES,
      callback: r => { if (r.error) return mal(new Error(r.error)); token = r.access_token; tokenExp = Date.now() + r.expires_in*1000; ok(); },
      error_callback: e => mal(new Error(e.type || 'cancelado'))
    }).requestAccessToken({prompt});
  });
}
const tokenVigente = () => token && Date.now() < tokenExp - 60000;
async function api(path, opt = {}, reintento = true){
  if (!tokenVigente()) await pedirToken('');
  const r = await fetch('https://www.googleapis.com/calendar/v3' + path, {
    method: opt.method || 'GET',
    headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
    body: opt.body ? JSON.stringify(opt.body) : undefined
  });
  if (r.status === 401 && reintento){ token = null; return api(path, opt, false); }
  if (r.status === 204) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || ('Error ' + r.status));
  return j;
}

async function asegurarCal(){
  if (G.calId) return encodeURIComponent(G.calId);
  const l = await api('/users/me/calendarList?minAccessRole=owner');
  let c = (l.items || []).find(x => x.summary === 'Mis Comidas');
  if (!c) c = await api('/calendars', {method:'POST', body:{summary:'Mis Comidas', timeZone:TZ}});
  G.calId = c.id; saveG();
  return encodeURIComponent(c.id);
}

function eventoDe(c){
  const ini = new Date();
  while (!c.dias.includes(ini.getDay())) ini.setDate(ini.getDate() + 1);
  const f = hoyStr(ini), fin = Math.min(minutos(c.hora) + 30, 1439);
  return {
    summary: tema(c).e + ' ' + c.nombre,
    description: [c.alimentos.join(', '), c.nota].filter(Boolean).join(' — '),
    start: {dateTime: `${f}T${c.hora}:00`, timeZone: TZ},
    end: {dateTime: `${f}T${pad(Math.floor(fin/60))}:${pad(fin%60)}:00`, timeZone: TZ},
    recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=' + c.dias.map(d => ICS_DIAS[d]).join(',')],
    reminders: {useDefault: false, overrides: S.alarmaCal === false ? [] : [{method:'popup', minutes: S.anticipacion}]},
    extendedProperties: {private: {app:'mis-comidas', mid:c.id, nombre:c.nombre, alimentos:JSON.stringify(c.alimentos), nota:c.nota}}
  };
}
const listarEventos = cal => api(`/calendars/${cal}/events?privateExtendedProperty=app%3Dmis-comidas&maxResults=250`)
  .then(r => (r.items || []).filter(e => e.recurrence && e.extendedProperties && e.extendedProperties.private && e.extendedProperties.private.mid));

async function subir(){
  const cal = await asegurarCal();
  const porMid = new Map((await listarEventos(cal)).map(e => [e.extendedProperties.private.mid, e]));
  for (const c of S.comidas){
    const ex = porMid.get(c.id);
    if (ex) await api(`/calendars/${cal}/events/${ex.id}`, {method:'PUT', body:eventoDe(c)});
    else await api(`/calendars/${cal}/events`, {method:'POST', body:eventoDe(c)});
    porMid.delete(c.id);
  }
  for (const e of porMid.values()) await api(`/calendars/${cal}/events/${e.id}`, {method:'DELETE'});
  await api(`/calendars/${cal}`, {method:'PATCH', body:{description: JSON.stringify({catalogo:S.catalogo, anticipacion:S.anticipacion, alarmaCal:S.alarmaCal})}});
  G.dirty = false; G.sincronizado = true; saveG();
}

async function bajar(){
  const cal = await asegurarCal();
  const [info, evs] = await Promise.all([api(`/calendars/${cal}`), listarEventos(cal)]);
  if (!evs.length && !G.sincronizado) return subir();   // primera vez con calendario vacío: sube lo local
  S.comidas = evs.map(e => {
    const p = e.extendedProperties.private;
    const by = ((e.recurrence.find(x => x.startsWith('RRULE')) || '').match(/BYDAY=([A-Z,]+)/) || [])[1];
    const dias = by ? by.split(',').map(x => ICS_DIAS.indexOf(x)).filter(i => i >= 0) : [0,1,2,3,4,5,6];
    let alimentos = []; try { alimentos = JSON.parse(p.alimentos || '[]'); } catch {}
    return {id:p.mid, nombre:p.nombre || e.summary.replace(/^\S+\s/, ''), hora:e.start.dateTime.slice(11,16), dias, alimentos, nota:p.nota || ''};
  });
  try {
    const d = JSON.parse(info.description || '{}');
    if (Array.isArray(d.catalogo)) S.catalogo = d.catalogo;
    if (d.anticipacion != null) S.anticipacion = d.anticipacion;
    if (d.alarmaCal != null) S.alarmaCal = d.alarmaCal;
  } catch {}
  $('#aviso').value = S.anticipacion; $('#alarmaCal').checked = S.alarmaCal !== false;
  save(); G.sincronizado = true; saveG();
}

function estadoG(t){ $('#gEstado').textContent = t; }
async function sincronizar(manual){
  if (!G.on || ocupado) return;
  ocupado = true; estadoG('Sincronizando…');
  try {
    if (manual && !tokenVigente()) await pedirToken('');
    if (G.dirty) await subir(); else await bajar();
    estadoG('Sincronizado a las ' + fmt12(`${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`));
    if (manual) toast('Sincronizado ✓');
  } catch (err) {
    estadoG('No se pudo sincronizar (' + err.message + '). Toca "Sincronizar ahora".');
  } finally { ocupado = false; renderTodo(); }
}
function cambio(){            // llamar tras editar comidas, alimentos o ajustes
  if (!G.on) return;
  G.dirty = true; saveG();
  clearTimeout(tmrSync); tmrSync = setTimeout(() => sincronizar(), 1500);
}
function renderGoogle(){
  const fijo = !!(window.CONFIG && window.CONFIG.googleClientId);
  $('#gConfig').hidden = fijo || G.on;
  $('#gClientId').value = G.clientId;
  $('#gConectar').hidden = G.on; $('#gSync').hidden = !G.on; $('#gSalir').hidden = !G.on;
}
$('#gConectar').onclick = async () => {
  if (!(window.CONFIG && window.CONFIG.googleClientId)) G.clientId = $('#gClientId').value.trim();
  if (!clientId()) { toast('Pega primero el ID de cliente'); return; }
  try { await pedirToken('select_account'); } catch (err) { estadoG('No se pudo conectar (' + err.message + ')'); return; }
  G.on = true; G.sincronizado = false; saveG(); renderGoogle();
  sincronizar(true);
};
$('#gSync').onclick = () => sincronizar(true);
$('#gSalir').onclick = () => {
  if (!confirm('¿Desconectar de Google? Las comidas se quedan en este teléfono y en el calendario.')) return;
  if (token && window.google) google.accounts.oauth2.revoke(token);
  token = null; G = {...G, on:false, calId:'', dirty:false, sincronizado:false}; saveG();
  estadoG(''); renderGoogle();
};
document.addEventListener('visibilitychange', () => { if (!document.hidden) sincronizar(); });

/* ---------- Navegación ---------- */
function irA(v){
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x.dataset.v === v));
  document.querySelectorAll('.view').forEach(x => x.classList.toggle('on', x.id === 'v-' + v));
  $('#nuevaComida').hidden = v !== 'semana';
  window.scrollTo(0, 0);
}
document.querySelectorAll('nav button').forEach(b => b.onclick = () => irA(b.dataset.v));

function renderTodo(){ renderHoy(); renderSemana(); renderAlimentos(); estadoNotif(); renderGoogle(); }
renderTodo();
sincronizar();
revisarRecordatorios();
setInterval(revisarRecordatorios, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) revisarRecordatorios(); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
