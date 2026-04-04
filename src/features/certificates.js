// ============================================================
// CERTIFICATE — extracted from app.js lines 954-1117, 2076-2208
// ============================================================
let certModIdx=0;
function showCert(mi){
  certModIdx=mi;
  const m=window.M[mi];
  const disc=window.DISCIPLINES[m.discipline||'economia']||{label:'Economia',icon:'📚'};
  const nLessons=m.lessons.length;
  const hours=Math.max(1,Math.round(nLessons*5/60));
  const quizOk=m.lessons.filter((_,li)=>window.S.quiz[`${mi}-${li}`]).length;
  const quizTotal=m.lessons.filter(l=>l.quiz).length;
  const certHash=_certId(mi);
  document.getElementById('certName').textContent=window.S.name;
  document.getElementById('certModule').textContent=`Concluiu: ${m.icon} ${m.title}`;
  document.getElementById('certDetails').innerHTML=`${disc.icon} ${disc.label} · ${nLessons} aulas · ${hours}h · ${quizTotal?Math.round(quizOk/quizTotal*100)+'% quizzes':''}`;
  document.getElementById('certDate').textContent=new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});
  document.getElementById('certId').textContent=`ID: ${certHash}`;
  document.getElementById('certOverlay').classList.add('show')
}
function _certId(mi){
  const raw=`${window.S.name}-${mi}-${window.S.lvl}`;
  let h=0;for(let i=0;i<raw.length;i++){h=((h<<5)-h)+raw.charCodeAt(i);h|=0}
  return 'EL-'+Math.abs(h).toString(36).toUpperCase().slice(0,8)
}
function _discCertId(disc){
  const raw=`${window.S.name}-DISC-${disc}`;
  let h=0;for(let i=0;i<raw.length;i++){h=((h<<5)-h)+raw.charCodeAt(i);h|=0}
  return 'ELD-'+Math.abs(h).toString(36).toUpperCase().slice(0,8)
}

function checkDiscCompletion(mi){
  const disc=window.M[mi].discipline||'economia';
  const mods=window.getDiscModules(disc);
  const allDone=mods.every(({mod,idx})=>mod.lessons.every((_,li)=>window.S.done[`${idx}-${li}`]));
  if(allDone){
    const d=window.DISCIPLINES[disc];
    if(d){
      setTimeout(()=>{
        window.toast(`🏆 ${d.label} Completa!`);window.launchConfetti();
        setTimeout(()=>showDiscCert(disc),800)
      },1200)
    }
  }
}

