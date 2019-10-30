/* type, body

   type: execute, body:
        id: output element id

   type: contextSwitch, body:
        newContext: list of context path

   type: update, body:
        path: list of dict keys
        value: new value
        delete: boolean
        strict: boolean, replace old value, otherwise merge
        deep: boolean, merge deeply
*
*
*   changes: start path with context/state
        mode: 'replace', 'merge', 'deep merge', 'insert', 'delete'
*       sourceMode: 'copy', 'move', undefined
*
* */
/*
export class Singleton {
    constructor () {
        if (!Singleton.instance) {
            Singleton.instance = this
        }
        // Initialize object
        return Singleton.instance
    }
    // Properties & Methods
}*/



const isObject = function(obj) {
    return typeof obj === 'object' && !!obj;
};

const joinObjects = function(obj1, obj2, deep){
    // TODO: add deep merge
    for (var attrname in obj2) { obj1[attrname] = obj2[attrname];}
};

export const followPath = function (dict, path) {
    for (var i = 0; i < path.length - 1; i++) {
        if (!isObject(dict[path[i]])){
            if(typeof path[i+1] === 'string'){
                dict[path[i]] = {};
            }else{
                dict[path[i]] = [];
            }
        }
        dict = dict[path[i]];
    }
    return dict;
};


export class StateManager{
    constructor(callback, routineCallback){
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
                routineCallback();
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

        if(!change.mode){
            change.mode = 'merge';
        }

        console.log(change);

        //queue and send json, flush queue
        this.xhttp.open("POST", "http://localhost:3000", true);
        this.xhttp.send(JSON.stringify({type:"update", body: change}));

        var dest = undefined;
        //console.log(change.path[change.path.length-1]);
        var last = change.path[change.path.length-1];
        
        var value = change.value;

        if(change.sourceMode){
            if(change.value.length > change.path.length && change.mode === 'insert'){
                dest = followPath(this, change.path);
                dest.splice(last, 0, undefined);
                change.mode = 'replace';
            }
            var src = followPath(this, change.value);
            var srcKey = change.value[change.value.length-1];
            value = src[srcKey];
            if(change.sourceMode === 'move'){
                if(Array.isArray(src)){
                    src.splice(srcKey, 1);
                }else{
                    delete src[srcKey];
                }
            }
        }

        if(!dest){
            dest = followPath(this, change.path);
        }

        switch (change.mode) {
            case 'delete':
                if(Array.isArray(dest)){
                    dest.splice(last, 1);
                }else{
                    delete dest[last];
                }
                break;
            case 'merge':
                if(isObject(dest[last])){ //TODO: handle list merge
                    joinObjects(dest[last], value, false);
                    break;
                }
            case 'replace':
                dest[last] = value;
                break;
            case 'insert':
                dest.splice(last, 0, value);
                break;
            default:
                console.error('Used unknown commit mode.');

        }




    }


}
