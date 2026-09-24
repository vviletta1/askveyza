(function (root) {
 'use strict';
 const uid = () => crypto.randomUUID();
 const emptyScenario = () => ({ visits: '', currentRate: '', targetRate: '', capacity: '', value: '', cost: '', spend: '' });
 function company(values = {}) { return { id: uid(), name: '', site: '', industry: 'Home services', area: '', goal: '', notes: '', competitors: '', records: {}, channels: [], tasks: [], scans: [], scenario: emptyScenario(), ...values }; }
 function scenario(values) {
  const keys = ['visits', 'currentRate', 'targetRate', 'capacity', 'value', 'cost', 'spend'];
  if (keys.some(k => values[k] === '' || values[k] == null || !Number.isFinite(Number(values[k])) || Number(values[k]) < 0)) return null;
  const v = Object.fromEntries(keys.map(k => [k, Number(values[k])]));
  if (v.currentRate > 100 || v.targetRate > 100 || v.visits > 1e8 || v.capacity > 1e8 || ['value','cost','spend'].some(k => v[k] > 1e9)) return null;
  const current = Math.min(v.visits * v.currentRate / 100, v.capacity), target = Math.min(v.visits * v.targetRate / 100, v.capacity);
  return { current, target, revenue: (target - current) * v.value, contribution: (target - current) * (v.value - v.cost) - v.spend, limited: v.visits * v.targetRate / 100 > v.capacity };
 }
 function validate(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.companies) || data.companies.length > 200) throw new Error('This is not a supported workspace backup.');
  const ids = new Set();
  for (const c of data.companies) {
   if (!c || typeof c.id !== 'string' || !/^[\w-]{1,80}$/.test(c.id) || ids.has(c.id) || typeof c.name !== 'string' || c.name.length > 120) throw new Error('A company in this backup is not valid.');
   ids.add(c.id);
   for (const k of ['site','industry','area','goal','notes','competitors']) if (typeof c[k] !== 'string' || c[k].length > 12000) throw new Error('Invalid company details.');
   if (!c.records || typeof c.records !== 'object' || Array.isArray(c.records) || !c.scenario || typeof c.scenario !== 'object') throw new Error('Invalid company records.');
   for (const k of ['channels','tasks','scans']) if (!Array.isArray(c[k]) || c[k].length > 2000) throw new Error('Invalid workspace records.');
   const string = (v, max = 12000) => typeof v === 'string' && v.length <= max;
   const metric = v => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e12);
   for (const task of c.tasks) if (!task || !string(task.id,80) || !/^[\w-]+$/.test(task.id) || !string(task.title,500) || !string(task.detail) || !string(task.category,100) || !string(task.due,10) || !['To do','In progress','Done'].includes(task.status)) throw new Error('Invalid action record.');
   for (const [month,r] of Object.entries(c.records)) if (!/^\d{4}-\d{2}$/.test(month) || !r || !string(r.source,240) || !string(r.updatedAt,80) || ['visits','inquiries','jobs','revenue','spend'].some(k=>!metric(r[k]))) throw new Error('Invalid monthly record.');
   for (const r of c.channels) if (!r || !string(r.id,80) || !string(r.month,7) || !/^\d{4}-\d{2}$/.test(r.month) || !string(r.source,100) || ['inquiries','customers','revenue','spend'].some(k=>!metric(r[k]))) throw new Error('Invalid marketing record.');
   for (const s of c.scans) if (!s || !string(s.scannedAt,80) || !string(s.scope,2000) || !Array.isArray(s.warnings) || s.warnings.length>10 || s.warnings.some(w=>!w||!string(w.url,2048)||!string(w.message,1000)) || !Array.isArray(s.pages) || !s.pages.length || s.pages.length > 4 || s.pages.some(p => !p || !string(p.url,2048) || !string(p.title,250) || !Array.isArray(p.findings) || p.findings.length > 50 || p.findings.some(f => !f || !['detected','review'].includes(f.status) || ['id','label','evidence','action','category'].some(k=>!string(f[k],2000))))) throw new Error('Invalid scan record.');
  }
  return data;
 }
 const b64 = bytes => btoa(String.fromCharCode(...bytes));
 const unb64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
 async function derive(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(salt), iterations: 600000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
 }
 async function encrypt(data, key, salt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data))));
  let binary = ''; for (let i = 0; i < encrypted.length; i += 8192) binary += String.fromCharCode(...encrypted.subarray(i, i + 8192));
  return { format: 'askveyza-encrypted-v1', salt, iv: b64(iv), data: btoa(binary) };
 }
 function envelope(value) {
  if (!value || value.format !== 'askveyza-encrypted-v1' || typeof value.salt !== 'string' || value.salt.length !== 24 || typeof value.iv !== 'string' || value.iv.length !== 16 || typeof value.data !== 'string' || value.data.length > 8e6) throw new Error('Choose an encrypted Ask.Veyza backup.');
  return value;
 }
 async function decrypt(value, key) { envelope(value); return validate(JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(value.iv) }, key, unb64(value.data))))); }
 function sampleData() {
  const findings = [
   ['title','Page title','detected','Juniper Lawn Care | Local lawn care','Keep the title useful and specific.','Search'],
   ['contact','Contact link','detected','Example phone link detected','Test the phone link on mobile.','Inquiries'],
   ['mobile','Mobile viewport setting','detected','Example viewport setting detected','Check the real layout on a phone.','Foundation'],
   ['https','Secure address','detected','Illustrative HTTPS address','Use HTTPS.','Foundation'],
   ['heading','Main heading','detected','Lawn care for your kind of home','Review the message.','Clarity'],
   ['description','Search description','review','Missing in this example','Write a clear service description.','Search'],
   ['action','Inquiry or booking route','review','Quote path needs review in this example','Make the quote request easier to find.','Inquiries'],
   ['share','Social sharing image','review','Missing in this example','Add a branded sharing image.','Visibility']
  ].map(([id,label,status,evidence,action,category]) => ({ id,label,status,evidence,action,category }));
  const c = company({ id:'example-lawn', name:'Juniper Lawn Care', industry:'Home services', area:'Example service area', goal:'Turn seasonal interest into booked lawn-care jobs.', site:'https://juniper.example', notes:'Fictional company. This workspace shows how verified website findings and owner-entered business records fit together.', competitors:'Add manually reviewed competitor names, public URLs, dates, and observations here.', scenario:{visits:400,currentRate:2,targetRate:3,capacity:14,value:120,cost:50,spend:100}, records:{'2026-09':{visits:400,inquiries:24,jobs:8,revenue:960,spend:100,source:'Illustrative sample figures',updatedAt:'2026-09-24T09:00:00Z'}}, channels:[{id:'ch1',month:'2026-09',source:'Google',inquiries:12,customers:4,revenue:480,spend:0},{id:'ch2',month:'2026-09',source:'Instagram',inquiries:8,customers:2,revenue:240,spend:100},{id:'ch3',month:'2026-09',source:'Referral',inquiries:4,customers:2,revenue:240,spend:0}], tasks:[{id:'t1',title:'Make the quote request easier to find',category:'Inquiries',status:'To do',due:'',detail:'Test the service-to-quote journey on a phone.'},{id:'t2',title:'Write a seasonal service description',category:'Search',status:'In progress',due:'',detail:'Explain the service area, offer, and next step.'},{id:'t3',title:'Add a branded sharing image',category:'Visibility',status:'To do',due:'',detail:'Check how the website looks when shared.'}],scans:[{sample:true,scannedAt:'2026-09-24T09:00:00Z',scope:'Illustrative sample review. No real website was scanned.',warnings:[],pages:[{url:'https://juniper.example',title:'Juniper Lawn Care | Local lawn care',fetchMs:0,bytes:0,findings,social:[]}]}] });
  const beauty = company({id:'example-beauty',name:'Luna Beauty Studio',industry:'Beauty & wellness',area:'Example service area',goal:'Make service choices and appointment requests easier.',scenario:{visits:600,currentRate:2,targetRate:3,capacity:20,value:95,cost:30,spend:120},notes:'Fictional beauty business. Try a booking scenario, add an action, or enter sample monthly figures.'});
  return { version:1, selected:c.id, companies:[c,beauty] };
 }
 root.VeyzaModel = { uid, company, scenario, validate, derive, encrypt, decrypt, envelope, sampleData, salt: () => b64(crypto.getRandomValues(new Uint8Array(16))) };
})(typeof window !== 'undefined' ? window : globalThis);
