(function (root) {
  'use strict';
  const cfg = root.MN_CONFIG || {};
  const events = [];
  let partners = {}, consent = false, loaded = false;
  const safeId = id => typeof id === 'string' && /^[a-z0-9_-]{1,40}$/.test(id);
  function configureRegistry(value) { partners = value && typeof value === 'object' ? value : {}; }
  function buildUrl(id) {
    const p = partners[id];
    if (!safeId(id) || !p || !p.url) return null;
    let url; try { url = new URL(p.url); } catch { return null; }
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (p.allow_tracking !== false) {
      // 모든 주제에 공통으로 적용하며 답변·검색어·진단명·결과 ID·개인 ID는 넣지 않습니다.
      url.searchParams.set('utm_source', cfg.source || 'map_of_the_soul');
      url.searchParams.set('utm_medium', 'referral');
      url.searchParams.set('utm_campaign', cfg.campaign || 'resource_directory_v1');
      url.searchParams.set('utm_content', id);
    }
    return url.toString();
  }
  function measurementReady() { return /^G-[A-Z0-9]+$/.test(cfg.measurementId || ''); }
  function setConsent(enabled) {
    consent = Boolean(enabled) && measurementReady();
    try { root.localStorage.setItem('mn_analytics_consent', consent ? 'yes' : 'no'); } catch {}
    if (consent && !loaded) {
      root.dataLayer = root.dataLayer || [];
      root.gtag = root.gtag || function () { root.dataLayer.push(arguments); };
      root.gtag('consent', 'default', {analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      root.gtag('js', new Date());
      root.gtag('config', cfg.measurementId, {
        send_page_view:false, allow_google_signals:false, allow_ad_personalization_signals:false,
        page_location: root.location.origin + root.location.pathname,
        page_title:'Map of the Soul', page_referrer:''
      });
      const script=root.document.createElement('script');script.async=true;
      script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(cfg.measurementId);
      root.document.head.appendChild(script); loaded=true;
    } else if (loaded && typeof root.gtag === 'function') {
      root.gtag('consent','update',{analytics_storage:consent?'granted':'denied'});
    }
    return consent;
  }
  function record(id, placement) {
    if (!buildUrl(id) || partners[id].no_analytics === true) return;
    // 해결책이나 답변은 전송하지 않고 기관과 버튼 위치만 집계합니다.
    const payload = {provider_id:id,placement:placement==='secondary'?'secondary':'primary'};
    events.push({event:'resource_click',...payload,time:new Date().toISOString()});
    if (events.length>100) events.shift();
    if (consent && measurementReady() && typeof root.gtag==='function') {
      try { root.gtag('event','resource_click',{...payload,transport_type:'beacon'}); } catch {}
    }
    if (typeof root.CustomEvent==='function') root.dispatchEvent(new root.CustomEvent('mn-resource-click',{detail:payload}));
  }
  function attach(link,id,placement) {
    const href=buildUrl(id); if (!href) return false;
    link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';
    link.dataset.providerId=id;
    link.addEventListener('click',e=>{ if(e.button===undefined || e.button===0)record(id,placement); });
    link.addEventListener('auxclick',e=>{if(e.button===1)record(id,placement);});
    return true;
  }
  root.MNReferral = {configureRegistry, buildUrl, attach, record, setConsent, measurementReady,
    diagnostics:()=>({revision:cfg.revision,measurement_configured:measurementReady(),consent,events:events.map(e=>({...e}))})};
})(typeof window === 'undefined' ? globalThis : window);
