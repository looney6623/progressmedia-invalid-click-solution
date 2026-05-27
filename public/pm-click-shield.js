(function () {
  var currentScript = document.currentScript;
  var clientId = currentScript && currentScript.getAttribute("data-client-id");
  var projectKey = currentScript && currentScript.getAttribute("data-project-key");
  if (!clientId || !projectKey) return;

  var storageKey = "pm_click_shield_visitor_id";
  var visitorId = localStorage.getItem(storageKey);
  if (!visitorId) {
    visitorId = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(storageKey, visitorId);
  }

  var sessionId = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  var startedAt = Date.now();

  function post(path, payload) {
    try {
      var body = JSON.stringify(Object.assign({
        clientId: clientId,
        projectKey: projectKey,
        visitorId: visitorId,
        sessionId: sessionId,
        url: location.href,
        referrer: document.referrer || ""
      }, payload || {}));

      if (navigator.sendBeacon) {
        navigator.sendBeacon(path, new Blob([body], { type: "application/json" }));
        return;
      }

      fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true
      }).catch(function () {});
    } catch (error) {
      // Tracking must never break the advertiser site.
    }
  }

  post("/api/collect", { eventType: "page_load" });

  function sendEngagement(eventType) {
    post("/api/events", {
      eventType: eventType,
      durationMs: Math.max(0, Date.now() - startedAt)
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") sendEngagement("visibility_hidden");
  });
  window.addEventListener("pagehide", function () {
    sendEngagement("pagehide");
  });

  window.pmClickShield = window.pmClickShield || {};
  window.pmClickShield.trackConversion = function (eventName, data) {
    post("/api/events", {
      eventType: eventName || "conversion",
      durationMs: Math.max(0, Date.now() - startedAt),
      data: data || {}
    });
  };
})();