function showDiscCert(disc){
  const d=window.DISCIPLINES[disc];if(!d)return;
  const mods=window.getDiscModules(disc);
  const totalLessons=mods.reduce((s,{mod})=>s+mod.lessons.length,0);
  const totalHours=Math.max(1,Math.round(totalLessons*5/60));
  const totalModules=mods.length;
  const quizOk=mods.reduce((s,{mod,idx})=>s+mod.lessons.filter((_,li)=>window.S.quiz[`${idx}-${li}`]).length,0);
  const quizTotal=mods.reduce((s,{mod})=>s+mod.lessons.filter(l=>l.quiz).length,0);
  const certHash=_discCertId(disc);

  const overlay=document.createElement('div');
  overlay.className='cert-overlay show';overlay.id='discCertOverlay';
  overlay.onclick=e=>{if(e.target===overlay){overlay.remove()}};
  overlay.innerHTML=`<div class="cert-card cert-card-disc">
    <div class="cert-seal" aria-hidden="true">🏆</div>
    <div class="cert-title">Certificado de Disciplina</div>
    <div class="cert-sub">Escola Liberal — Plataforma Educacional</div>
    <div class="cert-name">${window.S.name}</div>
    <div class="cert-module">Concluiu a disciplina: ${d.icon} ${d.label}</div>
    <div class="cert-details">${totalModules} módulos · ${totalLessons} aulas · ${totalHours}h · ${quizTotal?Math.round(quizOk/quizTotal*100)+'% quizzes':''}</div>
    <div class="cert-date">${new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}</div>
    <div class="cert-id">ID: ${certHash}</div>
    <div style="display:flex;gap:.75rem;justify-content:center;margin-top:.5rem;flex-wrap:wrap">
      <button class="cert-close" onclick="window.exportDiscCertPDF('${disc}')" style="border-color:var(--sage);color:var(--sage)">📄 Salvar PDF</button>
      <button class="cert-close" onclick="window.exportDiscCertImage('${disc}')" style="border-color:var(--honey);color:var(--honey)">📥 Salvar Imagem</button>
      <button class="cert-close" onclick="document.getElementById('discCertOverlay').remove()">Fechar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay)
}

function _drawDiscCert(ctx,w,h,disc){
  const d=window.DISCIPLINES[disc];if(!d)return;
  const mods=window.getDiscModules(disc);
  const totalLessons=mods.reduce((s,{mod})=>s+mod.lessons.length,0);
  const totalHours=Math.max(1,Math.round(totalLessons*5/60));
  const quizOk=mods.reduce((s,{mod,idx})=>s+mod.lessons.filter((_,li)=>window.S.quiz[`${idx}-${li}`]).length,0);
  const quizTotal=mods.reduce((s,{mod})=>s+mod.lessons.filter(l=>l.quiz).length,0);
  const certHash=_discCertId(disc);
  // Background — premium gold gradient
  const grad=ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,'#1a1a2e');grad.addColorStop(1,'#16213e');
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  // Double border — gold
  ctx.strokeStyle='#dba550';ctx.lineWidth=5;ctx.strokeRect(18,18,w-36,h-36);
  ctx.strokeStyle='rgba(219,165,80,.4)';ctx.lineWidth=2;ctx.strokeRect(30,30,w-60,h-60);
  // Corner ornaments
  [[38,38],[w-38,38],[38,h-38],[w-38,h-38]].forEach(([x,y])=>{ctx.fillStyle='#dba550';ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill()});
  // Trophy
  ctx.font='56px serif';ctx.textAlign='center';ctx.fillStyle='#dba550';ctx.fillText('🏆',w/2,100);
  // Title
  ctx.font='bold 32px Georgia';ctx.fillStyle='#e8e6e1';ctx.fillText('Certificado de Disciplina',w/2,152);
  ctx.font='15px sans-serif';ctx.fillStyle='#9ba3b5';ctx.fillText('Escola Liberal — Plataforma Educacional',w/2,180);
  // Divider
  ctx.beginPath();ctx.moveTo(w*0.15,205);ctx.lineTo(w*0.85,205);ctx.strokeStyle='rgba(219,165,80,.4)';ctx.lineWidth=1;ctx.stroke();
  // Cert text
  ctx.font='14px sans-serif';ctx.fillStyle='#9ba3b5';ctx.fillText('Certificamos que',w/2,240);
  ctx.font='italic 40px Georgia';ctx.fillStyle='#5fbf96';ctx.fillText(window.S.name,w/2,290);
  ctx.font='14px sans-serif';ctx.fillStyle='#9ba3b5';ctx.fillText('concluiu com êxito a disciplina completa',w/2,325);
  // Discipline name
  ctx.font='bold 26px sans-serif';ctx.fillStyle='#dba550';ctx.fillText(d.label,w/2,368);
  // Details
  ctx.font='13px sans-serif';ctx.fillStyle='#9ba3b5';
  ctx.fillText(`${mods.length} módulos · ${totalLessons} aulas · ${totalHours}h de carga horária${quizTotal?` · ${Math.round(quizOk/quizTotal*100)}% quizzes`:''}`,w/2,400);
  // Divider 2
  ctx.beginPath();ctx.moveTo(w*0.25,425);ctx.lineTo(w*0.75,425);ctx.strokeStyle='rgba(219,165,80,.2)';ctx.stroke();
  // Date
  ctx.font='14px sans-serif';ctx.fillStyle='#9ba3b5';
  ctx.fillText(new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}),w/2,455);
  // ID
  ctx.font='11px monospace';ctx.fillStyle='#6b7488';
  ctx.fillText(`Certificado ${certHash} · escolaliberal.com.br`,w/2,485);
  // Footer
  ctx.font='11px sans-serif';ctx.fillStyle='#4a5568';
  ctx.fillText('Este certificado atesta a conclusão da disciplina completa na plataforma Escola Liberal.',w/2,h-50)
}

function exportDiscCertImage(disc){
  const c=document.createElement('canvas');c.width=900;c.height=560;
  _drawDiscCert(c.getContext('2d'),900,560,disc);
  const a=document.createElement('a');
  a.download=`certificado-disciplina-${disc}.png`;
  a.href=c.toDataURL('image/png');a.click();
  window.toast('Certificado PNG salvo!')
}

function exportDiscCertPDF(disc){
  const c=document.createElement('canvas');c.width=1190;c.height=842;
  _drawDiscCert(c.getContext('2d'),1190,842,disc);
  // Reuse same PDF generation logic from module cert
  const pdfW=841.89;const pdfH=595.28;
  const imgW=pdfW-40;const imgH=pdfH-40;
  const jpegData=c.toDataURL('image/jpeg',0.92);
  const jpegBin=atob(jpegData.split(',')[1]);
  const jpegBytes=new Uint8Array(jpegBin.length);
  for(let i=0;i<jpegBin.length;i++)jpegBytes[i]=jpegBin.charCodeAt(i);

  let pdf='%PDF-1.4\n';const offsets=[];
  offsets.push(pdf.length);pdf+='1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  offsets.push(pdf.length);pdf+='2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  offsets.push(pdf.length);pdf+=`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfW} ${pdfH}] /Contents 4 0 R /Resources << /XObject << /Img 5 0 R >> >> >>\nendobj\n`;
  const cs=`q ${imgW} 0 0 ${imgH} 20 20 cm /Img Do Q`;
  offsets.push(pdf.length);pdf+=`4 0 obj\n<< /Length ${cs.length} >>\nstream\n${cs}\nendstream\nendobj\n`;
  const imgObjStr=`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`;
  const imgEnd='\nendstream\nendobj\n';
  const pdfStart=new TextEncoder().encode(pdf);const imgStartB=new TextEncoder().encode(imgObjStr);const imgEndB=new TextEncoder().encode(imgEnd);
  offsets.push(pdfStart.length);
  const xrefOff=pdfStart.length+imgStartB.length+jpegBytes.length+imgEndB.length;
  let xref=`xref\n0 6\n0000000000 65535 f \n`;offsets.forEach(o=>{xref+=String(o).padStart(10,'0')+' 00000 n \n'});
  xref+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOff}\n%%EOF`;
  const xrefB=new TextEncoder().encode(xref);
  const total=new Uint8Array(pdfStart.length+imgStartB.length+jpegBytes.length+imgEndB.length+xrefB.length);
  let p=0;total.set(pdfStart,p);p+=pdfStart.length;total.set(imgStartB,p);p+=imgStartB.length;total.set(jpegBytes,p);p+=jpegBytes.length;total.set(imgEndB,p);p+=imgEndB.length;total.set(xrefB,p);
  const blob=new Blob([total],{type:'application/pdf'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`certificado-disciplina-${disc}.pdf`;a.click();URL.revokeObjectURL(a.href);
  window.toast('Certificado PDF salvo!')
}
function closeCert(){const el=document.getElementById('certOverlay');if(el){el.classList.remove('show');el.style.display=''}}

// ============================================================
// CERTIFICATE AS IMAGE / PDF (CANVAS EXPORT)
// ============================================================
function _drawCert(ctx,w,h,mi){
  const m=window.M[mi];
  const disc=window.DISCIPLINES[m.discipline||'economia']||{label:'Economia'};
  const nLessons=m.lessons.length;
  const hours=Math.max(1,Math.round(nLessons*5/60));
  const quizOk=m.lessons.filter((_,li)=>window.S.quiz[`${mi}-${li}`]).length;
  const quizTotal=m.lessons.filter(l=>l.quiz).length;
  const certHash=_certId(mi);
  // Background
  const grad=ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,'#0f1729');grad.addColorStop(1,'#1a2540');
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  // Double border
  ctx.strokeStyle='#dba550';ctx.lineWidth=4;ctx.strokeRect(20,20,w-40,h-40);
  ctx.strokeStyle='rgba(219,165,80,.3)';ctx.lineWidth=1;ctx.strokeRect(32,32,w-64,h-64);
  // Corner ornaments
  const co=[[40,40],[w-40,40],[40,h-40],[w-40,h-40]];
  ctx.fillStyle='#dba550';co.forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill()});
  // Seal
  ctx.font='52px serif';ctx.textAlign='center';ctx.fillStyle='#dba550';ctx.fillText('🏅',w/2,95);
  // Title
  ctx.font='bold 30px Georgia';ctx.fillStyle='#e8e6e1';ctx.fillText('Certificado de Conclusão',w/2,145);
  // Subtitle
  ctx.font='15px sans-serif';ctx.fillStyle='#9ba3b5';ctx.fillText('Escola Liberal — Plataforma Educacional',w/2,175);
  // Divider
  ctx.beginPath();ctx.moveTo(w*0.2,200);ctx.lineTo(w*0.8,200);ctx.strokeStyle='rgba(219,165,80,.3)';ctx.lineWidth=1;ctx.stroke();
  // "Certificamos que"
  ctx.font='14px sans-serif';ctx.fillStyle='#9ba3b5';ctx.fillText('Certificamos que',w/2,235);
  // Name
  ctx.font='italic 38px Georgia';ctx.fillStyle='#4a9e7e';ctx.fillText(window.S.name,w/2,285);
  // "concluiu com êxito"
  ctx.font='14px sans-serif';ctx.fillStyle='#9ba3b5';ctx.fillText('concluiu com êxito o módulo',w/2,320);
  // Module title
  ctx.font='bold 22px sans-serif';ctx.fillStyle='#e8e6e1';ctx.fillText(m.title,w/2,358);
  // Details
  ctx.font='13px sans-serif';ctx.fillStyle='#9ba3b5';
  ctx.fillText(`${disc.label} · ${nLessons} aulas · ${hours}h de carga horária${quizTotal?` · ${Math.round(quizOk/quizTotal*100)}% nos quizzes`:''}`,w/2,390);
  // Divider 2
  ctx.beginPath();ctx.moveTo(w*0.25,415);ctx.lineTo(w*0.75,415);ctx.strokeStyle='rgba(219,165,80,.2)';ctx.stroke();
  // Date
  ctx.font='14px sans-serif';ctx.fillStyle='#9ba3b5';
  ctx.fillText(new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}),w/2,445);
  // Cert ID
  ctx.font='11px monospace';ctx.fillStyle='#6b7488';
  ctx.fillText(`Certificado ${certHash} · escolaliberal.com.br`,w/2,475);
  // Footer
  ctx.font='11px sans-serif';ctx.fillStyle='#4a5568';
  ctx.fillText('Este certificado atesta a conclusão do módulo na plataforma Escola Liberal.',w/2,h-52);
}

