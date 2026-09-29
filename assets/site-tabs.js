'use strict';

const pageRoutes = {
  home:['.hero','.plain-answer','.strip','#service'],
  how:['#demo-video','#difference','#how','#start-simple'],
  services:['.service-subnav','#growth','#sample-report','#business-twin'],
  pricing:['#pricing','#questions'],
  contact:['#request']
};
const deepRoutePage = {
  top:'home',home:'home',service:'home',how:'how','demo-video':'how',difference:'how','start-simple':'how',
  services:'services',growth:'services','sample-report':'services','business-twin':'services',
  pricing:'pricing',questions:'pricing',contact:'contact',request:'contact'
};
const managedSections = [...new Set(Object.values(pageRoutes).flat().flatMap(selector => [...document.querySelectorAll(selector)]))];
function showSitePage(route, shouldScroll = true) {
  const id = String(route || '').replace(/^#/,'') || 'home';
  const page = deepRoutePage[id] || 'home';
  const visible = new Set(pageRoutes[page].flatMap(selector => [...document.querySelectorAll(selector)]));
  managedSections.forEach(section => { section.hidden = !visible.has(section); });
  if (page === 'services') {
    const panel = ['growth','sample-report','business-twin'].includes(id) ? id : 'growth';
    for (const panelId of ['growth','sample-report','business-twin']) document.getElementById(panelId).hidden = panelId !== panel;
    document.querySelectorAll('[data-service-panel]').forEach(button => {
      const active = button.dataset.servicePanel === panel;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }
  document.querySelectorAll('[data-page-link]').forEach(link => {
    const active = link.dataset.pageLink === page;
    link.classList.toggle('active',active);
    if (active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
  });
  document.body.dataset.currentPage = page;
  if (shouldScroll) requestAnimationFrame(() => {
    const exact = document.getElementById(id);
    const target = exact && !exact.hidden && !exact.classList.contains('route-anchor') ? exact : [...visible][0];
    target?.scrollIntoView({block:'start'});
  });
}
document.addEventListener('click', event => {
  const serviceButton = event.target.closest('[data-service-panel]');
  if (serviceButton) {
    const id = serviceButton.dataset.servicePanel;
    history.pushState(null,'','#'+id);
    showSitePage(id);
    return;
  }
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute('href').slice(1);
  if (!deepRoutePage[id]) return;
  event.preventDefault();
  history.pushState(null,'','#'+id);
  showSitePage(id);
});
addEventListener('popstate',()=>showSitePage(location.hash,false));
showSitePage(location.hash,false);
