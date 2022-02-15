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
  "send": function (id, data) {
    if (id) {
      if (background.port.name !== "webapp") {
        chrome.runtime.sendMessage({
          "method": id,
          "data": data,
          "path": "interface-to-background"
        }); 
      }
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
  "listener": function (e) {
    if (e) {
      for (var id in background.message) {
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
  "controls": {
    "hide": function () {
      var target = document.querySelector(".controls");
      target.style.display = "none";
    },
    "show": function () {
      var target = document.querySelector(".controls");
      target.style.display = target.style.display === "none" ? "block" : "none";
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      if (config.port.name === "win") {
        if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
        config.resize.timeout = window.setTimeout(async function () {
          var current = await chrome.windows.getCurrent();
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
          var tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp, function () {});
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id, function () {});
        }
      }
    }
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      var context = document.documentElement.getAttribute("context");
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
              document.body.style.width = "800px";
              document.body.style.height = "580px";
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
    "interface": function () {
      config.draw.mode = config.storage.read("draw.mode") !== undefined ? config.storage.read("draw.mode") : "brushing";
      config.draw.brushing.line.width.value = config.storage.read("line.width") !== undefined ? config.storage.read("line.width") : 20;
      config.draw.shape.stroke.width.value = config.storage.read("stroke.width") !== undefined ? config.storage.read("stroke.width") : 5;
      config.draw.shape.fill.opacity.value = config.storage.read("fill.opacity") !== undefined ? config.storage.read("fill.opacity") : 1;
      config.draw.shape.fill.color.value = config.storage.read("fill.color") !== undefined ? config.storage.read("fill.color") : "#7f07cf";
      config.draw.brushing.shadow.width.value = config.storage.read("shadow.width") !== undefined ? config.storage.read("shadow.width") : 0;
      config.draw.brushing.line.opacity.value = config.storage.read("line.opacity") !== undefined ? config.storage.read("line.opacity") : 1;
      config.draw.brushing.line.color.value = config.storage.read("line.color") !== undefined ? config.storage.read("line.color") : "#00e61b";
      config.draw.brushing.shadow.offset.value = config.storage.read("shadow.offset") !== undefined ? config.storage.read("shadow.offset") : 0;
      config.draw.shape.stroke.color.value = config.storage.read("stroke.color") !== undefined ? config.storage.read("stroke.color") : "#c7c7c7";
      config.draw.brushing.shadow.color.value = config.storage.read("shadow.color") !== undefined ? config.storage.read("shadow.color") : "#777777";
      config.draw.background.color.value = config.storage.read("background.color") !== undefined ? config.storage.read("background.color") : "#ffffff";
      config.draw.shape.selector.setAttribute("selected", config.storage.read("shape.selector") !== undefined ? config.storage.read("shape.selector") : "Circle");
      config.draw.brushing.selector.setAttribute("selected", config.storage.read("brushing.selector") !== undefined ? config.storage.read("brushing.selector") : "Pencil");
      /*  */
      config.draw.shape.stroke.width.previousSibling.textContent = Number(config.draw.shape.stroke.width.value).toFixed(1);
      config.draw.shape.fill.opacity.previousSibling.textContent = Number(config.draw.shape.fill.opacity.value).toFixed(2);
      config.draw.brushing.line.width.previousSibling.textContent = Number(config.draw.brushing.line.width.value).toFixed(1);
      config.draw.brushing.shadow.width.previousSibling.textContent = Number(config.draw.brushing.shadow.width.value).toFixed(1);
      config.draw.brushing.line.opacity.previousSibling.textContent = Number(config.draw.brushing.line.opacity.value).toFixed(2);
      config.draw.brushing.shadow.offset.previousSibling.textContent = Number(config.draw.brushing.shadow.offset.value).toFixed(1);
      /*  */
      //config.draw.brushing.controls.style.top = config.storage.read("controls.top") !== undefined ? config.storage.read("controls.top") : "100px";
      //config.draw.brushing.controls.style.left = config.storage.read("controls.left") !== undefined ? config.storage.read("controls.left") : "100px";
      /*  */
      var computed = window.getComputedStyle(document.body);
      var width = computed ? parseInt(computed.width) : 800;
      
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
      window.setTimeout(function () {
        if (config.draw.mode === "brushing") {
          var brushing = config.draw.brushing.selector.getAttribute("selected");
          if (brushing) config.draw.brushing.selector.querySelector('#' + brushing).setAttribute("selected", '');
        } else {
          var shape = config.draw.shape.selector.getAttribute("selected");
          if (shape) config.draw.shape.selector.querySelector('#' + shape).setAttribute("selected", '');
        }
      }, 300);
      /*  */
      config.draw.canvas.isDrawingMode = config.draw.mode === "brushing";
      config.draw.brushing.controls.style.display = "block";
      /*  */
      var last = config.storage.read("last.draw");
      if (last) {
        config.draw.canvas.loadFromJSON(JSON.parse(last));
        if (config.port.name === "page") {
          config.draw.canvas.backgroundColor = "transparent";
        }
        /*  */
        config.draw.canvas.renderAll();
      }
    }
  },
  "draw": {
    "mode": '',
    "screen": 0,
    "history": [],
    "canvas": null,
    "background": {},
    "clipboard": null,
    "keyborad": {"code": null},
    "id": "draw-on-page-canvas",
    "options": {"width": 800, "height": 800},
    "save": function () {
      var current = config.draw.history[config.draw.history.length - 1];
      config.storage.write("last.draw", JSON.stringify(current));
    },
    "copy": function () {
      var active = config.draw.canvas.getActiveObject();
      if (active) {
        active.clone(function (cloned) {
          config.draw.clipboard = cloned;
        });
      }
    },
    "convert": {
      "to": {
        "hex": function (opacity) {
          return ((opacity * 255) | 1 << 8).toString(16).slice(1);
        },
        "png": function () {
          var a = document.createElement('a');
          var src = config.draw.canvas.toDataURL({"format": "png", "quality": 1.00});
          a.download = "drawing.png";
          a.style.display = "none";
          a.href = src;
          a.click();
          window.setTimeout(function () {a.remove()}, 1000);
        }
      }
    },
    "undo": function () {
      if (config.draw.screen < config.draw.history.length) {
        config.draw.canvas.clear();
        config.draw.canvas.renderAll();
        var index = config.draw.history.length - 1 - config.draw.screen;
        config.draw.canvas.loadFromJSON(config.draw.history[index - 1]);
        config.draw.canvas.renderAll();
        config.draw.screen += 1;
      }
    },
    "redo": function () {
      if (config.draw.screen > 0) {
        config.draw.canvas.clear();
        config.draw.canvas.renderAll();
        var index = config.draw.history.length - 1 - config.draw.screen;
        config.draw.canvas.loadFromJSON(config.draw.history[index + 1]);
        config.draw.canvas.renderAll();
        config.draw.screen -= 1;
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
        var zoom = config.draw.canvas.getZoom();
        zoom = zoom + 0.01;
        if (zoom > 20) zoom = 20;
        config.draw.canvas.setZoom(zoom);
      },
      "out": function () {
        var zoom = config.draw.canvas.getZoom();
        zoom = zoom - 0.01;
        if (zoom < 0.01) zoom = 0.01;
        config.draw.canvas.setZoom(zoom);
      }
    },
    "paste": function () {
      config.draw.clipboard.clone(function (cloned) {
        config.draw.canvas.discardActiveObject();
        cloned.set({
          "evented": true, 
          "top": cloned.top + 50, 
          "left": cloned.left + 50
        });
        /*  */
        if (cloned.type === "activeSelection") {
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
    "action": {
      "rotate": function (code) {
        var active = config.draw.canvas.getActiveObject();
        if (active) {
          var degrees = code === 219 ? -1 : +1;
          active.rotate(active.angle + degrees);
          /*  */
          active.setCoords();
          config.draw.canvas.renderAll();
          config.listeners.object.updated();
        }
      },
      "move": function (dir, shift) {
        var active = config.draw.canvas.getActiveObject();
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
        var active = config.draw.canvas.getActiveObject();
        if (active) {
          var center = active.getCenterPoint();
          var scale = (code === 188 ? 0.99 : 1.01);
          var selection = active.type === "activeSelection";
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
    "brushing": {
      "line": {},
      "shadow": {},
      "label": null,
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
          var value = config.draw.brushing.selector.getAttribute("selected");
          if (value) {
            var key = value + "Brush";
            config.draw.canvas.freeDrawingBrush = new fabric[key](config.draw.canvas, {"originX": "center", "originY": "center"});
            if (config.draw.canvas.freeDrawingBrush) {
              var opacity = config.draw.convert.to.hex(config.draw.brushing.line.opacity.value);
              config.draw.canvas.freeDrawingBrush.color = config.draw.brushing.line.color.value + opacity;
              config.draw.canvas.freeDrawingBrush.width = parseInt(config.draw.brushing.line.width.value, 10) || 1;
              config.draw.canvas.freeDrawingBrush.shadow = new fabric.Shadow(config.draw.brushing.options(config.draw.brushing.shadow));
            }
          }
        }
      }
    },
    "shape": {
      "fill": {},
      "line": {},
      "stroke": {},
      "label": null,
      "selector": null,
      "generate": {
        "regular": {
          "polygon": {
            "points": function (n, r) {
              var cx = r;
              var cy = r;
              var points = [];
              var sweep = Math.PI * 2 / n;
              /*  */
              for (var i = 0; i < n; i++) {
                var x = cx + r * Math.cos(i * sweep);
                var y = cy + r * Math.sin(i * sweep);
                points.push({'x': x, 'y': y});
              }
              /*  */
              return(points);
            }
          }
        }
      }
    }
  },
  "app": {
    "start": function () {
      config.make.draggable();
      config.render.interface();
      config.draw.brushing.update();
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
      config.draw.background.color.addEventListener("input", function () {
        config.storage.write("background.color", this.value);
        config.draw.canvas.backgroundColor = config.port.name === "page" ? "transparent" : this.value;
        config.draw.options.backgroundColor = config.port.name === "page" ? "transparent" : this.value;
        /*  */
        config.draw.canvas.renderAll();
        config.listeners.object.updated();
      });
      /*  */
      config.draw.brushing.line.color.addEventListener("input", function () {
        config.storage.write("line.color", this.value);
        var opacity = config.draw.convert.to.hex(config.draw.brushing.line.opacity.value);
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
        var opacity = config.draw.convert.to.hex(this.value);
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
      config.draw.shape.fill.color.addEventListener("input", function () {
        config.storage.write("fill.color", this.value);
        config.draw.canvas.getActiveObjects().forEach(function (object) {
          object.set("fill", config.storage.read("fill.color"));
          config.draw.canvas.renderAll();
          config.listeners.object.updated();
        });
      });
    }
  },
  "make": {
    "draggable": function () {
      var x = {"init": null, "first": null};
      var y = {"init": null, "first": null};
      /*  */
      var touchmove = function (e) {
        var touch = e.touches[0];        
        if (touch.target.getAttribute("drag") === "disabled") return;
        config.draw.brushing.controls.style.top = y.init + touch.pageY - y.first + "px";
        config.draw.brushing.controls.style.left = x.init + touch.pageX - x.first + "px";
        /*  */
        config.storage.write("controls.top", config.draw.brushing.controls.style.top);
        config.storage.write("controls.left", config.draw.brushing.controls.style.left);
            };
      /*  */
      var touchstart = function (e) {
        var touch = e.touches[0];
        if (touch.target.getAttribute("drag") === "disabled") return;
        config.draw.brushing.controls.addEventListener("touchmove", touchmove, false);
        e.preventDefault();
        /*  */
        x.first = touch.pageX;
        y.first = touch.pageY;
        y.init = config.draw.brushing.controls.offsetTop;
        x.init = config.draw.brushing.controls.offsetLeft;
      };
      /*  */
      var mousemove = function (e) {
        if (e.target.getAttribute("drag") === "disabled") return;
        config.draw.brushing.controls.style.top = y.init + e.pageY - y.first + "px";
        config.draw.brushing.controls.style.left = x.init + e.pageX - x.first + "px";
        /*  */
        config.storage.write("controls.top", config.draw.brushing.controls.style.top);
        config.storage.write("controls.left", config.draw.brushing.controls.style.left);
      };
      /*  */
      var mousedown = function (e) {      
        if (e.target.getAttribute("drag") === "disabled") return;
        config.draw.brushing.controls.addEventListener("mousemove", mousemove, false);
        e.preventDefault();
        /*  */
        x.first = e.pageX;
        y.first = e.pageY;
        y.init = config.draw.brushing.controls.offsetTop;
        x.init = config.draw.brushing.controls.offsetLeft;
      };
      /*  */
      config.draw.brushing.controls.addEventListener("mousedown", mousedown, false);
      config.draw.brushing.controls.addEventListener("touchstart", touchstart, false);
      window.addEventListener("mouseup", function () {config.draw.brushing.controls.removeEventListener("mousemove", mousemove, false)}, false);
      window.addEventListener("touchend", function () {config.draw.brushing.controls.removeEventListener("touchmove", touchmove, false)}, false);
    }
  },
  "load": function () {
    var png = document.getElementById("png");
    var copy = document.getElementById("copy");
    var show = document.getElementById("show");
    var undo = document.getElementById("undo");
    var redo = document.getElementById("redo");
    var hide = document.getElementById("hide");
    var save = document.getElementById("save");
    var paste = document.getElementById("paste");
    var close = document.getElementById("close");
    var clear = document.getElementById("clear");
    var print = document.getElementById("print");
    var remove = document.getElementById("remove");
    var reload = document.getElementById("reload");
    var zoomin = document.getElementById("zoom-in");
    var support = document.getElementById("support");
    var zoomout = document.getElementById("zoom-out");
    var donation = document.getElementById("donation");
    /*  */
    config.draw.brushing.controls = document.querySelector(".controls");
    config.draw.shape.selector = document.querySelector(".draw-shape-selector");
    config.draw.background.color = document.getElementById("draw-background-color");
    config.draw.shape.fill.color = document.getElementById("draw-shape-fill-color");
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
    support.addEventListener("click", function () {
      var url = config.addon.homepage();
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      var url = config.addon.homepage() + "?reason=support";
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    document.addEventListener("keydown", function (e) {
      var key = e.key ? e.key : e.code;
      var arrow = key.indexOf("Arrow") === 0;
      var code = e.keyCode ? e.keyCode : e.which;
      /*  */
      config.draw.keyborad.code = code;
      /*  */
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
    save.addEventListener("click", function () {
      var flag = window.confirm("Are you sure you want to save all drawings?");
      if (flag) {
        config.draw.save();
      }
    });
    /*  */
    clear.addEventListener("click", function () {
      var flag = window.confirm("Are you sure you want to clear all drawings?");
      if (flag) {
        config.storage.write("last.draw", '');
        config.draw.canvas.clear();
        document.location.reload();
      }
    });
    /*  */
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
          var screen = JSON.stringify(config.draw.canvas);
          if (config.draw.history.indexOf(screen) === -1) {
            config.draw.history.push(screen);
          }
        }, 300);
      }
    },
    "mouse": {
      "up": function () {
        if (config.draw.mode === "shape") {
          var value = config.draw.shape.selector.getAttribute("selected");
          if (value === "Line") config.draw.shape.line.active = false;
        }
      },
      "move": function (o) {
        if (config.draw.mode === "shape") {
          var value = config.draw.shape.selector.getAttribute("selected");
          if (value === "Line") {
            if (config.draw.shape.line.active) {
              config.draw.canvas.selection = false;
              var pointer = config.draw.canvas.getPointer(o.e);
              if (config.draw.shape.line.object) {
                config.draw.shape.line.object.set({"x2": pointer.x, "y2": pointer.y});
                config.draw.canvas.renderAll();
                config.listeners.object.updated();
              } 
            }
          }
        }
      },
      "wheel": function (o) {
        if (config.draw.keyborad.code === 16) {
          var delta = o.e.deltaY;
          var zoom = config.draw.canvas.getZoom();
          var point = {'x': o.e.offsetX, 'y': o.e.offsetY};
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
          var value = config.draw.shape.selector.getAttribute("selected");
          if (value === "Line") {
            config.draw.shape.line.active = true;
            var pointer = config.draw.canvas.getPointer(o.e);
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
          config.draw.mode = "brushing";
          config.listeners.selector.reset();
          e.target.setAttribute("selected", '');
          config.draw.canvas.isDrawingMode = true;
          this.setAttribute("selected", e.target.id);
          config.storage.write("draw.mode", config.draw.mode);
          /*  */
          config.draw.brushing.update();
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
          /*  */
          if (e.target.id === "Move") {
            config.draw.canvas.selection = true;
          }
          /*  */
          if (e.target.id === "Circle") {
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
          if (e.target.id === "Hexagon") {
            var points = config.draw.shape.generate.regular.polygon.points(6, 200);
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
          if (e.target.id === "Octagon") {
            var points = config.draw.shape.generate.regular.polygon.points(8, 200);
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
          if (e.target.id === "Triangle") {
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
          if (e.target.id === "Rect") {
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