function exportCertImage(mi){
  const m=window.M[mi];const c=document.createElement('canvas');c.width=900;c.height=560;
  const ctx=c.getContext('2d');
  _drawCert(ctx,900,560,mi);
  const link=document.createElement('a');link.download=`certificado-${m.title.replace(/\s/g,'-').toLowerCase()}.png`;
  link.href=c.toDataURL('image/png');link.click();
  window.toast('Certificado PNG salvo!')
}

function exportCertPDF(mi){
  const m=window.M[mi];
  // Create landscape A4-proportioned canvas (higher res for PDF quality)
  const c=document.createElement('canvas');c.width=1190;c.height=842;
  const ctx=c.getContext('2d');
  _drawCert(ctx,1190,842,mi);
  // Convert to PDF using canvas data
  const imgData=c.toDataURL('image/png');
  // Build minimal PDF with embedded image
  const pdfW=841.89;const pdfH=595.28; // A4 landscape in points
  const imgW=pdfW-40;const imgH=pdfH-40;
  const stream=atob(imgData.split(',')[1]);
  const bytes=new Uint8Array(stream.length);
  for(let i=0;i<stream.length;i++)bytes[i]=stream.charCodeAt(i);

  // Minimal PDF structure
  let pdf='%PDF-1.4\n';
  const offsets=[];
  // Object 1: Catalog
  offsets.push(pdf.length);
  pdf+='1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  // Object 2: Pages
  offsets.push(pdf.length);
  pdf+='2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  // Object 3: Page
  offsets.push(pdf.length);
  pdf+=`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfW} ${pdfH}] /Contents 4 0 R /Resources << /XObject << /Img 5 0 R >> >> >>\nendobj\n`;
  // Object 4: Content stream (draw image)
  const contentStr=`q ${imgW} 0 0 ${imgH} 20 20 cm /Img Do Q`;
  offsets.push(pdf.length);
  pdf+=`4 0 obj\n<< /Length ${contentStr.length} >>\nstream\n${contentStr}\nendstream\nendobj\n`;
  // Object 5: Image XObject — we need binary, so we build ArrayBuffer
  const imgHeader=`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length `;

  // Use JPEG for smaller file (re-encode canvas)
  const jpegData=c.toDataURL('image/jpeg',0.92);
  const jpegBin=atob(jpegData.split(',')[1]);
  const jpegBytes=new Uint8Array(jpegBin.length);
  for(let i=0;i<jpegBin.length;i++)jpegBytes[i]=jpegBin.charCodeAt(i);

  const imgObjStr=imgHeader+jpegBytes.length+' >>\nstream\n';
  const imgEndStr='\nendstream\nendobj\n';

  // Build xref
  const pdfStart=new TextEncoder().encode(pdf);
  const imgStart=new TextEncoder().encode(imgObjStr);
  const imgEnd=new TextEncoder().encode(imgEndStr);

  offsets.push(pdfStart.length); // offset for obj 5

  const xrefOffset=pdfStart.length+imgStart.length+jpegBytes.length+imgEnd.length;
  let xref=`xref\n0 6\n0000000000 65535 f \n`;
  offsets.forEach(o=>{xref+=String(o).padStart(10,'0')+' 00000 n \n'});
  xref+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const xrefBytes=new TextEncoder().encode(xref);

  // Combine all parts
  const total=new Uint8Array(pdfStart.length+imgStart.length+jpegBytes.length+imgEnd.length+xrefBytes.length);
  let pos=0;
  total.set(pdfStart,pos);pos+=pdfStart.length;
  total.set(imgStart,pos);pos+=imgStart.length;
  total.set(jpegBytes,pos);pos+=jpegBytes.length;
  total.set(imgEnd,pos);pos+=imgEnd.length;
  total.set(xrefBytes,pos);

  const blob=new Blob([total],{type:'application/pdf'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`certificado-${m.title.replace(/\s/g,'-').toLowerCase()}.pdf`;
  a.click();URL.revokeObjectURL(a.href);
  window.toast('Certificado PDF salvo!')
}

// Attach to window for HTML onclick compatibility
window.showCert=showCert;
window._certId=_certId;
window._discCertId=_discCertId;
window.checkDiscCompletion=checkDiscCompletion;
window.showDiscCert=showDiscCert;
window._drawDiscCert=_drawDiscCert;
window.exportDiscCertImage=exportDiscCertImage;
window.exportDiscCertPDF=exportDiscCertPDF;
window.closeCert=closeCert;
window._drawCert=_drawCert;
window.exportCertImage=exportCertImage;
window.exportCertPDF=exportCertPDF;

export {showCert,_certId,_discCertId,checkDiscCompletion,showDiscCert,_drawDiscCert,exportDiscCertImage,exportDiscCertPDF,closeCert,_drawCert,exportCertImage,exportCertPDF};
