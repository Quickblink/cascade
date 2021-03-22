

export class FakeServer{
    constructor() {
        if (FakeServer.instance) {
            return FakeServer.instance;
        }
        FakeServer.instance = this;
    }

    init(json_string){
        //console.log(json_string)
        var server_file = new XMLHttpRequest();
        server_file.open("GET",document.URL+"server.py?"+ new Date().getTime(),true);
        server_file.send();
        server_file.onreadystatechange = function() {
            if (server_file.readyState== 4 && server_file.status == 200) {
                let python_code = server_file.responseText;
                languagePluginLoader.then(function () {
                    console.log('pyodide loaded');
                    pyodide.runPythonAsync("import micropip; micropip.install('"+document.URL+"lib/BinTorch-0.1-py3-none-any.whl')").then(function (){
                        pyodide.globals.json_string = json_string;
                        pyodide.runPythonAsync(python_code).then(function (){
                            console.log('initial python executed');
                            document.getElementById("loadscreen").style.visibility = 'hidden';
                        });
                    })
                });
            }
        }
    }

}



export class FakeHTTP {
    onreadystatechange(){
        //console.log('output: '+this.responseText);
    }

    open(blip, blop, blap) {
    }

    send(cmd) {
        pyodide.runPythonAsync('handler.do_POST(\''+cmd+'\')').then(function(output) {
            this.responseText = output;
            this.readyState = 4;
            this.status = 200;
            this.onreadystatechange();
        }.bind(this));
    }

}

