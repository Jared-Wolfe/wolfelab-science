// All valid modeled intervals remain continuous, irrespective of local sampling support.
export function segments(rows) {
  const result=[]; let current=[];
  for(const row of rows) {
    if(!row.model_interval_valid || !row.display_survival){if(current.length)result.push(current);current=[];continue;}
    if(current.length && current.at(-1).year_end!==row.year_start){result.push(current);current=[];}
    current.push(row);
  }
  if(current.length)result.push(current);
  return result;
}
export const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const W=1160,L=150,R=30;
export function xScale(lo,hi){return year=>L+(year-lo)/(hi-lo)*(W-L-R);}
export function frame(content,height,label){return `<svg viewBox="0 0 ${W} ${height}" role="img" aria-label="${escape(label)}"><defs><pattern id="hatch-${label.replace(/\W/g,'')}" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M-1 1L1-1M0 6L6 0M5 7L7 5" stroke="#b4bfb2" stroke-width="1"/></pattern></defs>${content}</svg>`;}
export function axis(x,lo,hi,y){let out='';for(let year=Math.ceil(lo/5)*5;year<=hi && x(year)<=W-R;year+=5)out+=`<text x="${x(year)}" y="${y}" text-anchor="middle">${year}</text>`;return out+`<text x="${(W+L-R)/2}" y="${y+26}" text-anchor="middle">Calendar year / annual interval start</text>`;}
export function tip(text){return `tabindex="0" data-tip="${escape(text)}" aria-label="${escape(text)}"`;}
