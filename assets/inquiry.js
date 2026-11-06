(function () {
  'use strict';
  const form = document.getElementById('requestForm'), button = document.getElementById('sendInquiry'), status = document.getElementById('requestStatus');
  let direct = false, busy = false;
  const emailLink = document.createElement('a');
  emailLink.className = 'btn secondary'; emailLink.textContent = 'Open my email app';
  emailLink.href = 'mailto:violetta@askveyza.com';
  button.after(emailLink);
  function updateEmail() { emailLink.href = 'mailto:violetta@askveyza.com?subject=' + encodeURIComponent('Ask.Veyza website inquiry') + '&body=' + encodeURIComponent(inquiry()); }
  form.addEventListener('input', updateEmail);
  fetch('/api/inquiry', { signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : null).then(data => {
    direct = data?.enabled === true;
    button.textContent = direct ? 'Send my request →' : 'Prepare my email →';
    if (!direct) status.textContent = 'Direct delivery is not available yet. Prepare an email or copy your request below.';
  }).catch(() => { status.textContent = 'Use the email or copy option to send your request.'; });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !form.reportValidity()) return;
    updateEmail();
    if (!direct) { status.textContent = 'Your email app will open. Review and send your request there. Nothing has been sent from this page.'; location.href = emailLink.href; return; }
    busy = true; button.disabled = true; status.textContent = 'Sending your request…';
    try {
      const response = await fetch('/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business: document.getElementById('business').value.trim(), email: document.getElementById('replyEmail').value.trim(), trap: document.getElementById('contactTrap').value, message: inquiry() }), signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      if (!response.ok || data.ok !== true) throw new Error(data.error || 'Delivery could not be confirmed. Please use the email option.');
      status.textContent = 'Your request was accepted for email delivery to Violetta. Thank you!';
    } catch (error) { status.textContent = error.name === 'TimeoutError' ? 'Delivery could not be confirmed. Your entries are still here. Use the email or copy option.' : error.message; }
    finally { busy = false; button.disabled = false; }
  });
})();
