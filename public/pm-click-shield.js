(function () {
  "use strict";

  try {
    var script = document.currentScript || (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

    var clientId = script && script.getAttribute("data-client-id");
    var projectKey = script && script.getAttribute("data-project-key");
    if (!clientId || !projectKey) return;

    var scriptUrl = new URL(script.src, window.location.href);
    var apiOrigin = scriptUrl.origin;
    var collectUrl = apiOrigin + "/api/collect";
    var eventsUrl = apiOrigin + "/api/events";
    var startedAt = Date.now();

    function safeRandomId(prefix) {
      try {
        if (window.crypto && window.crypto.randomUUID) return prefix + "_" + window.crypto.randomUUID();
      } catch (error) {}
      return prefix + "_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    function storageGet(storage, key) {
      try {
        return storage.getItem(key);
      } catch (error) {
        return "";
      }
    }

    function storageSet(storage, key, value) {
      try {
        storage.setItem(key, value);
      } catch (error) {}
    }

    var visitorKey = "pm_click_shield_visitor_id";
    var sessionKey = "pm_click_shield_session_id";
    var visitorId = storageGet(window.localStorage, visitorKey);
    if (!visitorId) {
      visitorId = safeRandomId("v");
      storageSet(window.localStorage, visitorKey, visitorId);
    }

    var sessionId = storageGet(window.sessionStorage, sessionKey);
    if (!sessionId) {
      sessionId = safeRandomId("s");
      storageSet(window.sessionStorage, sessionKey, sessionId);
    }

    function getUtm() {
      var params = new URLSearchParams(window.location.search || "");
      return {
        utm_source: params.get("utm_source") || "",
        utm_medium: params.get("utm_medium") || "",
        utm_campaign: params.get("utm_campaign") || "",
        utm_term: params.get("utm_term") || "",
        utm_content: params.get("utm_content") || ""
      };
    }

    function basePayload(extra) {
      return Object.assign({
        client_id: clientId,
        project_key: projectKey,
        visitor_id: visitorId,
        session_id: sessionId,
        page_url: window.location.href,
        referrer: document.referrer || "",
        user_agent: window.navigator ? window.navigator.userAgent : "",
        page_count: 1
      }, getUtm(), extra || {});
    }

    function post(url, payload, preferBeacon) {
      var body = "";
      try {
        body = JSON.stringify(payload);
      } catch (error) {
        return;
      }

      try {
        if (preferBeacon && window.navigator && navigator.sendBeacon) {
          var blob = new Blob([body], { type: "application/json" });
          if (navigator.sendBeacon(url, blob)) return;
        }
      } catch (error) {}

      try {
        window.fetch(url, {
          method: "POST",
          mode: "cors",
          credentials: "omit",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: body
        }).catch(function (error) {
          if (window.console && console.error) console.error("[pm-click-shield] collect failed", error);
        });
      } catch (error) {
        if (window.console && console.error) console.error("[pm-click-shield] collect failed", error);
      }
    }

    post(collectUrl, basePayload({ event_type: "page_load" }), false);

    var sentFinal = false;
    function sendStayTime(eventType) {
      if (sentFinal && eventType !== "conversion") return;
      if (eventType !== "conversion") sentFinal = true;
      post(eventsUrl, basePayload({
        event_type: eventType || "stay_time",
        stay_time: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
        duration_ms: Math.max(0, Date.now() - startedAt)
      }), true);
    }

    window.addEventListener("pagehide", function () {
      sendStayTime("stay_time");
    });
    window.addEventListener("beforeunload", function () {
      sendStayTime("stay_time");
    });

    window.pmClickShield = window.pmClickShield || {};
    window.pmClickShield.trackConversion = function (eventName, data) {
      post(eventsUrl, basePayload({
        event_type: eventName || "conversion",
        stay_time: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
        duration_ms: Math.max(0, Date.now() - startedAt),
        conversion_data: data || {}
      }), false);
    };
  } catch (error) {
    if (window.console && console.error) console.error("[pm-click-shield] init failed", error);
  }
})();
