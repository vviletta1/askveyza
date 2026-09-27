'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const dns = require('node:dns').promises;
const https = require('node:https');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const auth = require('../lib/owner-auth');
const scanner = require('../lib/site-scan');
const session = require('../api/owner-session');
const scanHandler = require('../api/scan');
const context = vm.createContext({ crypto: crypto.webcrypto, TextEncoder, TextDecoder, btoa, atob });
vm.runInContext(fs.readFileSync(require.resolve('../assets/owner-model.js'),'utf8'),context);
const M = context.VeyzaModel;
const req = (method='POST') => ({ method, headers:{host:'owner.example.com',origin:'https://owner.example.com'},socket:{remoteAddress:'test'} });
const res = () => ({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}});
test('Owner access fails closed; cookies cannot be forged, extended, or sent cross-origin', async () => {
 const old = process.env.OWNER_ACCESS_KEY; delete process.env.OWNER_ACCESS_KEY;
 try {
  let response=res(); await scanHandler(req(),response); assert.equal(response.code,503);
  process.env.OWNER_ACCESS_KEY=crypto.randomBytes(32).toString('base64url');
  response=res();await scanHandler(req(),response);assert.equal(response.code,401);
  const token=auth.issue(),request=req();request.headers.cookie='veyza_owner='+token;
  assert.equal(auth.authenticated(request),true);
  assert.equal(auth.authenticated(request,Date.now()+5*60*60*1000),false);
  request.headers.cookie='veyza_owner='+token.slice(0,-2)+'xx';assert.equal(auth.authenticated(request),false);
  request.headers.cookie='veyza_owner='+token;request.headers.origin='https://other.example.com';response=res();await scanHandler(request,response);assert.equal(response.code,403);
  const login=req();login.body={password:process.env.OWNER_ACCESS_KEY};response=res();await session(login,response);assert.equal(response.code,200);assert.match(response.headers['Set-Cookie'],/HttpOnly; SameSite=Strict/);assert.match(response.headers['Set-Cookie'],/Secure/);
  delete login.headers.origin;response=res();await session(login,response);assert.equal(response.code,403);
 } finally { if(old===undefined)delete process.env.OWNER_ACCESS_KEY;else process.env.OWNER_ACCESS_KEY=old; }
});
test('Scenario preserves unknowns, zero, capacity limits, and negative contribution', () => {
 const sample={visits:400,currentRate:2,targetRate:3,capacity:14,value:120,cost:50,spend:100};
 assert.equal(M.scenario(sample).contribution,180);assert.equal(M.scenario({...sample,targetRate:4}).target,14);assert.equal(M.scenario({...sample,targetRate:4}).limited,true);
 assert.equal(M.scenario({...sample,capacity:0}).contribution,-100);assert.equal(M.scenario({...sample,visits:''}),null);assert.equal(M.scenario({...sample,currentRate:101}),null);assert.equal(M.scenario({...sample,visits:Infinity}),null);
 assert.equal(M.scenario({...sample,cost:200}).contribution,-420);
});
test('Operating scenario respects whole jobs, team capacity, missing inputs, and all entered costs', () => {
 const s={demand:20,targetDemand:30,hours:40,targetHours:50,hoursPerJob:2,price:120,directCost:50,overhead:300,extraCost:100};
 const r=M.operations(s);assert.equal(r.current.jobs,20);assert.equal(r.target.jobs,25);assert.equal(r.target.unserved,5);assert.equal(r.current.afterCosts,1100);assert.equal(r.target.afterCosts,1350);assert.equal(r.change,250);
 assert.equal(M.operations({...s,targetHours:49}).target.capacity,24);assert.equal(M.operations({...s,targetHours:0}).target.afterCosts,-400);
 assert.equal(M.operations({...s,price:0}).target.revenue,0);assert.equal(M.operations({...s,hoursPerJob:0}),null);assert.equal(M.operations({...s,demand:2.5}),null);assert.equal(M.operations({...s,overhead:''}),null);assert.equal(M.operations({...s,targetHours:Infinity}),null);
});
test('Review comparisons match the same URL and check; older backups gain optional defaults', () => {
 const data=M.sampleData(),c=data.companies[0],comparison=M.compareScans(c.scans[0],c.scans[1]);assert.equal(comparison.compared,8);assert.equal(comparison.changes.length,1);assert.equal(comparison.changes[0].after,'detected');
 const other=JSON.parse(JSON.stringify(c.scans[1]));other.pages[0].url='https://different.example';assert.equal(M.compareScans(c.scans[0],other).compared,0);
 delete c.operations;delete c.profile;M.validate(data);assert.equal(c.operations.demand,'');assert.equal(c.profile.stage,'New prospect');
 c.scans[0].pages[0].contacts=[{invalid:true}];assert.throws(()=>M.validate(data));
});
test('Company backups encrypt, reject wrong keys/tampering, and validate their shape', async () => {
 const data=M.sampleData();M.validate(data);const salt=M.salt(),key=await M.derive('test-only-backup-key-long-enough',salt);const encrypted=await M.encrypt(data,key,salt);
 assert.ok(!JSON.stringify(encrypted).includes('Juniper'));
 const opened=await M.decrypt(encrypted,key);assert.equal(opened.companies[0].name,'Juniper Lawn Care');
 const other=await M.derive('different-test-only-key',salt);await assert.rejects(M.decrypt(encrypted,other));
 const bad={...encrypted,data:encrypted.data.slice(0,-8)+'AAAAAAAA'};await assert.rejects(M.decrypt(bad,key));
 const malformed=M.sampleData();malformed.companies[0].channels=[null];assert.throws(()=>M.validate(malformed));
 const duplicate=M.sampleData();duplicate.companies.push(duplicate.companies[0]);assert.throws(()=>M.validate(duplicate));
});
test('Scanner rejects local/reserved URLs and addresses', () => {
 for(const u of ['http://localhost','http://127.0.0.1','http://2130706433','http://[::1]','http://10.0.0.1','file:///etc/passwd','https://user:pass@example.com','https://example.com:8080','https://x.internal'])assert.throws(()=>scanner.normalize(u),u);
 for(const ip of ['127.0.0.1','10.1.2.3','169.254.169.254','100.64.0.1','172.16.0.2','192.168.1.1','192.0.0.1','198.18.0.1','203.0.113.4','224.0.0.1','::1'])assert.equal(scanner.publicIPv4(ip),false,ip);
 assert.equal(scanner.publicIPv4('93.184.216.34'),true);
});
test('HTML observations identify evidence without invented traffic or SEO scores', () => {
 const result=scanner.analyze({url:'https://business.example.com',html:'<html lang="en"><title>A local business</title><meta content="Useful description" name="description"><meta name="viewport" content="width=device-width"><h1>Local services</h1><img src="decoration.jpg" alt=""><a href="tel:5551234567">Call us</a><form></form></html>',bytes:240,fetchMs:12});
 assert.equal(result.findings.find(f=>f.id==='description').status,'detected');assert.equal(result.findings.find(f=>f.id==='alt').status,'detected');assert.equal(result.findings.find(f=>f.id==='contact').status,'detected');assert.equal(result.findings.find(f=>f.id==='analytics').status,'review');
 assert.equal(result.traffic,undefined);assert.equal(result.score,undefined);assert.equal(result.competitors,undefined);
 assert.equal(result.contacts[0],'tel:5551234567');assert.equal(result.headings[0],'Local services');
 const publicDetails=scanner.analyze({url:'https://example.com',html:'<h2>Garden care</h2><a href="mailto:hello@example.com?subject=Hello">Email</a><script>"<a href=tel:123>fake</a>"</script>',bytes:200,fetchMs:3});assert.deepEqual(publicDetails.contacts,['mailto:hello@example.com']);assert.deepEqual(publicDetails.headings,['Garden care']);
 const empty=scanner.analyze({url:'https://example.com',html:'<div id="app"></div>',bytes:20,fetchMs:5});assert.equal(empty.findings.find(f=>f.id==='title').status,'review');
});
test('Scanner pins validated DNS and rechecks redirects before connecting', async () => {
 const originalLookup=dns.lookup,originalRequest=https.request;let requests=0,lookups=0;
 try {
  dns.lookup=async host=>{lookups++;return [{address:host==='blocked.example.com'?'127.0.0.1':'93.184.216.34',family:4}];};
  https.request=(url,opts,callback)=>{requests++;opts.lookup(url.hostname,{},(error,address,family)=>{assert.equal(error,null);assert.equal(address,'93.184.216.34');assert.equal(family,4);});const request=new EventEmitter();request.end=()=>queueMicrotask(()=>{const response=new Readable({read(){}});response.statusCode=302;response.headers={location:'https://blocked.example.com'};callback(response);});request.destroy=()=>{};return request;};
  await assert.rejects(scanner.fetchPage('https://public.example.com',Date.now()+1000),/supported public website/);assert.equal(requests,1);assert.equal(lookups,2);
 }finally{dns.lookup=originalLookup;https.request=originalRequest;}
});
test('Scanner bounds body size and total request time', async () => {
 const originalLookup=dns.lookup,originalRequest=https.request;
 try {
  dns.lookup=async()=>[{address:'93.184.216.34',family:4}];
  https.request=(_url,_opts,callback)=>{const request=new EventEmitter();request.destroy=()=>{};request.end=()=>queueMicrotask(()=>{const response=Readable.from([Buffer.alloc(1024*1024+1)]);response.statusCode=200;response.headers={'content-type':'text/html'};callback(response);});return request;};
  await assert.rejects(scanner.fetchPage('https://public.example.com',Date.now()+1000),/size limit/);
  https.request=()=>{const request=new EventEmitter();request.destroy=()=>{};request.end=()=>{};return request;};
  await assert.rejects(scanner.fetchPage('https://public.example.com',Date.now()+20),/timed out|time limit/);
 }finally{dns.lookup=originalLookup;https.request=originalRequest;}
});
