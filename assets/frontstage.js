(function(){
 'use strict';
 const examples={
  lawn:{brand:'JUNIPER / LAWN CARE',kicker:'A LITTLE CARE GOES A LONG WAY',headline:'A yard you\nlove coming\nhome to.',description:'Thoughtful lawn care.\nA simpler weekend.',cta:'Let’s talk about your yard ↗',art:'ROOM\nTO GROW.',services:['Lawn care','Seasonal cleanups','Local service']},
  salon:{brand:'LUNA / BEAUTY STUDIO',kicker:'A LITTLE TIME, JUST FOR YOU',headline:'Your style.\nYour moment.\nYour kind of glow.',description:'Beauty that feels like you.\nFind your next favorite look.',cta:'Explore your next appointment ↗',art:'FEEL\nLIKE YOU.',services:['Hair & color','Beauty services','Appointments']},
  cleaning:{brand:'FRESH START / CLEANING',kicker:'LESS TO DO. MORE ROOM TO LIVE.',headline:'Come home\nto a fresh\nstart.',description:'Thoughtful cleaning.\nMore time for your life.',cta:'Find your clean-home plan ↗',art:'SPACE\nTO BREATHE.',services:['Home cleaning','Move-out cleans','Request a quote']}
 };
 const setLines=(id,text)=>{const el=document.getElementById(id);el.replaceChildren();text.split('\n').forEach((line,i)=>{if(i)el.append(document.createElement('br'));el.append(document.createTextNode(line));});};
 document.querySelectorAll('[data-showcase]').forEach(button=>button.addEventListener('click',()=>{
  const key=button.dataset.showcase,x=examples[key];if(!x)return;
  document.querySelectorAll('[data-showcase]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  document.getElementById('conceptWindow').dataset.theme=key;
  for(const [id,value]of [['conceptBrand',x.brand],['conceptKicker',x.kicker],['conceptHeadline',x.headline],['conceptDescription',x.description],['conceptCta',x.cta],['conceptArtText',x.art]])setLines(id,value);
  x.services.forEach((text,i)=>setLines('conceptService'+(i+1),text));
  const report=document.getElementById('industryExample');report.value=key;report.dispatchEvent(new Event('change'));
 }));
})();
