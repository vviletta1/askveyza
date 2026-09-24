'use strict';

// Local examples only. No accounts, tracking pixels, messages, or backend calls.
const growthExamples = {
  salon: { title: 'A salon’s customer picture', rows: [['Google',18,6,720],['Social campaign',12,3,360],['Customer referral',6,2,240],['Unknown',4,1,120]], action: 'Test a service-specific booking page for your next social campaign. Compare completed bookings over an agreed period.' },
  lawn: { title: 'A lawn service’s customer picture', rows: [['Google',22,8,1600],['Social campaign',9,2,400],['Customer referral',11,5,1000],['Unknown',5,1,200]], action: 'Try a clear yard-cleanup page with actual job photos and a short quote form. Review completed jobs alongside travel and labor costs.' },
  cleaning: { title: 'A cleaning company’s customer picture', rows: [['Google',14,5,900],['Social campaign',11,3,540],['Customer referral',9,4,720],['Unknown',6,2,360]], action: 'Test clearer move-out cleaning details and a follow-up process for open quotes. Compare confirmed jobs and the time needed to fulfill them.' }
};
const usd = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 });
const signedUSD = value => (value>0 ? '+' : value<0 ? '−' : '') + usd.format(Math.abs(value));
const shortNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits:1 });

function updateGrowthExample() {
  const example = growthExamples[document.getElementById('industryExample').value];
  if (!example) return;
  document.getElementById('reportTitle').textContent = example.title;
  const body = document.getElementById('sampleRows');
  body.replaceChildren();
  example.rows.forEach(row => {
    const tr = document.createElement('tr');
    row.forEach((value,index) => {
      const cell = document.createElement(index===0 ? 'th' : 'td');
      if(index===0) cell.scope='row';
      cell.textContent = index===3 ? usd.format(value) : String(value);
      tr.appendChild(cell);
    });
    body.appendChild(tr);
  });
  document.getElementById('sampleInquiries').textContent = example.rows.reduce((sum,r)=>sum+r[1],0);
  document.getElementById('sampleCustomers').textContent = example.rows.reduce((sum,r)=>sum+r[2],0);
  document.getElementById('sampleRevenue').textContent = usd.format(example.rows.reduce((sum,r)=>sum+r[3],0));
  document.getElementById('sampleAction').textContent = example.action;
}

function updateScenario() {
  const fields = ['visits','currentRate','targetRate','capacity','jobValue','jobCost','extraSpend'];
  const inputs = fields.map(id => document.getElementById(id));
  const valid = inputs.every(input => input.value.trim()!=='' && input.validity.valid && Number.isFinite(input.valueAsNumber));
  const error = document.getElementById('scenarioError');
  error.hidden=valid;
  if(!valid) {
    ['baselineJobs','scenarioJobs','revenueChange','contributionChange'].forEach(id => document.getElementById(id).textContent='—');
    document.getElementById('capacityNote').textContent='Complete all fields to compare scenarios.';
    return;
  }
  const [visits,currentRate,targetRate,capacity,value,cost,extra] = inputs.map(input => input.valueAsNumber);
  const baseline = Math.min(visits*currentRate/100,capacity);
  const potential = visits*targetRate/100;
  const scenario = Math.min(potential,capacity);
  const difference = scenario-baseline;
  document.getElementById('baselineJobs').textContent=shortNumber.format(baseline);
  document.getElementById('scenarioJobs').textContent=shortNumber.format(scenario);
  document.getElementById('revenueChange').textContent=signedUSD(difference*value);
  document.getElementById('contributionChange').textContent=signedUSD(difference*(value-cost)-extra);
  let note=potential>capacity ? `Your entered rate would imply ${shortNumber.format(potential)} jobs. The scenario is capped at your capacity of ${shortNumber.format(capacity)}.` : `This scenario fits within your capacity of ${shortNumber.format(capacity)} jobs.`;
  if(visits*currentRate/100>capacity) note += ' Your current scenario is also capped at that capacity.';
  if(cost>value) note += ' Your direct cost per job exceeds its revenue.';
  document.getElementById('capacityNote').textContent=note;
}

function inquiry() {
  const value = id => document.getElementById(id).value.trim();
  return 'Hi Violetta,\n\nI would like to discuss a website or growth support for '+value('business')+'.\n\nWebsite or profile: '+(value('website')||'Not provided')+'\nWebsite plan: '+value('planChoice')+'\nMain goal: '+value('goalChoice')+'\nExtra support: '+value('supportChoice')+'\nPayment preference: '+value('paymentChoice')+'\nAdditional details: '+(value('requestNotes')||'None provided')+'\n\nPlease share next steps, the proposed scope, timeline, and any separate costs. I would like to review the proposal before committing.';
}

document.getElementById('industryExample').addEventListener('change',updateGrowthExample);
document.getElementById('scenarioForm').addEventListener('input',updateScenario);
document.getElementById('scenarioForm').addEventListener('submit',event=>event.preventDefault());
document.getElementById('scenarioForm').addEventListener('reset',()=>setTimeout(updateScenario,0));
document.querySelectorAll('[data-interest]').forEach(link => link.addEventListener('click',()=>{
  document.getElementById('supportChoice').value=link.dataset.interest;
}));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
    const menuButton=document.getElementById('menu');
    const navigation=document.getElementById('nav');
    if(navigation.classList.contains('open')){
      navigation.classList.remove('open');
      menuButton.setAttribute('aria-expanded','false');
      menuButton.setAttribute('aria-label','Open menu');
      menuButton.focus();
    }
  }
});
updateGrowthExample();
updateScenario();
