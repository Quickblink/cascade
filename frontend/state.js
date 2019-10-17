
const isObject = function(obj) {
    return typeof obj === 'object' && !!obj;
};

const joinObjects = function(obj1, obj2, deep){
    // TODO: add deep merge
    for (var attrname in obj2) { obj1[attrname] = obj2[attrname];}
};


export class StateManager{
    constructor(callback){
        var jsonFile = new XMLHttpRequest();
        jsonFile.open("GET","http://localhost:3000/state.json?"+ new Date().getTime(),true);
        jsonFile.send();

        this.loadfromState = callback;

        this.xhttp = new XMLHttpRequest();

        jsonFile.onreadystatechange = function() {
            if (jsonFile.readyState== 4 && jsonFile.status == 200) {
                console.log('JSON loaded');
                this.state = JSON.parse(jsonFile.responseText);
                this.loadContext();
            }
        }.bind(this);
    }

    loadContext(){
        this.context = this.state.mainContext;
        for (var i = 0; i < this.state.curContext.length; i++) {
            this.context = this.context.containers[this.state.curContext[i]].inner;
        }
        this.loadfromState();
    }

    switchDown(id){
        this.state.curContext.push(id);
        this.switchContext(this.state.curContext);
    }

    switchUp(){
        this.state.curContext.pop();
        this.switchContext(this.state.curContext);
    }

    switchContext(newContext){
        var exhttp = new XMLHttpRequest();
        exhttp.open("POST", "http://localhost:3000", true);
        exhttp.send(JSON.stringify({type:"contextSwitch", body: newContext}));
        this.state.curContext = newContext;
        this.loadContext();
    }

    commitChange(change) {
        //queue and send json, flush queue
        this.xhttp.open("POST", "http://localhost:3000", true);
        this.xhttp.send(JSON.stringify({type:"update", body: change}));

        var dest = this.context;
        for (var i = 0; i < change.path.length - 1; i++) {
            if (!isObject(dest[change.path[i]])){
                dest[change.path[i]] = {};
            }
            dest = dest[change.path[i]];
        }
        //console.log(change.path[change.path.length-1]);
        var last = change.path[change.path.length-1];
        if (change.delete){
            //dest[last] = undefined;
            delete dest[last];
        }else if (change.strict || !isObject(dest[last])){
            dest[last] = change.value;
        }else{
            joinObjects(dest[last], change.value, change.deep);
        }
    }


}
