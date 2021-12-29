var config = {
  "running": false,
  "audio": {
    "data": null
  },
  "output": {
    "src": null
  },
  "reader": {
    "audio": new FileReader()
  },
  "file": {
    "audio": null, 
    "output": null
  },
  "nohandler": function (e) {
    e.preventDefault()
  },
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "prevent": {
    "scroll": false,
    "drop": function (e) {
      if (e.target.id.indexOf("-fileio") !== -1) return;
      e.preventDefault();
    }
  },
  "loadend": {
    "audio": function (e) {
      var arraybuffer = e.target.result;
      if (arraybuffer) config.audio.data = new Uint8Array(arraybuffer);
      config.loader.stop();
    }
  },
  "size": function (s) {
    if (s) {
      if (s >= Math.pow(2, 30)) {return (s / Math.pow(2, 30)).toFixed(1) + "GB"};
      if (s >= Math.pow(2, 20)) {return (s / Math.pow(2, 20)).toFixed(1) + "MB"};
      if (s >= Math.pow(2, 10)) {return (s / Math.pow(2, 10)).toFixed(1) + "KB"};
      return s + "B";
    } else return '';
  },
  "element": {
    "file": null,
    "input": null,
    "output": null,
    "loader": null,
    "command": null,
    "preview": null,
    "info": {"audio": null},
    "drop": {"audio": null}
  },
  "loadfile": function () {
    config.element.drop.audio.addEventListener("change", function (e) {
      if (e.target && e.target.files) {
        if (e.target.files.length && e.target.files[0]) {
          var file = e.target.files[0];
          config.loader.start();
          config.file.audio = file;
          config.reader.audio.readAsArrayBuffer(config.file.audio);
          config.element.info.audio.textContent = config.size(config.file.audio.size);
        }
      }
    }, false);
  },
  "loader": {
    "stop": function () {
      config.running = false;
      config.element.loader.style.display = "none";
      config.element.run.removeAttribute("running");
    },
    "start": function () {
      config.running = true;
      config.create.output.player("none");
      config.element.open.style.display = "none";
      config.element.loader.style.display = "block";
      config.element.download.style.display = "none";
      config.element.run.setAttribute("running", '');
    }
  },
  "download": function () {
    var a = document.querySelector('a');
    if (!a) {
      var src = config.create.output.src();
      if (src) {
        a = document.createElement('a');
        a.textContent = config.create.output.name;
        a.download = config.create.output.name;
        a.style.display = "none";
        a.href = src;
        a.click();
        window.setTimeout(function () {
          a.remove();
          URL.revokeObjectURL(config.create.output.blob);
        }, 1000);
      }
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
            /*  */
            chrome.runtime.connect({
              "name": config.port.name
            });
          }
        }
      }
      /*  */
      document.documentElement.setAttribute("context", config.port.name);
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
  "command": {
    "clear": function () {
      config.create.output.player("none");
      config.element.output.textContent = '';
      config.element.open.style.display = "none";
      config.element.download.style.display = "none";
    },
    "parse": function (text) {
      text = text.replace(/\s+/g, ' ');
      var args = [];
      text.split('"').forEach(function(t, i) {
        t = t.trim();
        if ((i % 2) === 1) args.push(t);
        else args = args.concat(t.split(" "));
      });
      return args;
    },
    "run": function (command) {
      if (!config.running && config.worker.ready) {
        config.loader.start();
        config.command.clear();
        /*  */
        var args = config.command.parse(command);
        var files = [{"name": "input", "buffer": config.audio.data}];
        var audio = config.audio.data && config.audio.data.byteLength;
        var options = audio ? {"type": "command", "arguments": args, "files": files} : {"type": "command", "arguments": args};
        /*  */
        config.worker.element.postMessage(options);
      }
    }
  },
  "create": {
    "output": {
      "ext": null,
      "blob": null,
      "name": null,
      "data": null,
      "src": function () {
        var data = config.file.output.data;
        var name = config.file.output.name;
        var ext = name.split('.').length ? name.split('.')[1] : null;
        if (ext) {
          config.create.output.ext = ext;
          config.create.output.name = name;
          config.create.output.data = data;
          config.create.output.blob = new Blob([data], {"type": "audio/" + ext});
          return URL.createObjectURL(config.create.output.blob);
        }
        /*  */
        return null;
      },
      "player": function (display) {
        config.element.preview.style.display = display;
        if (config.element.preview.children[1]) config.element.preview.children[1].remove();
        /*  */
        if (display === "block" && config.file.output) {
          var audio = document.createElement("audio");
          audio.setAttribute("controls", "controls");
          audio.setAttribute("preload", "metadata");
          config.element.preview.appendChild(audio);
          /*  */
          config.element.preview.children[1].src = config.output.src;
        }
      }
    }
  },
  "worker": {
    "ready": false,
    "element": null,
    "init": async function () {
      if (config.worker.element) config.worker.element.terminate();
      /*  */
      var context = document.documentElement.getAttribute("context");
      var url = chrome.runtime.getURL("/data/interface/resources/worker.js");
      /*  */
      if (context === "webapp") {
        var response = await fetch(url);
        var responsecode = await response.text();
        var responseblob = new Blob([responsecode], {"type": "text/javascript"});
        /*  */
        config.worker.element = new Worker(URL.createObjectURL(responseblob));  
        config.worker.element.postMessage({
          "type": "import", 
          "path": chrome.runtime.getURL("/data/interface/vendor/")
        });
      } else {
        config.worker.element = new Worker(url);
        config.worker.element.postMessage({
          "path": '',
          "type": "import"
        });
      }
      /*  */
      config.worker.element.onmessage = function (e) {
        var message = e.data;
        if (message.type === "start") {
          config.element.output.textContent = "Audio Converter received a command.\n\n";
        } else if (message.type === "stdout") {
          config.element.output.textContent += message.data + "\n";
          if (config.prevent.scroll === false) config.element.output.scrollTop = config.element.output.scrollHeight || 0;
        } else if (message.type === "ready") {
          config.loader.stop();
          config.worker.ready = true;
          config.element.output.textContent = "Audio Converter is ready!\n\nPlease type a command (i.e. -help) in the above field and then click on the - Run - button to start.\nAlternatively, you can click on a sample command above to insert one into the above input filed.\nThen, click on the - Run - button on the right side to execute your command.\nIf you want to clear the console, please click on the - Clear - button.";
        } else if (message.type === "done") {
          config.loader.stop();
          var output = Object.keys(message.data.outputFiles);
          if (message.data.code === 0 && output.length) {
            config.file.output = {"name": output[0], "data": message.data.outputFiles[output[0]]};
            if (config.file.output) {
              config.output.src = config.create.output.src();
              if (config.output.src) {
                config.element.open.style.display = "inline-block";
                config.element.download.style.display = "inline-block";
                /*  */
                window.setTimeout(function () {
                  config.create.output.player("block");
                }, 300);
              }
            }
          }
        }
      };
    }
  },
  "load": function () {
    var reload = document.getElementById("reload");
    var support = document.getElementById("support");
    var donation = document.getElementById("donation");
    var actions = [...document.querySelectorAll(".action")];
    /*  */
    config.element.run = document.querySelector(".run");
    config.element.clear = document.querySelector(".clear");
    config.element.input = document.querySelector("#input");
    config.element.open = document.querySelector(".preview");
    config.element.output = document.querySelector("#output");
    config.element.loader = document.querySelector("#loader");
    config.element.preview = document.querySelector("#preview");
    config.element.download = document.querySelector(".download");
    config.element.drop.audio = document.getElementById("audio-fileio");
    config.element.info.audio = document.getElementById("audio-fileinfo");
    /*  */
    config.loadfile();
    config.worker.init();
    /*  */
    config.element.download.addEventListener("click", config.download);
    config.reader.audio.addEventListener("loadend", config.loadend.audio, false);
    config.element.open.addEventListener("click", function () {config.create.output.player("block")});
    config.element.preview.children[0].addEventListener("click", function () {config.create.output.player("none")});
    config.element.output.addEventListener("scroll", function () {config.prevent.scroll = config.element.output.scrollHeight - config.element.output.clientHeight > config.element.output.scrollTop + 1});
    /*  */
    reload.addEventListener("click", function () {
      document.location.reload();
    });
    /*  */
    config.element.clear.addEventListener("click", function () {
      config.command.clear();
    });
    /*  */
    config.element.run.addEventListener("click", function () {
      config.command.run(config.element.input.value);
    });
    /*  */
    config.element.input.addEventListener("keydown", function (e) {
      if (e.keyCode === 13) {
        config.command.run(config.element.input.value);
      }
    }, false);
    /*  */
    actions.forEach(function (action) {
      action.addEventListener("click", function (e) {
        var command = e.target.getAttribute("data-command");
        config.element.input.value = command;
      });
    });
    /*  */
    support.addEventListener("click", function () {
      if (config.port.name !== "webapp") {
        var url = config.addon.homepage();
        chrome.tabs.create({"url": url, "active": true});
      }
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      if (config.port.name !== "webapp") {
        var url = config.addon.homepage() + "?reason=support";
        chrome.tabs.create({"url": url, "active": true});
      }
    }, false);
    /*  */
    window.removeEventListener("load", config.load, false);
  }
};

config.port.connect();

window.addEventListener("load", config.load, false);
document.addEventListener("drop", config.prevent.drop, true);
window.addEventListener("resize", config.resize.method, false);
document.addEventListener("dragover", config.prevent.drop, true);
