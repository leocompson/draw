if (!background) {
  var background = (function () {
    let tmp = {};
    /*  */
    chrome.runtime.onMessage.addListener(function (request) {
      for (let id in tmp) {
        if (tmp[id] && (typeof tmp[id] === "function")) {
          if (request.path === "background-to-page") {
            if (request.method === id) {
              tmp[id](request.data);
            }
          }
        }
      }
    });
    /*  */
    return {
      "receive": function (id, callback) {
        tmp[id] = callback;
      },
      "send": function (id, data) {
        chrome.runtime.sendMessage({
          "method": id, 
          "data": data,
          "path": "page-to-background"
        }, function () {
          return chrome.runtime.lastError;
        });
      }
    }
  })();
  
  var config = {
    "iframe": null,
    "viewport": {"bound": false, "sync": null},
    "interface": {
      "print": function () {    
        window.print();
      },
      "toggle": function () {
        config.iframe = document.querySelector(".draw-on-page-parent-iframe");
        config.interface[config.iframe ? "hide" : "show"]();
      },
      "hide": function () {
        background.send("icon", {"path": "OFF"});
        config.viewport.sync = null;
        config.iframe.remove();
      },
      "show": function () {
        config.iframe = document.createElement("iframe");
        config.iframe.setAttribute("class", "draw-on-page-parent-iframe");
        config.iframe.setAttribute("allowtransparency", "true");
        config.iframe.src = chrome.runtime.getURL("data/interface/index.html?page&url=" + encodeURIComponent(window.location.href));
        /*  */
        config.iframe.style.top = "0";
        config.iframe.style.left = "0";
        config.iframe.style.margin = "0";
        config.iframe.style.border = "0";
        config.iframe.style.padding = "0";
        config.iframe.style.width = "100%";
        config.iframe.style.height = "100%";
        config.iframe.style.outline = "none";
        config.iframe.style.position = "fixed";
        config.iframe.style.zIndex = "2147483647";
        config.iframe.style.background = "transparent";
        config.iframe.style.backgroundColor = "transparent";
        /* Firefox may create an opaque iframe canvas when the embedded
         * document's color scheme differs from the host element's scheme.
         * Keep both sides explicitly light so page mode stays composited over
         * the document instead of becoming a white full-page layer. */
        config.iframe.style.colorScheme = "light";
        /*  */
        document.documentElement.appendChild(config.iframe);
        /* Keep the extension canvas informed about the host page viewport. The
         * iframe is fixed, so anchored drawings need the host scroll offset to
         * remain attached to their document coordinates. */
        const syncViewport = function () {
          if (config.iframe && config.iframe.contentWindow) {
            config.iframe.contentWindow.postMessage({
              "source": "draw-on-page",
              "type": "viewport",
              "scrollX": window.scrollX || window.pageXOffset || 0,
              "scrollY": window.scrollY || window.pageYOffset || 0
            }, new URL(chrome.runtime.getURL("data/interface/index.html")).origin);
          }
        };
        config.viewport.sync = syncViewport;
        config.iframe.addEventListener("load", syncViewport, false);
        if (!config.viewport.bound) {
          window.addEventListener("scroll", function () {
            if (config.viewport.sync) config.viewport.sync();
          }, {"passive": true});
          window.addEventListener("resize", function () {
            if (config.viewport.sync) config.viewport.sync();
          }, {"passive": true});
          config.viewport.bound = true;
        }
        window.setTimeout(syncViewport, 0);
        background.send("icon", {"path": "ON"});
      }
    }
  };
  /*  */
  background.receive("close", config.interface.hide);
  background.receive("print", config.interface.print);

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!config.iframe || event.source !== config.iframe.contentWindow || !data || data.source !== "draw-on-page") return;
    if (data.type === "close") {
      config.interface.hide();
    } else if (data.type === "print") {
      config.interface.print();
    } else if (data.type === "scroll") {
      window.scrollBy(Number(data.deltaX) || 0, Number(data.deltaY) || 0);
    }
  }, false);
}

config.interface.toggle();
