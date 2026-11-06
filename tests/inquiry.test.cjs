'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/inquiry');
function response() { return { code: 0, data: null, setHeader(){}, status(code){this.code=code;return this;}, json(data){this.data=data;return this;} }; }
function request(body, extra={}) { return { method:'POST', headers:{host:'www.askveyza.com',origin:'https://www.askveyza.com','x-forwarded-proto':'https','content-type':'application/json','x-forwarded-for':'198.51.100.1'}, body, ...extra }; }
test('Inquiry never claims success without delivery; validates and fixes the email destination', async () => {
 const originalFetch=global.fetch, originalKey=process.env.RESEND_API_KEY, originalSender=process.env.INQUIRY_FROM_EMAIL;
 try {
 delete process.env.RESEND_API_KEY; delete process.env.INQUIRY_FROM_EMAIL;
 let r=response(); await handler({method:'GET'},r); assert.equal(r.data.enabled,false);
 const body={business:'Test business',email:'person@example.com',message:'Please send a website proposal.'};
 r=response(); await handler(request(body),r);assert.equal(r.code,503);
 process.env.RESEND_API_KEY='test-only';process.env.INQUIRY_FROM_EMAIL='forms@askveyza.com';
 let called=0;
 global.fetch=async(url,options)=>{called++;assert.equal(url,'https://api.resend.com/emails');const sent=JSON.parse(options.body);assert.deepEqual(sent.to,['violetta@askveyza.com']);assert.equal(sent.reply_to,body.email);assert.equal(sent.from,'forms@askveyza.com');return {ok:true,json:async()=>({id:'test-accepted'})};};
 for(const invalid of [{...body,email:'x\r\nBcc: bad@example.com'},{...body,business:'x'.repeat(121)},{...body,message:'x'.repeat(4001)},{...body,trap:'bot'}]) {r=response();await handler(request(invalid),r);assert.equal(r.code,400);}
 r=response();await handler(request(body,{headers:{host:'www.askveyza.com',origin:'https://other.example'}}),r);assert.equal(r.code,403);assert.equal(called,0);
 r=response();await handler(request(body),r);assert.equal(r.code,200);assert.equal(r.data.ok,true);assert.equal(called,1);
 global.fetch=async()=>({ok:false,json:async()=>({error:'failed'})});
 r=response();await handler(request(body),r);assert.equal(r.code,502);assert.equal(r.data.ok,undefined);
 } finally {global.fetch=originalFetch;for(const [k,v]of Object.entries({RESEND_API_KEY:originalKey,INQUIRY_FROM_EMAIL:originalSender})) {if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
