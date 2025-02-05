var config = {
  "nohandler": function (e) {
    e.preventDefault();
  },
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "ffmpeg": {
    "URL": {
      "base": chrome.runtime.getURL("/data/interface/vendor/"),
      "core": chrome.runtime.getURL("/data/interface/vendor/ffmpeg-core.js"),
      "wasm": chrome.runtime.getURL("/data/interface/vendor/ffmpeg-core.wasm")
    },
  },
  "prevent": {
    "scroll": false,
    "drop": function (e) {
      if (e.target.id.indexOf("-fileio") !== -1) return;
      e.preventDefault();
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
          let tmp = {};
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
  "load": function () {
    const reload = document.getElementById("reload");
    const support = document.getElementById("support");
    const donation = document.getElementById("donation");
    const actions = [...document.querySelectorAll(".action")];
    /*  */
    config.app.element.run = document.querySelector(".run");
    config.app.element.clear = document.querySelector(".clear");
    config.app.element.input = document.querySelector("#input");
    config.app.element.open = document.querySelector(".preview");
    config.app.element.output = document.querySelector("#output");
    config.app.element.loader = document.querySelector("#loader");
    config.app.element.preview = document.querySelector("#preview");
    config.app.element.download = document.querySelector(".download");
    config.app.element.drop.audio = document.getElementById("audio-fileio");
    config.app.element.info.audio = document.getElementById("audio-fileinfo");
    /*  */
    config.app.worker.init();
    config.app.listener.fileio();
    /*  */
    config.app.element.download.addEventListener("click", config.app.download);
    config.app.file.reader.addEventListener("loadend", config.app.listener.loadend);
    config.app.element.output.addEventListener("scroll", config.app.listener.scroll);
    config.app.element.open.addEventListener("click", function () {config.app.create.output.player("block")});
    config.app.element.preview.children[0].addEventListener("click", function () {config.app.create.output.player("none")});
    /*  */
    reload.addEventListener("click", function () {
      document.location.reload();
    });
    /*  */
    config.app.element.clear.addEventListener("click", function () {
      config.app.command.clear();
    });
    /*  */
    config.app.element.run.addEventListener("click", function () {
      config.app.command.run(config.app.element.input.value);
    });
    /*  */
    config.app.element.input.addEventListener("keydown", function (e) {
      if (e.keyCode === 13) {
        config.app.command.run(config.app.element.input.value);
      }
    }, false);
    /*  */
    actions.forEach(function (action) {
      action.addEventListener("click", function (e) {
        const command = e.target.getAttribute("data-command");
        config.app.element.input.value = command;
      });
    });
    /*  */
    support.addEventListener("click", function () {
      if (config.port.name !== "webapp") {
        const url = config.addon.homepage();
        chrome.tabs.create({"url": url, "active": true});
      }
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      if (config.port.name !== "webapp") {
        const url = config.addon.homepage() + "?reason=support";
        chrome.tabs.create({"url": url, "active": true});
      }
    }, false);
    /*  */
    window.removeEventListener("load", config.load, false);
  },
  "app": {
    "running": false,
    "audio": {
      "src": null,
      "data": null,
      "buffer": null
    },
    "file": {
      "input": {},
      "output": {},
      "reader": new FileReader()
    },
    "element": {
      "file": null,
      "input": null,
      "output": null,
      "loader": null,
      "command": null,
      "preview": null,
      "info": {
        "audio": null
      },
      "drop": {
        "audio": null
      }
    },
    "loader": {
      "stop": function (loc) {
        config.app.running = false;
        config.app.element.loader.style.display = "none";
        config.app.element.run.removeAttribute("running");
      },
      "start": function () {
        config.app.running = true;
        config.app.create.output.player("none");
        config.app.element.open.style.display = "none";
        config.app.element.loader.style.display = "block";
        config.app.element.download.style.display = "none";
        config.app.element.run.setAttribute("running", '');
      }
    },
    "download": function () {
      let a = document.querySelector('a');
      if (!a) {
        const src = config.app.create.output.src();
        if (src) {
          a = document.createElement('a');
          a.textContent = config.app.create.output.name;
          a.download = config.app.create.output.name;
          a.style.display = "none";
          a.href = src;
          a.click();
          /*  */
          window.setTimeout(function () {
            a.remove();
            URL.revokeObjectURL(config.app.create.output.blob);
          }, 1000);
        }
      }
    },
    "listener": {
      "scroll": function () {
        config.prevent.scroll = config.app.element.output.scrollHeight - config.app.element.output.clientHeight > config.app.element.output.scrollTop + 1;
      },
      "loadend": function (e) {
        config.app.loader.stop(1);
        config.app.audio.buffer = e.target.result;
        if (config.app.audio.buffer) {
          const size = config.size(config.app.file.input.size);
          config.app.audio.data = new Uint8Array(config.app.audio.buffer);
          config.app.element.info.audio.textContent = "File size: " + size;
          config.app.element.output.textContent += "> The " + config.app.file.input.name + " (" + size + ") file is ready, please continue." + "\n";
        }
      },
      "fileio": function () {
        config.app.element.drop.audio.addEventListener("change", function (e) {
          if (e.target) {
            if (e.target.files) {
              if (e.target.files.length && e.target.files[0]) {
                const file = e.target.files[0];
                /*  */
                config.app.loader.start();
                config.app.file.input = file;
                config.app.file.reader.readAsArrayBuffer(config.app.file.input);
                config.app.element.output.textContent += "> Reading the input file, please wait..." + "\n";
              }
            }
          }
        }, false);
      }
    },
    "create": {
      "output": {
        "ext": null,
        "blob": null,
        "name": null,
        "data": null,
        "src": function () {
          const name = config.app.file.output.name;
          const data = config.app.file.output.data;
          const ext = name.split('.').length ? name.split('.')[1] : null;
          if (ext) {
            config.app.create.output.ext = ext;
            config.app.create.output.name = name;
            config.app.create.output.data = data;
            config.app.create.output.blob = new Blob([data], {"type": "audio/" + ext});
            return URL.createObjectURL(config.app.create.output.blob);
          }
          /*  */
          return null;
        },
        "player": function (display) {
          config.app.element.preview.style.display = display;
          if (config.app.element.preview.children[1]) {
            config.app.element.preview.children[1].remove();
          }
          /*  */
          if (display === "block" && config.app.file.output.name) {
            const name = config.app.file.output.name;
            if (name && name.match(/\.jpeg|\.gif|\.jpg|\.png|\.bmp|\.tiff|\.tif/)) {
              const img = document.createElement("img");
              config.app.element.preview.appendChild(img);
            } else {
              const audio = document.createElement("audio");
              audio.setAttribute("controls", "controls");
              audio.setAttribute("preload", "metadata");
              config.app.element.preview.appendChild(audio);
            }
            /*  */
            config.app.element.preview.children[1].src = config.app.audio.src;
          }
        }
      }
    },
    "command": {
      "clear": function () {
        config.app.create.output.player("none");
        config.app.element.output.textContent = '';
        config.app.element.open.style.display = "none";
        config.app.element.download.style.display = "none";
      },
      "parse": function (text) {
        let args = [];
        /*  */
        text = text.replace(/\s+/g, ' ');
        text.split('"').forEach(function(t, i) {
          t = t.trim();
          if ((i % 2) === 1) {
            args.push(t);
          } else {
            args = args.concat(t.split(' '));
          }
        });
        /*  */
        return args;
      },
      "run": async function (command) {
        if (config.app.worker.ready) {
          if (config.app.running === false) {
            config.app.loader.start();
            config.app.command.clear();
            /*  */
            try {
              if (config.app.file.input.name) {
                if (command.indexOf("-i input") !== -1) {
                  command = command.replace("input", config.app.file.input.name);
                }
              }
              /*  */
              const args = config.app.command.parse(command);
              if (args && args.length) {
                if (config.app.audio.data) {
                  if (config.app.audio.data.byteLength) {
                    if (command.indexOf(config.app.file.input.name) !== -1) {
                      config.app.file.output.name = args[args.length - 1];
                      await config.ffmpeg.core.writeFile(config.app.file.input.name, config.app.audio.data);
                    }
                  } else {
                    config.app.file.reader.readAsArrayBuffer(config.app.file.input);
                    config.app.element.output.textContent += "> Reading the input file, please wait..." + "\n";
                    return;
                  }
                } else {
                  config.app.loader.stop(2);
                }
                /*  */
                config.ffmpeg.core.exec(args);
              }
            } catch (e) {
              config.app.loader.stop(3);
              config.app.element.run.textContent = "run";
              config.app.element.output.textContent += "> An unexpected error happened!" + "\n";
            }
          }
        }
      }
    },
    "worker": {
      "ready": false,
      "init": async function () {
        try {
          config.app.element.output.textContent = "Audio Converter is getting ready, please wait...\n";
          /*  */
          await import(config.ffmpeg.URL.base + "ffmpeg.js");
          config.ffmpeg.core = new FFmpegWASM.FFmpeg();
          await config.ffmpeg.core.load({
            "coreURL": config.ffmpeg.URL.core, 
            "wasmURL": config.ffmpeg.URL.wasm
          });
          /*  */
          config.app.loader.stop(4);
          config.app.worker.ready = true;
          config.app.element.output.textContent = "Audio Converter is ready!\n\nPlease type a command (i.e. -help) in the above field and then click on the - Run - button to start.\nAlternatively, you can click on a sample command above to insert one into the above input filed.\nThen, click on the - Run - button on the right side to execute your command.\nIf you want to clear the console, please click on the - Clear - button." + "\n\n";
          /*  */
          config.ffmpeg.core.on("log", function (e) {
            if (e) {
              let type = e.type;
              let message = e.message;
              let prefix = type === "stdout" ? "> " : "• ";
              let aborted = message.indexOf("Aborted") !== -1;
              /*  */
              if (message) {
                if (aborted) config.app.loader.stop(5);
                config.app.element.output.textContent += (aborted ? ">> End" : prefix + message) + "\n";
                if (config.prevent.scroll === false) {
                  config.app.element.output.scrollTop = config.app.element.output.scrollHeight || 0;
                }
              }
            }
          });
          /*  */
          config.ffmpeg.core.on("progress", async function (e) {
            if (e) {
              if (e.progress === 1) {
                config.app.loader.stop(5);
                config.app.element.run.textContent = "run";
                config.app.file.output.data = await config.ffmpeg.core.readFile(config.app.file.output.name);
                if (config.app.file.output.data) {
                  config.app.audio.src = config.app.create.output.src();
                  if (config.app.audio.src) {
                    config.app.element.open.style.display = "inline-block";
                    config.app.element.download.style.display = "inline-block";
                    await config.ffmpeg.core.deleteFile(config.app.file.input.name);
                    await config.ffmpeg.core.deleteFile(config.app.file.output.name);
                    /*  */
                    window.setTimeout(function () {
                      config.app.create.output.player("block");
                    }, 300);
                  }
                }
              } else {
                config.app.element.run.textContent = e.progress < 1 ? Math.floor(e.progress * 100) + '%' : "•••";
              }
            }
          });
        } catch (e) {
          config.app.loader.stop(6);
          config.app.element.run.textContent = "run";
          config.app.element.output.textContent += "> An unexpected error happened!" + "\n";
        }
      }
    }
  }
};

config.port.connect();

document.addEventListener("drop", config.prevent.drop, true);
document.addEventListener("dragover", config.prevent.drop, true);

window.addEventListener("load", config.load, false);
window.addEventListener("resize", config.resize.method, false);
