{
  var core = {};
  
  core.now = Date.now;
  core.ffmpeg = {"data": ''};
  
  core.log = function (data) {
    postMessage({"type": "stdout", "data": data});
  };

  onmessage = async function (e) {
    if (e) {
			if (e.data) {
				if (e.data.type) {
          if (e.data.type === "import") {
            if (e.data.path) {
              var response = await fetch(e.data.path + "ffmpeg-all-codecs.js");
              var responsecode = await response.text();
              var responseblob = new Blob([responsecode], {"type": "text/javascript"});				
              importScripts(URL.createObjectURL(responseblob));
            } else {
              importScripts("../vendor/ffmpeg-all-codecs.js");
            }
            /*  */
            postMessage({"type": "ready"});
          }
          /*  */
          if (e.data.type === "command") {
            var Module = {
              "print": core.log,
              "printErr": core.log,
              "TOTAL_MEMORY": 268435456,
              "files": e.data.files || [],
              "arguments": e.data.arguments || []
            };
            /*  */
            postMessage({"type" : "start", "data" : Module.arguments.join(' ')});
            postMessage({"type" : "stdout", "data" : ">> Command: " + Module.arguments.join(' ') + ((Module.TOTAL_MEMORY) ? ".\nProcessing with " + Module.TOTAL_MEMORY + " bits. Please wait...\n" : '')});
            /*  */
            var time = core.now();
            var result = ffmpeg_run(Module);
            var totaltimespent = core.now() - time;
            /*  */
            postMessage({"type" : "stdout", "data" : "\n>> Finished processing (" + totaltimespent / 1000 + " Seconds)"});
            postMessage({"type" : "done", "data" : result, "time" : totaltimespent});
          }
        }
      }
    }
  };
}