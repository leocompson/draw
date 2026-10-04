var background = {
  "port": null,
  "message": {},
  "receive": function (id, callback) {
    if (id) {
      background.message[id] = callback;
    }
  },
  "connect": function (port) {
    chrome.runtime.onMessage.addListener(background.listener); 
    /*  */
    if (port) {
      background.port = port;
      background.port.onMessage.addListener(background.listener);
      background.port.onDisconnect.addListener(function () {
        background.port = null;
      });
    }
  },
  "post": function (id, data) {
    if (id) {
      if (background.port) {
        background.port.postMessage({
          "method": id,
          "data": data,
          "port": background.port.name,
          "path": "interface-to-background"
        });
      }
    }
  },
  "send": function (id, data) {
    if (id) {
      if (background.port) {
        if (background.port.name !== "webapp") {
          chrome.runtime.sendMessage({
            "method": id,
            "data": data,
            "path": "interface-to-background"
          }, function () {
            return chrome.runtime.lastError;
          });
        }
      }
    }
  },
  "listener": function (e) {
    if (e) {
      for (let id in background.message) {
        if (background.message[id]) {
          if ((typeof background.message[id]) === "function") {
            if (e.path === "background-to-interface") {
              if (e.method === id) {
                background.message[id](e.data);
              }
            }
          }
        }
      }
    }
  }
};

