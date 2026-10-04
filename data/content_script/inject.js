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
    "scroll": {
      "frame": false,
      "method": function () {
        if (config.scroll.frame) return;
        config.scroll.frame = true;
        /*  */
        window.requestAnimationFrame(function () {
          config.scroll.frame = false;
          if (!config.iframe) return;
          const origin = new URL(config.iframe.src).origin;
          const scroll = document.scrollingElement ? document.scrollingElement.scrollTop : 0;
          config.iframe.contentWindow.postMessage({"path": "draw-on-page", "type": "scroll", "scrollY": scroll}, origin);
        });
      },
      "receive": function (e) {
        if (!config.iframe) return;
        if (e.source !== config.iframe.contentWindow) return;
        if (e.data.path !== "draw-on-page") return;
        if (e.data.type !== "ready") return;
        config.scroll.method();
      }
    },
    "keyboard": {
      "relay": function (e) {
        if (!config.iframe) return;
        if (e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
        if (e.key.length !== 1 || e.key.trim() === '') return;
        const active = document.activeElement;
        if (active && /^(input|select|textarea)$/i.test(active.tagName)) return;
        if (active && active.isContentEditable) return;
        /*  */
        const origin = new URL(config.iframe.src).origin;
        config.iframe.contentWindow.postMessage({"path": "draw-on-page", "type": "key", "key": e.key}, origin);
      }
    },
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
        config.iframe.remove();
        config.iframe = null;
      },
      "show": function () {
        config.iframe = document.createElement("iframe");
        config.iframe.setAttribute("class", "draw-on-page-parent-iframe");
        config.iframe.src = chrome.runtime.getURL("data/interface/index.html?page");
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
        /*  */
        document.documentElement.appendChild(config.iframe);
        background.send("icon", {"path": "ON"});
      }
    }
  };
  /*  */
  background.receive("close", config.interface.hide);
  background.receive("print", config.interface.print);
  /*  */
  window.addEventListener("keydown", config.keyboard.relay, true);
  window.addEventListener("message", config.scroll.receive, false);
  window.addEventListener("scroll", config.scroll.method, {passive: true});
}

config.interface.toggle();
