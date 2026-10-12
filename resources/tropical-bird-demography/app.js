import {METRICS,ymax,growthText,toCSV} from './metrics.js';
import {segments,escape as esc,W,L,R,xScale,frame,axis,tip} from './charts.js';
const $=id=>document.getElementById(id),fmt=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:1}),prob=n=>Number(n).toFixed(3);
let selectedMetric='apparent_survival';
let index,provenance,data,enabled=new Set(),request=0;
const cache=new Map();
async function json(url){const r=await fetch(url);if(!r.ok)throw Error(`Cannot load ${url} (${r.status})`);return r.json();}
const label=sp=>sp.common_name?`${sp.common_name} — ${sp.scientific_name}`:sp.scientific_name;
const station=id=>index.stations.find(s=>s.station_id===id);
function estimate(r){return `${prob(r.median)} [${prob(r.q05)}–${prob(r.q95)}]`;}
const supportLabel={FULL_LOCAL_SUPPORT:'Full local support · both adjacent occasions sampled',PARTIAL_LOCAL_SUPPORT:'Partial local support · one adjacent occasion sampled',NO_LOCAL_SUPPORT:'No local sampling — model-estimated interval'};
function annualTip(r){const s=station(r.station_id);return `${label(data.species)}\n${s.station_name} · ${r.year_start}–${r.year_end}\n${METRICS[selectedMetric].label}: ${prob(r.median)}\nModel: ${METRICS[selectedMetric].model}${selectedMetric==='population_growth'?'\n'+growthText(r):''}\n90% credible interval: ${prob(r.q05)}–${prob(r.q95)}\nSampling support: ${supportLabel[r.interval_support_class]}\n${r.support_warning}\n${r.year_start}: ${fmt(r.start_net_hours)} net-hours · ${r.start_sampled?'Sampled':'No sampling'}\n${r.year_end}: ${fmt(r.end_net_hours)} net-hours · ${r.end_sampled?'Sampled':'No sampling'}\nStart-year individuals captured: ${r.n_individuals}\nStart-year interannual recaptures: ${r.n_interannual_recaptures}`;}
function render(){
  $('tooltip').hidden=true;
  const config=METRICS[selectedMetric],annual=data.annual[selectedMetric],long=data.long_term[selectedMetric];
  const upper=ymax(selectedMetric,annual),longUpper=ymax(selectedMetric,long);
  $('long-title').textContent='Long-term '+config.label.toLowerCase();
  $('annual-title').textContent='Annual '+config.label.toLowerCase();
  $('model-source').textContent='Model: '+config.model;
  $('metric-help').textContent=config.help;
  $('help-title').textContent='Reading '+config.label.toLowerCase();
  $('long-caption').textContent='Equal-weight average across each station’s full monitoring window, calculated within posterior draws before summarizing. Includes unsampled intervals. Different windows limit direct comparisons.'+(selectedMetric==='apparent_survival'?' Native ST-CJS summary.':' Explorer-derived summary from joint Pradel draws; growth is an arithmetic annual mean, not compounded growth.');
  document.querySelectorAll('[name="demographic-metric"]').forEach(n=>n.checked=n.value===selectedMetric);
  const source=provenance.models[config.source];
  $('provenance-content').innerHTML='<dl>'+Object.entries({...source,data_sha:provenance.data_sha,taxonomy_sha:provenance.taxonomy_sha,taxonomy:provenance.taxonomy_version,dimensions:'113 taxa · 185 cells · 5,466 annual keys per metric'}).filter(([k])=>k!=='caveat').map(([k,v])=>`<dt>${esc(k.replaceAll('_',' '))}</dt><dd>${esc(typeof v==='object'?JSON.stringify(v):v)}</dd>`).join('')+'</dl>'+ (source.caveat?`<p>${esc(source.caveat)}</p>`:'')+'<p>Independent CJS and Pradel draws are never paired. Growth comes entirely from joint Pradel draws, preserving covariance. All intervals remain visible; support annotations do not filter model estimates.</p>';

  const visible=data.support.filter(r=>enabled.has(r.station_id)),ss=visible.map(r=>station(r.station_id));
  $('empty-stations').hidden=ss.length>0;
  $('profile-body').innerHTML=visible.map(r=>{const s=station(r.station_id),a=long.find(z=>z.station_id===r.station_id);return `<tr data-station="${s.station_id}"><td style="color:${s.color}">${esc(s.station_name)}<span class="country">${s.country}</span></td><td><div class="estimate"><svg viewBox="0 0 100 23" aria-hidden="true"><path d="M0 12H100" stroke="#dce3d9"/>${selectedMetric==='population_growth'?`<path data-long-reference="1" d="M${100/longUpper} 0V23" stroke="#68786e" stroke-dasharray="2 2"/>`:''}<path d="M${a.q05/longUpper*100} 12H${a.q95/longUpper*100}" stroke="${s.color}" stroke-width="3"/><circle cx="${a.median/longUpper*100}" cy="12" r="4" fill="${s.color}"/></svg><span>${estimate(a)}</span></div></td><td>${r.year_start}–${r.year_end}</td><td>${fmt(r.n_individuals)}</td><td>${fmt(r.n_recaptured)}</td><td>${r.years_sampled}</td><td>${fmt(r.total_net_hours)}</td></tr>`}).join('');
  // Fixed range for the selected species, independent of station toggling; all panels align.
  const lo=Math.min(...data.effort.map(r=>r.year)),hi=Math.max(...data.effort.map(r=>r.year))+1,x=xScale(lo-.5,hi-.5),step=x(lo+1)-x(lo);
  const top=24,bottom=300,y=p=>bottom-p/upper*(bottom-top);
  const alignedFrame=(content,height,label)=>frame(content,height,label).replace('<svg ',`<svg data-x-domain="${lo-.5},${hi-.5}" `);
  let g='<g data-combined-survival="true">',u='';
  for(const p of [0,.25,.5,.75,1].map(v=>v*upper))g+=`<path d="M${L} ${y(p)}H${W-R}" stroke="#dce3d9"/><text x="${L-12}" y="${y(p)+4}" text-anchor="end">${p.toFixed(2)}</text>`;
  g+=`<text transform="translate(45 165) rotate(-90)" text-anchor="middle">${esc(config.label)} (${config.symbol})</text>`;
  // Draw every ribbon before every trajectory so later ribbons cannot obscure lines.
  let lines='';
  ss.forEach((s,i)=>{
    const rows=annual.filter(r=>r.station_id===s.station_id).sort((a,b)=>a.year_start-b.year_start);
    for(const seg of segments(rows)){
      const upper=seg.map(r=>`${x(r.year_start)},${y(r.q95)}`),lower=seg.toReversed().map(r=>`${x(r.year_start)},${y(r.q05)}`);
      g+=`<path data-band="${s.station_id}" data-years="${seg.map(r=>r.year_start)}" d="M${[...upper,...lower].join('L')}Z" fill="${s.color}" fill-opacity=".12" style="pointer-events:none"/>`;
      lines+=`<path data-trajectory="${s.station_id}" data-years="${seg.map(r=>r.year_start)}" d="M${seg.map(r=>`${x(r.year_start)},${y(r.median)}`).join('L')}" fill="none" stroke="${s.color}" stroke-width="2" stroke-dasharray="${s.dash}" style="pointer-events:none"/>`;
      for(const r of seg)lines+=`<path data-interval="${s.station_id}:${r.year_start}" d="M${x(r.year_start)} ${y(r.q05)}V${y(r.q95)}" stroke="${s.color}" opacity=".2" style="pointer-events:none"/><circle data-estimate="${s.station_id}:${r.year_start}" cx="${x(r.year_start)}" cy="${y(r.median)}" r="3" fill="${s.color}" ${tip(annualTip(r))}/>`;
    }
    const cy=8+i*34;
    u+=`<defs><pattern id="support-hatch-${s.station_id}" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M-1 1L1-1M0 6L6 0M5 7L7 5" stroke="${s.color}" stroke-opacity=".45"/></pattern></defs><g data-support-row="${s.station_id}"><text x="${L-14}" y="${cy+18}" text-anchor="end" style="fill:${s.color};font-weight:650">${esc(s.station_name)}</text>`;
    for(const r of rows){
      const opacity={FULL_LOCAL_SUPPORT:.85,PARTIAL_LOCAL_SUPPORT:.3,NO_LOCAL_SUPPORT:.08}[r.interval_support_class];
      u+=`<g data-support-tile="${s.station_id}:${r.year_start}" data-support-class="${r.interval_support_class}" data-color="${s.color}" data-x="${x(r.year_start)}" ${tip(annualTip(r))}><rect x="${x(r.year_start)-step*.44}" y="${cy}" width="${step*.88}" height="26" fill="${s.color}" fill-opacity="${opacity}" stroke="${s.color}" stroke-opacity=".4"/>`;
      if(r.interval_support_class==='NO_LOCAL_SUPPORT')u+=`<rect data-support-hatch="true" x="${x(r.year_start)-step*.44}" y="${cy}" width="${step*.88}" height="26" fill="url(#support-hatch-${s.station_id})"/>`;
      u+='</g>';
    }
    u+='</g>';
  });
  if(selectedMetric==='population_growth')g+=`<path data-growth-reference="1" d="M${L} ${y(1)}H${W-R}" stroke="#344c43" stroke-dasharray="6 4"/><text x="${W-R-5}" y="${y(1)-7}" text-anchor="end">λ = 1 · stable</text>`;
  g+=lines+'</g>'+axis(x,lo,hi,325);
  $('survival-chart').innerHTML=alignedFrame(g,365,'Combined '+config.label+' history').replace('<svg ',`<svg data-y-max="${upper}" data-metric="${selectedMetric}" `);
  u+=axis(x,lo,hi,ss.length*34+30);
  $('support-chart').innerHTML=alignedFrame(u,ss.length*34+68,'Local sampling support by station');
  const max=Math.max(...data.effort.map(r=>r.net_hours));let e='';
  ss.forEach((s,i)=>{const baseline=30+i*82+50;
    e+=`<text x="${L-12}" y="${baseline-23}" text-anchor="end" style="fill:${s.color}">${esc(s.station_name)}</text><text x="${L-12}" y="${baseline-7}" text-anchor="end" style="font-size:9px">0–${fmt(max)} net-hours</text><path d="M${L} ${baseline}H${W-R}" stroke="#dce3d9"/>`;
    for(const r of data.effort.filter(r=>r.station_id===s.station_id)){
      const height=r.net_hours/max*48;
      const detail=tip(`${s.station_name} · ${r.year}\n${fmt(r.net_hours)} usable 12-m net-hours\n${r.sampled?'Sampled: yes':'No local sampling · 0 net-hours'}`);
      e+=r.sampled?`<rect data-effort="${s.station_id}:${r.year}" data-net-hours="${r.net_hours}" x="${x(r.year)-step*.35}" y="${baseline-height}" width="${step*.7}" height="${height}" fill="${s.color}" opacity=".75" ${detail}/>`:`<circle data-effort="${s.station_id}:${r.year}" data-net-hours="0" cx="${x(r.year)}" cy="${baseline}" r="2.5" fill="#fafbf8" stroke="#88948a" ${detail}/>`;
    }
  });e+=axis(x,lo,hi,ss.length*82+30);$('effort-chart').innerHTML=frame(e,ss.length*82+72,'Sampling effort');
  const metric=$('capture-metric').value,metricLabel=$('capture-metric').selectedOptions[0].textContent,cm=Math.max(1,...data.capture.map(r=>r[metric]));let c='';
  ss.forEach((s,i)=>{const cy=16+i*35;c+=`<text x="${L-12}" y="${cy+16}" text-anchor="end" style="fill:${s.color}">${esc(s.station_name)}</text>`;
    for(const r of data.capture.filter(r=>r.station_id===s.station_id)){
      const sampled=data.effort.find(z=>z.station_id===s.station_id&&z.year===r.year).sampled;
      c+=`<rect x="${x(r.year)-step*.4}" y="${cy}" width="${step*.8}" height="24" fill="${sampled?s.color:'url(#hatch-Capturesupport)'}" fill-opacity="${sampled?.08+.92*r[metric]/cm:1}" stroke="${s.color}" stroke-opacity=".18" ${tip(`${label(data.species)}\n${s.station_name} · ${r.year}\n${metricLabel}: ${r[metric]}\n${sampled?'Sampled: yes':'No sampling'}`)}/>`;
    }
  });c+=axis(x,lo,hi,ss.length*35+45);c+=`<text x="${L}" y="${ss.length*35+95}">Color intensity: 0–${cm} ${metricLabel.toLowerCase()} · hatched cells: no sampling</text>`;$('capture-chart').innerHTML=frame(c,ss.length*35+110,'Capture support');
}
function renderSpeciesLinks(sp){
  const code=sp.ebird_species_code;
  const validCode=/^[a-z0-9]{5,9}$/.test(code||'');
  const validName=/^[A-Z][a-z]+ [a-z]+$/.test(sp.scientific_name||'');
  const links=[];
  if(validCode){
    links.push('<a target="_blank" rel="noopener noreferrer" href="https://ebird.org/species/'+encodeURIComponent(code)+'">eBird ↗</a>');
    links.push('<a target="_blank" rel="noopener noreferrer" href="https://birdsoftheworld.org/bow/species/'+encodeURIComponent(code)+'/cur/introduction">Birds of the World ↗</a>');
  }
  if(validName)links.push('<a target="_blank" rel="noopener noreferrer" href="https://xeno-canto.org/search?query='+encodeURIComponent(sp.scientific_name)+'">Xeno-canto recordings ↗</a>');
  $('species-links').innerHTML='<div class="species-links-row"><span class="species-links-title">More about this species</span>'+links.join('')+'</div><p class="species-links-note">eBird and Birds of the World links use the approved eBird/Clements v2025 taxon code; some Birds of the World content requires a subscription. Xeno-canto searches the scientific name under its IOC-based taxonomy; verify split/lump differences before interpreting recordings.</p>';
}
async function choose(sp){
  const token=++request;$('status').textContent='Loading species…';$('status').classList.remove('error');
  try{let next=cache.get(sp.species_id);if(!next){next=await json(`./data/species/${sp.species_id}.json`);cache.set(sp.species_id,next);}if(token!==request)return;data=next;
    enabled=new Set(data.support.map(r=>r.station_id));$('family').textContent='eBird/Clements v2025 · '+sp.ebird_species_code;$('species-name').textContent=sp.common_name||sp.scientific_name;$('scientific-name').textContent=sp.scientific_name;renderSpeciesLinks(sp);
    $('station-toggles').innerHTML='<legend>Station legend <span>Toggle stations in all views</span></legend>'+data.support.map(r=>{const s=station(r.station_id);return `<label class="station-toggle" style="--station:${s.color}"><input type="checkbox" checked value="${s.station_id}" aria-label="Show ${esc(s.station_name)}"><svg class="station-mark" viewBox="0 0 32 10" aria-hidden="true"><path d="M0 5H32" stroke="${s.color}" stroke-width="3" stroke-dasharray="${s.dash}"/></svg>${esc(s.station_name)}</label>`}).join('');
    $('species-search').value=label(sp);$('explorer').hidden=false;$('status').textContent=`${data.support.length} eligible ${data.support.length===1?'population':'populations'} · ${index.species.length} species in the Atlas`;
    history.replaceState(null,'',`#species=${sp.species_id}`);render();
  }catch(err){if(token===request){$('status').textContent=`Data unavailable. ${err.message}`;$('status').classList.add('error');$('explorer').hidden=true;}}
}
$('station-toggles').addEventListener('change',e=>{if(e.target.checked)enabled.add(e.target.value);else enabled.delete(e.target.value);render();});
$('capture-metric').addEventListener('change',render);
$('metric-selector').addEventListener('change',e=>{selectedMetric=e.target.value;render();});
$('download-csv').addEventListener('click',()=>{const rows=data.annual[selectedMetric].filter(r=>enabled.has(r.station_id));const url=URL.createObjectURL(new Blob([toCSV(rows)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${data.species.ebird_species_code}_${selectedMetric}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
document.querySelectorAll('.plot-scroll').forEach(panel=>panel.addEventListener('scroll',()=>{
  document.querySelectorAll('.plot-scroll').forEach(other=>{if(other!==panel&&other.scrollLeft!==panel.scrollLeft)other.scrollLeft=panel.scrollLeft;});
}));
document.querySelectorAll('details.aligned').forEach(panel=>panel.addEventListener('toggle',()=>{if(panel.open)panel.querySelector('.plot-scroll').scrollLeft=$('survival-chart').parentElement.scrollLeft;}));
$('species-search').addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim();const found=index?.species.find(s=>[label(s),s.scientific_name,s.common_name||''].some(v=>v.toLowerCase()===q));if(found)choose(found);else $('status').textContent=q?'Choose a matching species from the suggestions.':'Enter an accepted scientific name.';});
function showTip(target,event){const node=target.closest('[data-tip]');if(!node)return;const t=$('tooltip');t.textContent=node.dataset.tip;t.hidden=false;const rect=node.getBoundingClientRect();let left=(event?.clientX??rect.x)+15,top=(event?.clientY??rect.y)+15;const box=t.getBoundingClientRect();t.style.left=Math.max(8,Math.min(left,innerWidth-box.width-10))+'px';t.style.top=Math.max(8,Math.min(top,innerHeight-box.height-10))+'px';}
document.addEventListener('pointerover',e=>showTip(e.target,e));document.addEventListener('focusin',e=>showTip(e.target));document.addEventListener('click',e=>{if(e.target.closest('[data-tip]'))showTip(e.target,e);else $('tooltip').hidden=true;});document.addEventListener('pointerout',()=>{$('tooltip').hidden=true;});document.addEventListener('focusout',()=>{$('tooltip').hidden=true;});document.addEventListener('keydown',e=>{if(e.key==='Escape')$('tooltip').hidden=true;});
try{
  [index,provenance]=await Promise.all([json('./data/index.json'),json('./data/provenance.json')]);
  if(provenance.build_version!=='DEMOGRAPHY_TAXONOMY_V1'||index.species.length!==113)throw Error('Taxonomy-current source validation failed');
  $('species-list').innerHTML=index.species.map(s=>`<option value="${esc(label(s))}"></option>`).join('');
  const wanted=Number(new URLSearchParams(location.hash.slice(1)).get('species'));await choose(index.species.find(s=>s.species_id===wanted)||index.species.find(s=>s.scientific_name==='Glyphorynchus spirurus')||index.species[0]);
}catch(err){$('status').textContent=`Unable to load the Atlas: ${err.message}. Serve this folder over HTTP using the README instructions.`;$('status').classList.add('error');}