var config  = {
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "print": function () {
    if (config.port.name === "page") {
      background.send("print");
    } else {
      window.print();
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      if (config.port.name === "win") {
        if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
        config.resize.timeout = window.setTimeout(async function () {
          const current = await chrome.windows.getCurrent();
          /*  */
          config.storage.write("interface.size", {
            "top": current.top,
            "left": current.left,
            "width": current.width,
            "height": current.height
          });
        }, 1000);
      }
    }
  },
  "controls": {
    "hide": function () {
      const show = document.querySelector("#show");
      const target = document.querySelector(".controls");
      /*  */
      show.title = "Show Controls";
      target.style.display = "none";
      config.storage.write("controls.display", target.style.display);
      config.draw.brushing.controls.popup.setAttribute("page", "draw");
      
    },
    "show": function () {
      const show = document.querySelector("#show");
      const target = document.querySelector(".controls");
      /*  */
      target.style.display = target.style.display === "none" ? "block" : "none";
      show.title = target.style.display === "block" ? "Hide Controls" : "Show Controls";
      config.storage.write("controls.display", target.style.display);
    }
  },
  "settings": {
    "attach": function () {
      const options = document.getElementById("options");
      const target = document.querySelector(".options-page");
      const scroll = document.getElementById("feature-scroll");
      const buttons = document.querySelectorAll(".options-page .setting-row input[type='checkbox']");
      /*  */
      [...buttons].forEach(function (elem) {
        const id = "feature." + elem.id.replace("feature-", '');
        const option = elem.closest(".setting-row").querySelector(".title .name");
        const feature = config.storage.read(id);
        const fallback = elem.checked;
        /*  */
        elem.checked = feature !== undefined ? feature : fallback;
        elem.addEventListener("change", function () {
          config.storage.write(id, this.checked);
          config.settings.apply();
        }, false);
        /*  */
        option.addEventListener("click", function () {
          elem.checked = !elem.checked;
          elem.dispatchEvent(new Event("change"));
        }, false);
      });
      /*  */
      scroll.addEventListener("change", function () {
        if (!this.checked) {
          if (config.draw.canvas) config.draw.canvas.absolutePan({x: 0, y: 0});
          return;
        }
        config.draw.scroll.sync();
      }, false);
      /*  */
      const panel = config.draw.brushing.controls.popup;
      const launch = document.getElementById("shortcuts");
      const back = document.getElementById("shortcuts-close");
      const keys = document.querySelectorAll(".options-page[data-page='shortcuts'] .setting-row input");
      /*  */
      back.addEventListener("click", function () {config.settings.toggle("draw")}, false);
      launch.addEventListener("click", function () {config.settings.toggle("shortcuts")}, false);
      /*  */
      [...keys].forEach(function (elem) {
        const action = elem.id.replace("key-", '');
        const stored = config.storage.read("shortcut." + action);
        elem.value = stored !== undefined ? stored : '';
        elem.setAttribute("placeholder", config.shortcuts.defaults[action]);
        /*  */
        config.shortcuts.capture(elem, action);
      });
      /*  */
      options.addEventListener("click", function () {config.settings.toggle()}, false);
      /*  */
      config.settings.apply();
    },
    "toggle": function (page) {
      const panel = config.draw.brushing.controls.popup;
      const state = panel.getAttribute("page") || "draw";
      const target = state === page ? "draw" : (page || (state === "options" ? "draw" : "options"));
      /*  */
      window.clearTimeout(config.settings.timeout);
      config.settings.timeout = null;
      /*  */
      if (target !== "draw" && state === "draw") {
        config.settings.timeout = window.setTimeout(function () {config.settings.pin(target)}, 70);
      } else {
        panel.setAttribute("page", target);
      }
      /*  */
      if (target === "draw") panel.style.height = '';
    },
    "timeout": null,
    "pin": function (target) {
      const panel = config.draw.brushing.controls.popup;
      const state = panel.getAttribute("page") || "draw";
      /*  */
      if (target !== "draw" && state === "draw") {
        const style = getComputedStyle(panel);
        const extras = panel.offsetHeight - panel.clientHeight + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        const height = panel.offsetHeight - extras;
        if (height > 0) panel.style.height = height + "px";
        panel.setAttribute("page", target);
        /*  */
        config.settings.timeout = window.setTimeout(function () {config.settings.repin(height)}, 380);
      }
    },
    "repin": function (pinned) {
      const panel = config.draw.brushing.controls.popup;
      const state = panel.getAttribute("page") || "draw";
      /*  */
      if (pinned && state !== "draw" && panel.style.height) {
        const page = document.querySelector(".controls > .draw-page");
        const display = page.style.display;
        /*  */
        page.style.display = "block";
        const height = page.offsetHeight;
        page.style.display = display;
        /*  */
        if (height > 0 && Math.abs(height - pinned) >= 1) panel.style.height = height + "px";
      }
      /*  */
      config.settings.timeout = null;
    },
    "visible": function () {
      const panel = config.draw.brushing.controls.popup;
      return panel.getAttribute("page") === "options";
    },
    "on": function (name) {
      const value = config.storage.read("feature." + name);
      if (value !== undefined) return value;
      return name === "autosave";
    },
    "apply": function () {
      const page = config.port.name === "page";
      const visibility = {
        "draw-text-tool": config.settings.on("text"),
        "draw-eraser-tool": config.settings.on("eraser"),
        "draw-screenshot-tool": page && config.settings.on("screenshot"),
        "shortcuts": config.settings.on("shortcuts")
      };
      /*  */
      for (let id in visibility) {
        const button = document.getElementById(id);
        if (button) button.style.display = visibility[id] ? '' : "none";
      }
      /*  */
      const dead = config.draw.mode === "text" && !config.settings.on("text") || config.draw.mode === "eraser" && !config.settings.on("eraser");
      if (dead) {
        const brush = document.getElementById(config.storage.read("brushing.selector") !== undefined ? config.storage.read("brushing.selector") : "Pencil");
        if (brush) brush.click();
      }
      /*  */
      const panel = config.draw.brushing.controls.popup;
      const orphan = !config.settings.on("shortcuts") && panel.getAttribute("page") === "shortcuts";
      if (orphan) config.settings.toggle("shortcuts");
      /*  */
      config.options.show(config.draw.mode);
    }
  },
  "options": {
    "show": function (mode) {
      const root = document.documentElement;
      const simple = config.settings.on("simplify");
      const groups = document.querySelectorAll(".tool-group");
      const colors = document.querySelectorAll("[data-color]");
      const list = (this.colors[mode] || []).concat(this.colors.all);
      /*  */
      if (simple) root.setAttribute("simplified", "true");
      else root.removeAttribute("simplified");
      /*  */
      [...groups].forEach(function (group) {
        const name = group.getAttribute("data-tool");
        const enabled = name === "brushing" || name === "shape" || config.settings.on(name);
        const show = name === mode;
        if (!enabled) {
          group.setAttribute("removed", '');
          group.querySelectorAll("input, select, button").forEach(function (input) {input.disabled = true});
          return;
        }
        group.removeAttribute("removed");
        const inputs = group.querySelectorAll("input, select, button");
        [...inputs].forEach(function (input) {input.disabled = !show});
        if (show) group.setAttribute("shown", '');
        else group.removeAttribute("shown");
      });
      /*  */
      [...colors].forEach(function (elem) {
        const name = elem.getAttribute("data-color");
        const enabled = name !== "text-color" || config.settings.on("text");
        const show = enabled && list.indexOf(name) !== -1;
        /*  */
        if (!enabled) elem.setAttribute("removed", '');
        else elem.removeAttribute("removed");
        /*  */
        if (elem.tagName === "INPUT") elem.disabled = !show;
        /*  */
        if (show) elem.setAttribute("shown", '');
        else elem.removeAttribute("shown");
      });
      /*  */
      const picker = config.draw.background.color;
      if (picker) {
        const stored = config.storage.read(mode === "text" ? "text.highlight" : "background.color");
        picker.value = stored !== undefined ? stored : "#ffffff";
      }
    },
    "colors": {
      "move": [],
      "eraser": [],
      "all": ["background"],
      "text": ["text-color"],
      "shape": ["fill", "stroke"],
      "brushing": ["line", "shadow"]
    }
  },
  "storage": {
    "local": {},
    "read": function (id) {
      return config.storage.local[id];
    },
    "load": function (callback) {
      chrome.storage.local.get(null, function (e) {
        config.storage.local = e;
        callback();
      });
    },
    "write": function (id, data) {
      if (id) {
        if (data !== '' && data !== null && data !== undefined) {
          let tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp);
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id);
        }
      }
    }
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      const context = document.documentElement.getAttribute("context");
      /*  */
      if (chrome.runtime) {
        if (chrome.runtime.connect) {
          if (context !== config.port.name) {
            if (document.location.search === "?tab") config.port.name = "tab";
            if (document.location.search === "?win") config.port.name = "win";
            if (document.location.search === "?page") config.port.name = "page";
            if (document.location.search === "?popup") config.port.name = "popup";
            /*  */
            if (config.port.name === "popup") {
              const size = config.storage.local["interface.size"];
              document.body.style.width = (size ? size.width : 800) + "px";
              document.body.style.height = (size ? size.height : 590) + "px";
              document.documentElement.setAttribute("context", "extension");
            }
            /*  */
            background.connect(chrome.runtime.connect({"name": config.port.name}));
          }
        }
      }
      /*  */
      document.documentElement.setAttribute("context", config.port.name);
    }
  },
  "render": {
    "selected": function () {
      if (config.draw.mode === "brushing") {
        const brushing = config.draw.brushing.selector.getAttribute("selected");
        if (brushing) {
          config.draw.brushing.selector.querySelector('#' + brushing).setAttribute("selected", '');
        }
      } else {
        const shape = config.draw.shape.selector.getAttribute("selected");
        if (shape) {
          config.draw.shape.selector.querySelector('#' + shape).setAttribute("selected", '');
        }
      }
    },
    "interface": function () {
      config.draw.mode = config.storage.read("draw.mode") !== undefined ? config.storage.read("draw.mode") : "brushing";
      if (config.draw.mode !== "brushing" && config.draw.mode !== "shape") config.draw.mode = "brushing";
      /*  */
      config.options.show(config.draw.mode);
      /*  */
      config.draw.ui.size.value = config.storage.read("ui.size") !== undefined ? config.storage.read("ui.size") : 1;
      config.draw.text.size.value = config.storage.read("text.size") !== undefined ? config.storage.read("text.size") : 20;
      config.draw.theme.dark = config.storage.read("theme.dark") !== undefined ? config.storage.read("theme.dark") : false;
      config.draw.theme.color = config.storage.read("theme.color") !== undefined ? config.storage.read("theme.color") : "#0075ff";
      config.draw.text.color.value = config.storage.read("text.color") !== undefined ? config.storage.read("text.color") : "#000000";
      config.draw.brushing.line.width.value = config.storage.read("line.width") !== undefined ? config.storage.read("line.width") : 20;
      config.draw.shape.stroke.width.value = config.storage.read("stroke.width") !== undefined ? config.storage.read("stroke.width") : 5;
      config.draw.shape.fill.opacity.value = config.storage.read("fill.opacity") !== undefined ? config.storage.read("fill.opacity") : 1;
      config.draw.shape.fill.color.value = config.storage.read("fill.color") !== undefined ? config.storage.read("fill.color") : "#7f07cf";
      config.draw.brushing.shadow.width.value = config.storage.read("shadow.width") !== undefined ? config.storage.read("shadow.width") : 0;
      config.draw.brushing.line.opacity.value = config.storage.read("line.opacity") !== undefined ? config.storage.read("line.opacity") : 1;
      config.draw.brushing.line.color.value = config.storage.read("line.color") !== undefined ? config.storage.read("line.color") : "#00e61b";
      config.draw.brushing.shadow.offset.value = config.storage.read("shadow.offset") !== undefined ? config.storage.read("shadow.offset") : 0;
      config.draw.shape.stroke.color.value = config.storage.read("stroke.color") !== undefined ? config.storage.read("stroke.color") : "#c7c7c7";
      config.draw.text.transparency.value = config.storage.read("text.transparency") !== undefined ? config.storage.read("text.transparency") : 0;
      config.draw.brushing.shadow.color.value = config.storage.read("shadow.color") !== undefined ? config.storage.read("shadow.color") : "#777777";
      config.draw.text.family.value = config.storage.read("text.family") !== undefined ? config.storage.read("text.family") : "system-ui, sans-serif";
      config.draw.background.color.value = config.storage.read("background.color") !== undefined ? config.storage.read("background.color") : "#ffffff";
      config.draw.brushing.controls.display = config.storage.read("controls.display") !== undefined ? config.storage.read("controls.display") : "block";
      config.draw.shape.selector.setAttribute("selected", config.storage.read("shape.selector") !== undefined ? config.storage.read("shape.selector") : "Circle");
      config.draw.brushing.selector.setAttribute("selected", config.storage.read("brushing.selector") !== undefined ? config.storage.read("brushing.selector") : "Pencil");
      config.draw.ui.family.value = config.storage.read("ui.font") !== undefined ? config.storage.read("ui.font") : "monaco, 'andale mono', 'lucida console', 'courier new', monospace";
      /*  */
      document.documentElement.style.setProperty("--ui-scale", config.draw.ui.size.value);
      document.documentElement.style.setProperty("--ui-font", config.draw.ui.family.value);
      config.draw.text.size.previousSibling.textContent = Number(config.draw.text.size.value).toFixed(0);
      config.draw.text.transparency.previousSibling.textContent = Number(config.draw.text.transparency.value).toFixed(0);
      config.draw.shape.stroke.width.previousSibling.textContent = Number(config.draw.shape.stroke.width.value).toFixed(1);
      config.draw.shape.fill.opacity.previousSibling.textContent = Number(config.draw.shape.fill.opacity.value).toFixed(2);
      config.draw.brushing.line.width.previousSibling.textContent = Number(config.draw.brushing.line.width.value).toFixed(1);
      config.draw.brushing.shadow.width.previousSibling.textContent = Number(config.draw.brushing.shadow.width.value).toFixed(1);
      config.draw.brushing.line.opacity.previousSibling.textContent = Number(config.draw.brushing.line.opacity.value).toFixed(2);
      config.draw.brushing.shadow.offset.previousSibling.textContent = Number(config.draw.brushing.shadow.offset.value).toFixed(1);
      /*  */
      if (config.storage.read("text.bold")) config.draw.text.bold.setAttribute("selected", '');
      else config.draw.text.bold.removeAttribute("selected");
      /*  */
      if (config.storage.read("text.italic")) config.draw.text.italic.setAttribute("selected", '');
      else config.draw.text.italic.removeAttribute("selected");
      /*  */
      //config.draw.brushing.controls.popup.style.top = config.storage.read("controls.top") !== undefined ? config.storage.read("controls.top") : "100px";
      //config.draw.brushing.controls.popup.style.left = config.storage.read("controls.left") !== undefined ? config.storage.read("controls.left") : "100px";
      /*  */
      const root = document.documentElement;
      const show = document.getElementById("show");
      const color = document.getElementById("theme-color");
      const computed = window.getComputedStyle(document.body);
      const width = computed ? parseInt(computed.width) : 800;
      /*  */
      config.draw.options.width = config.draw.options.height = width;
      config.draw.options.backgroundColor = config.port.name === "page" ? "transparent" : config.draw.background.color.value;
      /*  */      
      config.draw.canvas = new fabric.Canvas(config.draw.id, config.draw.options);
      config.draw.canvas.on("object:modified", config.listeners.object.updated);
      config.draw.canvas.on("object:added", config.listeners.object.updated);
      config.draw.canvas.on("mouse:wheel", config.listeners.mouse.wheel);
      config.draw.canvas.on("mouse:move", config.listeners.mouse.move);
      config.draw.canvas.on("mouse:down", config.listeners.mouse.down);
      config.draw.canvas.on("mouse:up", config.listeners.mouse.up);
      /*  */
      if (config.port.name === "page") {
        window.addEventListener("message", config.draw.scroll.receive, false);
        config.draw.scroll.sync();
      }
      window.addEventListener("keydown", config.shortcuts.listen, false);
      /*  */
      color.value = config.draw.theme.color;
      window.setTimeout(config.render.selected, 300);
      root.setAttribute("theme-dark", config.draw.theme.dark);
      root.style.setProperty("--theme-color", config.draw.theme.color);
      config.draw.canvas.isDrawingMode = config.draw.mode === "brushing";
      config.draw.brushing.controls.popup.style.display = config.draw.brushing.controls.display;
      show.title = config.draw.brushing.controls.display === "block" ? "Hide Controls" : "Show Controls";
      /*  */
      const last = config.storage.read("last.draw");
      config.draw.history = [JSON.stringify(config.draw.canvas)];
      if (last) {
        config.draw.canvas.loadFromJSON(JSON.parse(last)).then(function (canvas) {
          if (config.port.name === "page") canvas.backgroundColor = "transparent";
          /*  */
          canvas.renderAll();
        });
      }
    }
  },
  "shortcuts": {
    "defaults": {
      "copy": '',
      "text": '',
      "move": "m",
      "undo": "z",
      "redo": "y",
      "paste": '',
      "zoomin": '',
      "panel": "h",
      "pencil": "p",
      "eraser": "e",
      "zoomout": '',
      "download": ''
    },
    "actions": {
      "undo": function () {config.draw.undo()},
      "redo": function () {config.draw.redo()},
      "copy": function () {config.draw.copy()},
      "paste": function () {config.draw.paste()},
      "zoomin": function () {config.draw.zoom.in()},
      "panel": function () {config.controls.show()},
      "zoomout": function () {config.draw.zoom.out()},
      "move": function () {const button = document.getElementById("Move"); if (button) button.click()},
      "pencil": function () {const button = document.getElementById("Pencil"); if (button) button.click()},
      "download": function () {const button = document.getElementById("save"); if (button) button.click()},
      "text": function () {const button = document.getElementById("draw-text-tool"); if (button && config.settings.on("text")) button.click()},
      "eraser": function () {const button = document.getElementById("draw-eraser-tool"); if (button && config.settings.on("eraser")) button.click()}
    },
    "code": function (e) {
      if (e.repeat) return null;
      if (e.key.length !== 1 || e.key.trim() === '') return null;
      return (e.ctrlKey ? "ctrl+" : '') + (e.altKey ? "alt+" : '') + (e.shiftKey ? "shift+" : '') + e.key.toLowerCase();
    },
    "listen": function (e) {
      const code = config.shortcuts.code(e);
      /*  */
      if (code === null) return;
      if (config.shortcuts.dispatch(code)) e.preventDefault();
    },
    "dispatch": function (key) {
      if (!config.settings.on("shortcuts")) return false;
      if (key.length !== 1 || key.trim() === '') return false;
      /*  */
      const active = config.draw.canvas ? config.draw.canvas.getActiveObject() : null;
      if (active && active.isEditing) return false;
      const focused = document.activeElement;
      if (focused && /^(input|select|textarea|button)$/i.test(focused.tagName)) return false;
      /*  */
      const map = {};
      for (const name in this.defaults) {
        const stored = config.storage.read("shortcut." + name);
        map[stored !== undefined ? stored : this.defaults[name]] = name;
      }
      const action = this.actions[map[key.toLowerCase()]];
      if (action) {
        action();
        return true;
      }
      return false;
    },
    "capture": function (elem, action) {
      elem.addEventListener("keydown", function (e) {
        e.preventDefault();
        e.stopPropagation();
        /*  */
        if (e.key === "Escape") {
          elem.value = '';
          config.storage.write("shortcut." + action, '');
          return;
        }
        /*  */
        const code = config.shortcuts.code(e);
        if (code === null) return;
        /*  */
        elem.value = code;
        config.storage.write("shortcut." + action, code);
      });
    }
  },
  "draw": {
    "ui": {},
    "mode": '',
    "screen": 0,
    "theme": {},
    "history": [],
    "canvas": null,
    "background": {},
    "clipboard": null,
    "keyboard": {"code": null},
    "screenshot": {"busy": false},
    "scroll": {
      "sync": function () {
        window.parent.postMessage({"path": "draw-on-page", "type": "ready"}, "*");
      },
      "receive": function (e) {
        if (config.port.name !== "page") return;
        if (e.source !== window.parent) return;
        if (!e.data || e.data.path !== "draw-on-page") return;
        if (e.data.type === "key") {
          config.shortcuts.dispatch(e.data.key);
          return;
        }
        if (e.data.type !== "scroll" || !config.settings.on("scroll")) return;
        if (!config.draw.canvas) return;
        config.draw.canvas.absolutePan({x: 0, y: Number(e.data.scrollY) || 0});
      }
    },
    "text": {
      "mix": function () {
        const alpha = Math.min(100, Math.max(0, Number(this.transparency.value) || 0)) / 100;
        if (!alpha) return "";
        /*  */
        const hex = config.draw.background.color.value;
        const color = /^#?[0-9a-f]{6}$/i.test(hex) ? hex.replace("#", '') : "ffffff";
        /*  */
        const red = parseInt(color.slice(0, 2), 16);
        const blue = parseInt(color.slice(4, 6), 16);
        const green = parseInt(color.slice(2, 4), 16);
        /*  */
        return "rgba(" + red + ", " + green + ", " + blue + ", " + alpha + ")";
      },
      "apply": function () {
        const active = config.draw.canvas ? config.draw.canvas.getActiveObject() : null;
        if (active && active.isType("IText", "i-text")) {
          active.set({
            "fill": this.color.value,
            "backgroundColor": this.mix(),
            "fontFamily": this.family.value,
            "fontSize": parseInt(this.size.value, 10) || 20,
            "fontWeight": this.bold.hasAttribute("selected") ? "bold" : "normal",
            "fontStyle": this.italic.hasAttribute("selected") ? "italic" : "normal"
          });
          /*  */
          config.draw.canvas.renderAll();
        }
      }
    },
    "id": "draw-on-page-canvas",
    "options": {"width": 800, "height": 800},
    "save": function () {
      const index = config.draw.history.length - 1 - config.draw.screen;
      const current = config.draw.history[index];
      if (current) config.storage.write("last.draw", current);
    },
    "copy": function () {
      const active = config.draw.canvas.getActiveObject();
      if (active) {
        active.clone().then(function (cloned) {
          config.draw.clipboard = cloned;
        });
      }
    },
    "undo": function () {
      const index = config.draw.history.length - 1 - config.draw.screen;
      if (index > 0) {
        config.draw.screen += 1;
        config.draw.canvas.clear();
        config.draw.canvas.renderAll();
        config.draw.canvas.loadFromJSON(config.draw.history[index - 1]).then(function (canvas) {canvas.renderAll()});
      }
    },
    "redo": function () {
      if (config.draw.screen > 0) {
        config.draw.screen -= 1;
        const index = config.draw.history.length - 1 - config.draw.screen;
        config.draw.canvas.clear();
        config.draw.canvas.renderAll();
        config.draw.canvas.loadFromJSON(config.draw.history[index]).then(function (canvas) {canvas.renderAll()});
      }
    },
    "remove": {
      "active": {
        "objects": function () {
          config.draw.canvas.getActiveObjects().forEach(function (object) {
            config.draw.canvas.remove(object);
          });
        }
      }
    },
    "zoom": {
      "in": function () {
        let zoom = config.draw.canvas.getZoom();
        zoom = zoom + 0.01;
        if (zoom > 20) zoom = 20;
        config.draw.canvas.setZoom(zoom);
      },
      "out": function () {
        let zoom = config.draw.canvas.getZoom();
        zoom = zoom - 0.01;
        if (zoom < 0.01) zoom = 0.01;
        config.draw.canvas.setZoom(zoom);
      }
    },
    "convert": {
      "to": {
        "hex": function (opacity) {
          let value = Math.round(opacity * 255).toString(16);
          if (value.length === 1) value = "0" + value;
          return value;
        },
        "png": function () {
          const a = document.createElement('a');
          const src = config.draw.canvas.toDataURL({"format": "png", "quality": 1.00});
          a.download = "drawing.png";
          a.style.display = "none";
          a.href = src;
          a.click();
          window.setTimeout(function () {a.remove()}, 1000);
        }
      }
    },
    "paste": function () {
      if (!config.draw.clipboard) return;
      config.draw.clipboard.clone().then(function (cloned) {
        config.draw.canvas.discardActiveObject();
        cloned.set({
          "evented": true, 
          "top": cloned.top + 50, 
          "left": cloned.left + 50
        });
        /*  */
        if (cloned.isType("activeSelection", "ActiveSelection")) {
          cloned.canvas = config.draw.canvas;
          cloned.forEachObject(function (e) {config.draw.canvas.add(e)});
          cloned.setCoords();
        } else {
          config.draw.canvas.add(cloned);
        }
        /*  */
        config.draw.canvas.setActiveObject(cloned);
        config.draw.canvas.renderAll();
        config.listeners.object.updated();
      });
    },
    "shape": {
      "fill": {},
      "line": {},
      "drag": {},
      "stroke": {},
      "label": null,
      "selector": null,
      "generate": {
        "regular": {
          "polygon": {
            "points": function (n, r) {
              let cx = r;
              let cy = r;
              let points = [];
              let sweep = Math.PI * 2 / n;
              /*  */
              for (let i = 0; i < n; i++) {
                let x = cx + r * Math.cos(i * sweep);
                let y = cy + r * Math.sin(i * sweep);
                points.push({'x': x, 'y': y});
              }
              /*  */
              return(points);
            }
          }
        }
      },
      "create": function (value, x, y) {
        const base = {
          "top": y,
          "left": x,
          "originX": "center",
          "originY": "center",
          "fill": config.draw.shape.fill.color.value,
          "stroke": config.draw.shape.stroke.color.value,
          "opacity": Number(config.draw.shape.fill.opacity.value),
          "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
        };
        /*  */
        if (value === "Circle") return new fabric.Circle({...base, "radius": 1});
        if (value === "Rect") return new fabric.Rect({...base, "width": 1, "height": 1});
        if (value === "Triangle") return new fabric.Triangle({...base, "width": 1, "height": 1});
        if (value === "Hexagon") return new fabric.Polygon(config.draw.shape.generate.regular.polygon.points(6, 1), base);
        if (value === "Octagon") return new fabric.Polygon(config.draw.shape.generate.regular.polygon.points(8, 1), base);
        /*  */
        return null;
      }
    },
    "brushing": {
      "line": {},
      "shadow": {},
      "label": null,
      "controls": {},
      "selector": null,
      "options": function (e) {
        return {
          "offsetX": 0,
          "offsetY": 0,
          "affectStroke": true,
          "color": e.color.value,
          "blur": parseInt(e.width.value, 10) || 0
        }
      },
      "update": function () {
        if (config.draw.canvas) {
          const value = config.draw.brushing.selector.getAttribute("selected");
          if (value) {
            const key = value + "Brush";
            config.draw.canvas.freeDrawingBrush = new fabric[key](config.draw.canvas, {"originX": "center", "originY": "center"});
            if (config.draw.canvas.freeDrawingBrush) {
              const opacity = config.draw.convert.to.hex(config.draw.brushing.line.opacity.value);
              /*  */
              config.draw.canvas.freeDrawingBrush.color = config.draw.brushing.line.color.value + opacity;
              config.draw.canvas.freeDrawingBrush.width = parseInt(config.draw.brushing.line.width.value, 10) || 1;
              config.draw.canvas.freeDrawingBrush.shadow = new fabric.Shadow(config.draw.brushing.options(config.draw.brushing.shadow));
            }
          }
        }
      }
    },
    "action": {
      "rotate": function (code) {
        const active = config.draw.canvas.getActiveObject();
        if (active) {
          const degrees = code === 219 ? -1 : +1;
          active.rotate(active.angle + degrees);
          /*  */
          active.setCoords();
          config.draw.canvas.renderAll();
          config.listeners.object.updated();
        }
      },
      "move": function (dir, shift) {
        const active = config.draw.canvas.getActiveObject();
        if (active) {
          switch (dir) {
            case 38: active.top = active.top - (shift ? 10 : 1); break;
            case 40: active.top = active.top + (shift ? 10 : 1); break;
            case 37: active.left = active.left - (shift ? 10 : 1); break;
            case 39: active.left = active.left + (shift ? 10 : 1); break;
          }
          /*  */
          active.setCoords();
          config.draw.canvas.renderAll();
          config.listeners.object.updated();
        }
      },
      "resize": function (code) {
        const active = config.draw.canvas.getActiveObject();
        if (active) {
          const center = active.getCenterPoint();
          const scale = (code === 188 ? 0.99 : 1.01);
          const selection = active.type === "activeSelection";
          /*  */
          active.scaleX = active.scaleX * scale;
          active.scaleY = active.scaleY * scale;
          active.top = active.top + (selection ? center.y * (1 - scale) / 2 : 0);
          active.left = active.left + (selection ? center.x * (1 - scale) / 2 : 0);
          /*  */
          active.setCoords();
          config.draw.canvas.renderAll();
          config.listeners.object.updated();
        }
      }
    },
    "tool": {
      "select": function (mode, button) {
        config.draw.mode = mode;
        config.listeners.selector.reset();
        config.draw.canvas.isDrawingMode = false;
        config.draw.canvas.selection = mode === "text";
        button.setAttribute("selected", '');
        config.options.show(mode);
        config.draw.canvas.renderAll();
      },
      "screenshot": function () {
        if (config.port.name !== "page") {
          console.error("Screenshot only works in the page overlay context.");
          return;
        }
        if (config.draw.screenshot.busy) return;
        const root = document.documentElement;
        const button = document.getElementById("draw-screenshot-tool");
        const done = function (success) {
          config.draw.screenshot.busy = false;
          root.removeAttribute("capturing");
          if (success) {
            window.setTimeout(function () {button.removeAttribute("selected")}, 1000);
          } else {
            button.removeAttribute("selected");
          }
        };
        /*  */
        config.draw.screenshot.busy = true;
        button.setAttribute("selected", '');
        root.setAttribute("capturing", "true");
        /*  */
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            try {
              chrome.tabs.captureVisibleTab(null, {"format": "png"}, function (src) {
                if (chrome.runtime.lastError || !src) {
                  const message = chrome.runtime.lastError ? chrome.runtime.lastError.message : "empty capture";
                  window.alert("The page doesn't allow screenshots: " + message);
                  done(false);
                  return;
                }
                /*  */
              fabric.Image.fromURL(src).then(function (image) {
                if (image) {
                  const move = document.getElementById("Move");
                  image.set({"selectable": true, "evented": true});
                  image.scaleToWidth(config.draw.canvas.getWidth());
                  config.draw.canvas.add(image);
                  config.draw.canvas.sendObjectToBack(image);
                  if (move) move.click();
                  config.draw.canvas.setActiveObject(image);
                  config.draw.canvas.renderAll();
                  config.listeners.object.updated();
                } else {
                  window.alert("The screenshot could not be placed.");
                }
                /*  */
                done(image ? true : false);
              }).catch(function (error) {
                window.alert("The screenshot could not be placed: " + error.message);
                done(false);
              });
              });
            } catch (error) {
              window.alert("The page doesn't allow screenshots: " + error.message);
              done(false);
            }
          });
        });
      }
    }
  },
  "app": {
    "start": function () {
      config.make.draggable();
      config.render.interface();
      config.draw.brushing.update();
      config.settings.attach();
      /*  */
      fabric.Object.prototype.transparentCorners = false;
      /*  */
      config.draw.shape.stroke.color.addEventListener("input", function () {
        config.storage.write("stroke.color", this.value);
      });
      /*  */
      config.draw.shape.fill.opacity.addEventListener("input", function () {
        config.storage.write("fill.opacity", this.value);
        this.previousSibling.textContent = Number(this.value).toFixed(2);
      });
      /*  */
      config.draw.shape.stroke.width.addEventListener("input", function () {
        config.storage.write("stroke.width", this.value);
        this.previousSibling.textContent = Number(this.value).toFixed(1);
      });
      /*  */
      config.draw.brushing.shadow.color.addEventListener("input", function () {
        config.storage.write("shadow.color", this.value);
        config.draw.canvas.freeDrawingBrush.shadow.color = this.value;
      });
      /*  */
      config.draw.brushing.line.color.addEventListener("input", function () {
        config.storage.write("line.color", this.value);
        let opacity = config.draw.convert.to.hex(config.draw.brushing.line.opacity.value);
        config.draw.canvas.freeDrawingBrush.color = this.value + opacity;
      });
      /*  */
      config.draw.brushing.line.width.addEventListener("input", function () {
        config.storage.write("line.width", this.value);
        this.previousSibling.textContent = Number(this.value).toFixed(1);
        config.draw.canvas.freeDrawingBrush.width = parseInt(this.value, 10) || 1;
      });
      /*  */
      config.draw.brushing.shadow.width.addEventListener("input", function () {
        config.storage.write("shadow.width", this.value);
        this.previousSibling.textContent = Number(this.value).toFixed(1);
        config.draw.canvas.freeDrawingBrush.shadow.blur = parseInt(this.value, 10) || 0;
      });
      /*  */
      config.draw.brushing.line.opacity.addEventListener("input", function () {
        config.storage.write("line.opacity", this.value);
        let opacity = config.draw.convert.to.hex(this.value);
        this.previousSibling.textContent = Number(this.value).toFixed(2);
        config.draw.canvas.freeDrawingBrush.color = config.draw.brushing.line.color.value + opacity;
      });
      /*  */
      config.draw.brushing.shadow.offset.addEventListener("input", function () {
        config.storage.write("shadow.offset", this.value);
        this.previousSibling.textContent = Number(this.value).toFixed(1);
        config.draw.canvas.freeDrawingBrush.shadow.offsetX = parseInt(this.value, 10) || 0;
        config.draw.canvas.freeDrawingBrush.shadow.offsetY = parseInt(this.value, 10) || 0;
      });
      /*  */
      config.draw.text.family.addEventListener("change", function () {
        config.storage.write("text.family", this.value);
        config.draw.text.apply();
      });
      /*  */
      config.draw.text.color.addEventListener("input", function () {
        config.storage.write("text.color", this.value);
        config.draw.text.apply();
      });
      /*  */
      config.draw.text.size.addEventListener("input", function () {
        config.storage.write("text.size", this.value);
        this.previousSibling.textContent = Number(this.value).toFixed(0);
        config.draw.text.apply();
      });
      /*  */
      config.draw.ui.family.addEventListener("change", function () {
        config.storage.write("ui.font", this.value);
        document.documentElement.style.setProperty("--ui-font", this.value);
      });
      /*  */
      config.draw.ui.size.addEventListener("change", function () {
        config.storage.write("ui.size", this.value);
        document.documentElement.style.setProperty("--ui-scale", this.value);
      });
      /*  */
      config.draw.shape.fill.color.addEventListener("input", function () {
        config.storage.write("fill.color", this.value);
        config.draw.canvas.getActiveObjects().forEach(function (object) {
          object.set("fill", config.storage.read("fill.color"));
          config.draw.canvas.renderAll();
          config.listeners.object.updated();
        });
      });
      /*  */
      config.draw.background.color.addEventListener("input", function () {
        if (config.draw.mode === "text") {
          config.storage.write("text.highlight", this.value);
          const slider = config.draw.text.transparency;
          if (Number(slider.value) === 0) {
            slider.value = 100;
            slider.previousSibling.textContent = "100";
            config.storage.write("text.transparency", 100);
          }
          /*  */
          config.draw.text.apply();
          return;
        }
        /*  */
        config.storage.write("background.color", this.value);
        config.draw.canvas.backgroundColor = config.port.name === "page" ? "transparent" : this.value;
        config.draw.options.backgroundColor = config.port.name === "page" ? "transparent" : this.value;
        /*  */
        config.draw.canvas.renderAll();
        config.listeners.object.updated();
      });
      /*  */
      config.draw.text.transparency.addEventListener("input", function () {
        this.previousSibling.textContent = Number(this.value).toFixed(0);
        config.storage.write("text.transparency", Number(this.value) || 0);
        config.draw.text.apply();
      });
      /*  */
      config.draw.text.bold.addEventListener("click", function () {
        const state = this.hasAttribute("selected") ? false : true;
        if (state) this.setAttribute("selected", '');
        else this.removeAttribute("selected");
        /*  */
        config.storage.write("text.bold", state);
        config.draw.text.apply();
      });
      /*  */
      config.draw.text.italic.addEventListener("click", function () {
        const state = this.hasAttribute("selected") ? false : true;
        if (state) this.setAttribute("selected", '');
        else this.removeAttribute("selected");
        /*  */
        config.storage.write("text.italic", state);
        config.draw.text.apply();
      });
    }
  },
  "make": {
    "draggable": function () {
      const state = {"grabbing": false};
      const x = {"init": null, "first": null};
      const y = {"init": null, "first": null};
      /*  */
      const touchmove = function (e) {
        if (!state.grabbing) return;
        const touch = e.touches[0];
        config.draw.brushing.controls.popup.style.top = y.init + touch.pageY - y.first + "px";
        config.draw.brushing.controls.popup.style.left = x.init + touch.pageX - x.first + "px";
        /*  */
        config.storage.write("controls.top", config.draw.brushing.controls.popup.style.top);
        config.storage.write("controls.left", config.draw.brushing.controls.popup.style.left);
      };
      /*  */
      const touchstart = function (e) {
        const touch = e.touches[0];
        if (touch.target.closest('input, select, textarea, button, [data-color], [drag="disabled"]')) return;
        state.grabbing = true;
        e.preventDefault();
        /*  */
        x.first = touch.pageX;
        y.first = touch.pageY;
        y.init = config.draw.brushing.controls.popup.offsetTop;
        x.init = config.draw.brushing.controls.popup.offsetLeft;
      };
      /*  */
      const mousemove = function (e) {
        if (!state.grabbing) return;
        config.draw.brushing.controls.popup.style.top = y.init + e.pageY - y.first + "px";
        config.draw.brushing.controls.popup.style.left = x.init + e.pageX - x.first + "px";
        /*  */
        config.storage.write("controls.top", config.draw.brushing.controls.popup.style.top);
        config.storage.write("controls.left", config.draw.brushing.controls.popup.style.left);
      };
      /*  */
      const mousedown = function (e) {
        if (e.target.closest('input, select, textarea, button, [data-color], [drag="disabled"]')) return;
        state.grabbing = true;
        e.preventDefault();
        /*  */
        x.first = e.pageX;
        y.first = e.pageY;
        y.init = config.draw.brushing.controls.popup.offsetTop;
        x.init = config.draw.brushing.controls.popup.offsetLeft;
      };
      /*  */
      const release = function () {state.grabbing = false};
      /*  */
      config.draw.brushing.controls.popup.addEventListener("mousedown", mousedown, false);
      config.draw.brushing.controls.popup.addEventListener("touchstart", touchstart, false);
      /*  */
      window.addEventListener("mousemove", mousemove, false);
      window.addEventListener("touchmove", touchmove, false);
      window.addEventListener("touchend", release, false);
      window.addEventListener("mouseup", release, false);
      window.addEventListener("blur", release, false);
    }
  },
  "load": function () {
    const png = document.getElementById("png");
    const copy = document.getElementById("copy");
    const show = document.getElementById("show");
    const undo = document.getElementById("undo");
    const redo = document.getElementById("redo");
    const hide = document.getElementById("hide");
    const save = document.getElementById("save");
    const theme = document.getElementById("theme");
    const paste = document.getElementById("paste");
    const close = document.getElementById("close");
    const clear = document.getElementById("clear");
    const reset = document.getElementById("reset");
    const print = document.getElementById("print");
    const remove = document.getElementById("remove");
    const reload = document.getElementById("reload");
    const zoomin = document.getElementById("zoom-in");
    const dark = document.getElementById("theme-dark");
    const support = document.getElementById("support");
    const zoomout = document.getElementById("zoom-out");
    const donation = document.getElementById("donation");
    const color = document.getElementById("theme-color");
    const optclose = document.getElementById("options-close");
    const texttool = document.getElementById("draw-text-tool");
    const erasertool = document.getElementById("draw-eraser-tool");
    const snaptool = document.getElementById("draw-screenshot-tool");
    /*  */
    config.draw.ui.size = document.getElementById("ui-size");
    config.draw.ui.family = document.getElementById("ui-font");
    config.draw.text.size = document.getElementById("draw-text-size");
    config.draw.text.bold = document.getElementById("draw-text-bold");
    config.draw.text.color = document.getElementById("draw-text-color");
    config.draw.text.family = document.getElementById("draw-text-family");
    config.draw.text.italic = document.getElementById("draw-text-italic");
    config.draw.brushing.controls.popup = document.querySelector(".controls");
    config.draw.shape.selector = document.querySelector(".draw-shape-selector");
    config.draw.background.color = document.getElementById("draw-background-color");
    config.draw.shape.fill.color = document.getElementById("draw-shape-fill-color");
    config.draw.text.transparency = document.getElementById("draw-text-transparency");
    config.draw.brushing.selector = document.querySelector(".draw-brushing-selector");
    config.draw.shape.fill.opacity = document.getElementById("draw-shape-fill-opacity");
    config.draw.brushing.line.color = document.getElementById("draw-brushing-line-color");
    config.draw.brushing.line.width = document.getElementById("draw-brushing-line-width");
    config.draw.shape.stroke.width = document.getElementById("draw-brushing-stroke-width");
    config.draw.shape.stroke.color = document.getElementById("draw-brushing-stroke-color");
    config.draw.brushing.line.opacity = document.getElementById("draw-brushing-line-opacity");
    config.draw.brushing.shadow.width = document.getElementById("draw-brushing-shadow-width");
    config.draw.brushing.shadow.color = document.getElementById("draw-brushing-shadow-color");
    config.draw.brushing.shadow.offset = document.getElementById("draw-brushing-shadow-offset");
    /*  */
    config.draw.shape.selector.addEventListener("click", config.listeners.selector.shape);
    config.draw.brushing.selector.addEventListener("click", config.listeners.selector.brushing);
    /*  */
    optclose.addEventListener("click", function () {config.settings.toggle()}, false);
    snaptool.addEventListener("click", function () {config.draw.tool.screenshot()}, false);
    texttool.addEventListener("click", function () {config.draw.tool.select("text", this)}, false);
    erasertool.addEventListener("click", function () {config.draw.tool.select("eraser", this)}, false);
    /*  */
    support.addEventListener("click", function () {
      const url = config.addon.homepage();
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      const url = config.addon.homepage() + "?reason=support";
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    color.addEventListener("input", function (e) {
      const root = document.documentElement;
      config.storage.write("theme.color", e.target.value);
      root.style.setProperty("--theme-color", e.target.value);
    }, false);
    /*  */
    save.addEventListener("click", function () {
      const flag = window.confirm("Are you sure you want to save all drawings?");
      if (flag) {
        config.draw.save();
      }
    });
    /*  */
    clear.addEventListener("click", function () {
      const flag = window.confirm("Are you sure you want to clear all drawings?");
      if (flag) {
        config.storage.write("last.draw", '');
        config.draw.canvas.clear();
        document.location.reload();
      }
    });
    /*  */
    reset.addEventListener("click", function () {
      const flag = window.confirm("Are you sure you want to reset the extension to factory settings?");
      if (flag) {
        for (const id in config.storage.local) {
          if (id !== "last.draw") config.storage.write(id, null);
        }
        document.location.reload();
      }
    });
    /*  */
    dark.addEventListener("click", function () {
      const root = document.documentElement;
      const dark = root.getAttribute("theme-dark");
      const state = dark === "true" ? true : false;
      /*  */
      root.setAttribute("theme-dark", !state);
      config.storage.write("theme.dark", !state);
    });
    /*  */
    document.addEventListener("keydown", function (e) {
      const key = e.key ? e.key : e.code;
      const arrow = key.indexOf("Arrow") === 0;
      const code = e.keyCode ? e.keyCode : e.which;
      const active = document.activeElement;
      const tag = active ? active.tagName : '';
      const control = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      /*  */
      config.draw.keyboard.code = code;
      /*  */
      if (code === 27 && config.settings.visible()) config.settings.toggle();
      if (control) return;
      //if (code === 27) close.click();
      if (e.ctrlKey && code === 67) config.draw.copy();
      if (e.ctrlKey && code === 89) config.draw.redo();
      if (e.ctrlKey && code === 90) config.draw.undo();
      if (e.ctrlKey && code === 86) config.draw.paste();
      if (code === 46) config.draw.remove.active.objects();
      if (arrow) config.draw.action.move(code, e.shiftKey);
      if (code === 188 || code === 190) config.draw.action.resize(code);
      if (code === 219 || code === 221) config.draw.action.rotate(code);
    });
    /*  */
    theme.addEventListener("click", function () {color.click()});
    print.addEventListener("click", function () {config.print()});
    undo.addEventListener("click", function () {config.draw.undo()});
    redo.addEventListener("click", function () {config.draw.redo()});
    copy.addEventListener("click", function () {config.draw.copy()});
    paste.addEventListener("click", function () {config.draw.paste()});
    remove.addEventListener("click", config.draw.remove.active.objects);
    show.addEventListener("click", function () {config.controls.show()});
    hide.addEventListener("click", function () {config.controls.hide()});
    zoomin.addEventListener("click", function () {config.draw.zoom.in()});
    close.addEventListener("click", function () {background.send("close")});
    zoomout.addEventListener("click", function () {config.draw.zoom.out()});
    png.addEventListener("click", function () {config.draw.convert.to.png()});
    reload.addEventListener("click", function () {document.location.reload()});
    /*  */
    config.storage.load(config.app.start);
    window.removeEventListener("load", config.load, false);
  },
  "listeners": {
    "object": {
      "timeout": null,
      "updated": function () {
        window.clearTimeout(config.listeners.object.timeout);
        config.listeners.object.timeout = window.setTimeout(function () {          
          const screen = JSON.stringify(config.draw.canvas);
          const index = config.draw.history.length - 1 - config.draw.screen;
          if (config.draw.history[index] !== screen) {
            config.draw.history = config.draw.history.slice(0, index + 1);
            config.draw.history.push(screen);
            config.draw.screen = 0;
            /*  */
            if (config.settings.on("autosave")) config.draw.save();
          }
        }, 300);
      }
    },
    "mouse": {
      "up": function () {
        if (config.draw.mode === "shape") {
          const value = config.draw.shape.selector.getAttribute("selected");
          if (value === "Line") config.draw.shape.line.active = false;
          /*  */
          if (config.draw.shape.drag.object) {
            config.draw.shape.drag.object.setCoords();
            config.draw.shape.drag.object = null;
            config.draw.canvas.renderAll();
            config.listeners.object.updated();
          }
        }
      },
      "move": function (o) {
        if (config.draw.mode === "shape") {
          const value = config.draw.shape.selector.getAttribute("selected");
          if (value === "Line") {
            if (config.draw.shape.line.active) {
              config.draw.canvas.selection = false;
              const pointer = config.draw.canvas.getScenePoint(o.e);
              if (config.draw.shape.line.object) {
                config.draw.shape.line.object.set({"x2": pointer.x, "y2": pointer.y});
                config.draw.canvas.renderAll();
                config.listeners.object.updated();
              } 
            }
          }
          /*  */
          if (value !== "Line" && value !== "Move" && config.draw.shape.drag.object) {
            const pointer = config.draw.canvas.getScenePoint(o.e);
            const dx = Math.abs(pointer.x - config.draw.shape.drag.origin.x);
            const dy = Math.abs(pointer.y - config.draw.shape.drag.origin.y);
            const size = Math.max(dx, dy);
            const object = config.draw.shape.drag.object;
            /*  */
            if (value === "Circle") object.set({"radius": Math.max(size, 1)});
            else if (value === "Rect" || value === "Triangle") object.set({"width": Math.max(dx, 1) * 2, "height": Math.max(dy, 1) * 2});
            else object.set({"scaleX": Math.max(size, 0.01), "scaleY": Math.max(size, 0.01)});
            /*  */
            object.setCoords();
            config.draw.canvas.renderAll();
          }
        }
      },
      "wheel": function (o) {
        if (config.draw.keyboard.code === 16) {
          let delta = o.e.deltaY;
          let zoom = config.draw.canvas.getZoom();
          let point = {'x': o.e.offsetX, 'y': o.e.offsetY};
          /*  */
          zoom *= 0.999 ** delta;
          if (zoom > 20) zoom = 20;
          if (zoom < 0.01) zoom = 0.01;
          /*  */
          config.draw.canvas.zoomToPoint(point, zoom);
          o.e.preventDefault();
          o.e.stopPropagation();
        }
      },
      "down": function (o) {
        if (config.draw.mode === "shape") {
          const value = config.draw.shape.selector.getAttribute("selected");
          if (value === "Line") {
            config.draw.shape.line.active = true;
            const pointer = config.draw.canvas.getScenePoint(o.e);
            config.draw.shape.line.object = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
              "originX": "center",
              "originY": "center",
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            });
            /*  */
            config.draw.canvas.add(config.draw.shape.line.object);
          }
          /*  */
          if (!o.target && value !== "Line" && value !== "Move" && config.settings.on("dragsize")) {
            const pointer = config.draw.canvas.getScenePoint(o.e);
            const object = config.draw.shape.create(value, pointer.x, pointer.y);
            if (object) {
              config.draw.shape.drag = {"value": value, "origin": pointer, "object": object};
              config.draw.canvas.add(object);
            }
          }
        }
        /*  */
        if (config.draw.mode === "text") {
          if (!o.target) {
            const pointer = config.draw.canvas.getScenePoint(o.e);
            const text = new fabric.IText("Text", {
              "top": pointer.y,
              "left": pointer.x,
              "fill": config.draw.text.color.value,
              "backgroundColor": config.draw.text.mix(),
              "fontFamily": config.draw.text.family.value,
              "fontSize": parseInt(config.draw.text.size.value, 10) || 20,
              "fontWeight": config.draw.text.bold.hasAttribute("selected") ? "bold" : "normal",
              "fontStyle": config.draw.text.italic.hasAttribute("selected") ? "italic" : "normal"
            });
            /*  */
            config.draw.canvas.add(text);
            config.draw.canvas.setActiveObject(text);
            text.enterEditing();
            config.draw.canvas.renderAll();
          }
        }
        /*  */
        if (config.draw.mode === "eraser" && o.target) {
          config.draw.canvas.remove(o.target);
          config.draw.canvas.renderAll();
          config.listeners.object.updated();
        }
      }
    },
    "selector": {
      "reset": function () {
        [...config.draw.shape.selector.querySelectorAll("button")].map(function (e) {e.removeAttribute("selected")});
        [...config.draw.brushing.selector.querySelectorAll("button")].map(function (e) {e.removeAttribute("selected")});
      },
      "brushing": function (e) {
        if (e && e.target) {
          if (e.target.id.indexOf("draw-") === 0) return;
          /*  */
          config.draw.mode = "brushing";
          config.listeners.selector.reset();
          e.target.setAttribute("selected", '');
          config.draw.canvas.isDrawingMode = true;
          this.setAttribute("selected", e.target.id);
          config.storage.write("draw.mode", config.draw.mode);
          /*  */
          config.draw.brushing.update();
          config.options.show("brushing");
          config.storage.write("brushing.selector", e.target.id);
        }
      },
      "shape": function (e) {
        if (e && e.target) {
          config.draw.mode = "shape";
          config.listeners.selector.reset();
          config.draw.canvas.selection = true;
          e.target.setAttribute("selected", '');
          config.draw.canvas.isDrawingMode = false;
          this.setAttribute("selected", e.target.id);
          config.storage.write("draw.mode", config.draw.mode);
          config.storage.write("shape.selector", e.target.id);
          config.options.show(e.target.id === "Move" ? "move" : "shape");
          /*  */
          if (e.target.id === "Move") {
            config.draw.canvas.selection = true;
          }
          /*  */
          const drop = e.target.id !== "Move" && !config.settings.on("dragsize");
          if (drop && e.target.id === "Circle") {
            config.draw.canvas.add(new fabric.Circle({
              "top": 200, 
              "left": 200,
              "radius": 200,
              "originX": "center",
              "originY": "center",
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            }));
          }
          /*  */
          if (drop && e.target.id === "Hexagon") {
            const points = config.draw.shape.generate.regular.polygon.points(6, 200);
            config.draw.canvas.add(new fabric.Polygon(points, {
              "top": 200, 
              "left": 200,
              "originX": "center",
              "originY": "center",
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            }));
          }
          /*  */
          if (drop && e.target.id === "Octagon") {
            const points = config.draw.shape.generate.regular.polygon.points(8, 200);
            config.draw.canvas.add(new fabric.Polygon(points, {
              "top": 200, 
              "left": 200,
              "originX": "center",
              "originY": "center",
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            }));
          }
          /*  */
          if (drop && e.target.id === "Triangle") {
            config.draw.canvas.add(new fabric.Triangle({
              "top": 150, 
              "left": 200,
              "width": 400,
              "height": 300,
              "originX": "center",
              "originY": "center",
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            }));
          }
          /*  */
          if (drop && e.target.id === "Rect") {
            config.draw.canvas.add(new fabric.Rect({
              "top": 150,
              "left": 250,
              "width": 500,
              "height": 300,
              "originX": "center",
              "originY": "center",
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            }));
          }
        }
      }
    }
  }
};

config.port.connect();

window.addEventListener("load", config.load, false);
window.addEventListener("resize", config.resize.method, false);
