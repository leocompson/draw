var config  = {
  "resize": {"timeout": null},
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "print": function () {
    if (config.connect.name === "page") {
      chrome.runtime.sendMessage({"action": "print"});
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
  "connect": {
    "port": '',
    "name": "page",
    "to": {
      "background": {
        "page": function () {
          if (config.connect.name === "popup") {
            document.body.style.width = "800px";
            document.body.style.height = "580px";
            document.documentElement.setAttribute("context", "extension");
          }
          /*  */
          if (config.connect.name === "page") {
            document.documentElement.setAttribute("context", "page");
          } else {
            config.connect.port = chrome.runtime.connect({"name": config.connect.name});
          }
        }
      }
    }
  },
  "storage": {
    "local": {},
    "read": function (id) {return config.storage.local[id]},
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
      config.draw.shape.selector.value = config.storage.read("shape.selector") !== undefined ? config.storage.read("shape.selector") : "Circle";
      config.draw.shape.stroke.color.value = config.storage.read("stroke.color") !== undefined ? config.storage.read("stroke.color") : "#c7c7c7";
      config.draw.brushing.shadow.color.value = config.storage.read("shadow.color") !== undefined ? config.storage.read("shadow.color") : "#777777";
      config.draw.brushing.selector.value = config.storage.read("brushing.selector") !== undefined ? config.storage.read("brushing.selector") : "Pencil";
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
      config.draw.canvas = new fabric.Canvas(config.draw.id, config.draw.options);
      config.draw.canvas.on("object:modified", config.listeners.object.updated);
      config.draw.canvas.on("object:added", config.listeners.object.updated);
      config.draw.canvas.on("mouse:wheel", config.listeners.mouse.wheel);
      config.draw.canvas.on("mouse:move", config.listeners.mouse.move);
      config.draw.canvas.on("mouse:down", config.listeners.mouse.down);
      config.draw.canvas.on("mouse:up", config.listeners.mouse.up);
      /*  */
      window.setTimeout(function () {config.draw[config.draw.mode].label.click()}, 300);
      config.draw.canvas.isDrawingMode = config.draw.mode === "brushing";
      config.draw.brushing.controls.style.display = "block";
      /*  */
      var last = config.storage.read("last.draw");
      if (last) {
        config.draw.canvas.loadFromJSON(JSON.parse(last));
        config.draw.canvas.renderAll();
      }
    }
  },
  "draw": {
    "mode": '',
    "screen": 0,
    "history": [],
    "canvas": null,
    "clipboard": null,
    "keyborad": {"code": null},
    "id": "draw-on-page-canvas",
    "options": {"width": "2560", "height": "2560"},
    "save": function () {
      var current = config.draw.history[config.draw.history.length - 1];
      config.storage.write("last.draw", JSON.stringify(current));
    },
    "copy": function () {
      config.draw.canvas.getActiveObject().clone(function (cloned) {
        config.draw.clipboard = cloned;
      });
    },
    "convert": {
      "to": {
        "hex": function (opacity) {
          return ((opacity * 255) | 1 << 8).toString(16).slice(1);
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
          var objects = config.draw.canvas.getActiveObjects();
          objects.forEach(function (e) {
            config.draw.canvas.remove(e);
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
        cloned.set({"evented": true, "top": 50, "left": 50});
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
        config.draw.canvas.requestRenderAll();
      });
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
          var key = config.draw.brushing.selector.value + "Brush";
          config.draw.canvas.freeDrawingBrush = new fabric[key](config.draw.canvas);
          if (config.draw.canvas.freeDrawingBrush) {
            var opacity = config.draw.convert.to.hex(config.draw.brushing.line.opacity.value);
            config.draw.canvas.freeDrawingBrush.color = config.draw.brushing.line.color.value + opacity;
            config.draw.canvas.freeDrawingBrush.width = parseInt(config.draw.brushing.line.width.value, 10) || 1;
            config.draw.canvas.freeDrawingBrush.shadow = new fabric.Shadow(config.draw.brushing.options(config.draw.brushing.shadow));
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
      config.draw.shape.fill.color.addEventListener("input", function () {
        config.storage.write("fill.color", this.value);
      });
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
      config.draw.brushing.line.color.addEventListener("input", function () {
        config.storage.write("line.color", this.value);
        var opacity = config.draw.convert.to.hex(config.draw.brushing.line.opacity.value);
        config.draw.canvas.freeDrawingBrush.color = this.value + opacity;
      });
      /*  */
      config.draw.brushing.shadow.color.addEventListener("input", function () {
        config.storage.write("shadow.color", this.value);
        config.draw.canvas.freeDrawingBrush.shadow.color = this.value;
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
    }
  },
  "make": {
    "draggable": function () {
      var x = {"init": null, "first": null};
      var y = {"init": null, "first": null};
      /*  */
      var drag = function (e) {
        config.draw.brushing.controls.style.top = y.init + e.pageY - y.first + "px";
        config.draw.brushing.controls.style.left = x.init + e.pageX - x.first + "px";
        /*  */
        config.storage.write("controls.top", config.draw.brushing.controls.style.top);
        config.storage.write("controls.left", config.draw.brushing.controls.style.left);
      };
      /*  */
      var swipe = function (e) {
        var touch = e.touches;
        config.draw.brushing.controls.style.top = y.init + touch[0].pageY - y.first + "px";
        config.draw.brushing.controls.style.left = x.init + touch[0].pageX - x.first + "px";
        /*  */
        config.storage.write("controls.top", config.draw.brushing.controls.style.top);
        config.storage.write("controls.left", config.draw.brushing.controls.style.left);
      };
      /*  */
      config.draw.brushing.controls.addEventListener("mousedown", function (e) {        
        if (e.target.getAttribute("drag") === "disabled") return;
        e.preventDefault();
        /*  */
        x.first = e.pageX;
        y.first = e.pageY;
        y.init = config.draw.brushing.controls.offsetTop;
        x.init = config.draw.brushing.controls.offsetLeft;
        /*  */
        config.draw.brushing.controls.addEventListener("mousemove", drag, false);
        window.addEventListener("mouseup", function () {
          config.draw.brushing.controls.removeEventListener("mousemove", drag, false);
        }, false);
      }, false);
      /*  */
      config.draw.brushing.controls.addEventListener("touchstart", function (e) {
        var touch = e.touches;
        if (touch[0].getAttribute("drag") === "disabled") return;
        e.preventDefault();
        /*  */
        x.first = touch[0].pageX;
        y.first = touch[0].pageY;
        y.init = config.draw.brushing.controls.offsetTop;
        x.init = config.draw.brushing.controls.offsetLeft;
        /*  */
        config.draw.brushing.controls.addEventListener("touchmove", swipe, false);
        window.addEventListener("touchend", function (e) {
          if (e.touches[0].getAttribute("drag") === "disabled") return;
          e.preventDefault();
          config.draw.brushing.controls.removeEventListener("touchmove", swipe, false);
        }, false);
      }, false);
    }
  },
  "listeners": {
    "object": {
      "updated": function (e) {        
        var screen = JSON.stringify(e.target.canvas);
        if (config.draw.history.indexOf(screen) === -1) {
          config.draw.history.push(screen);
        }
      }
    },
    "mouse": {
      "up": function () {
        if (config.draw.mode === "shape") {
          if (config.draw.shape.selector.value === "Line") {
            config.draw.shape.line.active = false;
          }
        }
      },
      "move": function (o) {
        if (config.draw.mode === "shape") {
          if (config.draw.shape.selector.value === "Line") {
            if (config.draw.shape.line.active) {
              config.draw.canvas.selection = false;
              var pointer = config.draw.canvas.getPointer(o.e);
              if (config.draw.shape.line.object) {
                config.draw.shape.line.object.set({"x2": pointer.x, "y2": pointer.y});
                config.draw.canvas.renderAll();
              } 
            }
          }
        }
      },
      "wheel": function (o) {
        if (config.draw.keyborad.code === 17) {
          var delta = o.e.deltaY;
          var zoom = config.draw.canvas.getZoom();
          /*  */
          zoom *= 0.9999 ** delta;
          if (zoom > 20) zoom = 20;
          if (zoom < 0.01) zoom = 0.01;
          /*  */
          config.draw.canvas.setZoom(zoom);
          o.e.preventDefault();
          o.e.stopPropagation();
        }
      },
      "down": function (o) {
        if (config.draw.mode === "shape") {
          if (config.draw.shape.selector.value === "Line") {
            config.draw.shape.line.active = true;
            var pointer = config.draw.canvas.getPointer(o.e);
            config.draw.shape.line.object = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
              "originY": "center",
              "originX": "center",
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
      "brushing": function (e) {
        config.draw.mode = "brushing";
        config.draw.canvas.isDrawingMode = true;
        config.storage.write("draw.mode", config.draw.mode);
        config.draw.shape.label.removeAttribute("selected");
        config.draw.brushing.label.setAttribute("selected", '');
        /*  */        
        if (e.target.nodeName === "OPTION") {
          this.value = e.target.value;
          config.draw.brushing.update();
          config.storage.write("brushing.selector", e.target.value);
        }
      },
      "shape": function (e) {
        config.draw.mode = "shape";
        config.draw.canvas.selection = true;
        config.draw.canvas.isDrawingMode = false;
        config.storage.write("draw.mode", config.draw.mode);
        config.draw.shape.label.setAttribute("selected", '');
        config.draw.brushing.label.removeAttribute("selected");
        /*  */
        if (e.target.nodeName === "OPTION") {
          this.value = e.target.value;
          config.storage.write("shape.selector", e.target.value);
          /*  */
          if (e.target.value === "Move") {
            config.draw.canvas.selection = true;
          }
          /*  */
          if (e.target.value === "Circle") {
            config.draw.canvas.add(new fabric.Circle({
              "top": 100, 
              "left": 100,
              "radius": 200,
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            }));
          }
          /*  */
          if (e.target.value === "Hexagon") {
            var points = config.draw.shape.generate.regular.polygon.points(6, 200);
            config.draw.canvas.add(new fabric.Polygon(points, {
              "top": 100, 
              "left": 100,
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            }));
          }
          /*  */
          if (e.target.value === "Octagon") {
            var points = config.draw.shape.generate.regular.polygon.points(8, 200);
            config.draw.canvas.add(new fabric.Polygon(points, {
              "top": 100, 
              "left": 100,
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            }));
          }
          /*  */
          if (e.target.value === "Triangle") {
            config.draw.canvas.add(new fabric.Triangle({
              "top": 100, 
              "left": 100,
              "width": 400,
              "height": 300,
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            }));
          }
          /*  */
          if (e.target.value === "Rect") {
            config.draw.canvas.add(new fabric.Rect({
              "top": 50,
              "left": 100,
              "width": 500,
              "height": 300,
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

var load = function () {
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
  config.draw.shape.selector = document.getElementById("draw-shape-selector");
  config.draw.shape.fill.color = document.getElementById("draw-shape-fill-color");
  config.draw.brushing.selector = document.getElementById("draw-brushing-selector");
  config.draw.shape.fill.opacity = document.getElementById("draw-shape-fill-opacity");
  config.draw.shape.label = document.querySelector("label[for='draw-shape-selector']");
  config.draw.brushing.line.color = document.getElementById("draw-brushing-line-color");
  config.draw.brushing.line.width = document.getElementById("draw-brushing-line-width");
  config.draw.shape.stroke.width = document.getElementById("draw-brushing-stroke-width");
  config.draw.shape.stroke.color = document.getElementById("draw-brushing-stroke-color");
  config.draw.brushing.line.opacity = document.getElementById("draw-brushing-line-opacity");
  config.draw.brushing.shadow.width = document.getElementById("draw-brushing-shadow-width");
  config.draw.brushing.shadow.color = document.getElementById("draw-brushing-shadow-color");
  config.draw.brushing.shadow.offset = document.getElementById("draw-brushing-shadow-offset");
  config.draw.brushing.label = document.querySelector("label[for='draw-brushing-selector']");
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
    var code = e.keyCode ? e.keyCode : e.which;
    config.draw.keyborad.code = code;
    /*  */
    if (e.ctrlKey && code === 67) config.draw.copy();
    if (e.ctrlKey && code === 89) config.draw.redo();
    if (e.ctrlKey && code === 90) config.draw.undo();
    if (e.ctrlKey && code === 86) config.draw.paste();
    if (code === 46) config.draw.remove.active.objects();
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
      config.draw.canvas.clear();
      config.storage.write("last.draw", '');
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
  zoomout.addEventListener("click", function () {config.draw.zoom.out()});
  reload.addEventListener("click", function () {document.location.reload()});
  close.addEventListener("click", function () {chrome.runtime.sendMessage({"action": "close"})});
  /*  */
  config.storage.load(config.app.start);
  window.removeEventListener("load", load, false);
};

window.addEventListener("resize", function () {
  if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
  config.resize.timeout = window.setTimeout(function () {
    config.storage.write("width", window.innerWidth || window.outerWidth);
    config.storage.write("height", window.innerHeight || window.outerHeight);
  }, 1000);
}, false);

if (document.location.search === "?tab") config.connect.name = "tab";
if (document.location.search === "?win") config.connect.name = "win";
if (document.location.search === "?popup") config.connect.name = "popup";

config.connect.to.background.page();
window.addEventListener("load", load, false);
