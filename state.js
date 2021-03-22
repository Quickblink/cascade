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
class Foo {
  constructor(msg) {

    if (Foo.instance) {
      return Foo.instance;
    }
    Foo.instance = this;
  }
}
    // Properties & Methods
}*/

import {CanvasManager} from "./canvas.js";
import {RoutineManager} from "./routines.js";
import {FakeServer, FakeHTTP} from "./fake_server.js";

const fakeServer = new FakeServer();

const canvasM = new CanvasManager();

const routineM = new RoutineManager();


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
    constructor(){
        if (StateManager.instance) {
            return StateManager.instance;
        }
        StateManager.instance = this;

        var jsonFile = new XMLHttpRequest();
        jsonFile.open("GET",document.URL+"state.json?"+ new Date().getTime(),true);


        this.xhttp = new FakeHTTP();

        jsonFile.onreadystatechange = function() {
            if (jsonFile.readyState== 4 && jsonFile.status == 200) {
                console.log('JSON loaded');
                this.state = JSON.parse(jsonFile.responseText);
                fakeServer.init(jsonFile.responseText);
                jsPlumb.ready(function () {
                    routineM.init();
                    canvasM.init();
                    this.loadContext();
                    routineM.loadRoutine();
                }.bind(this));

                // routineCallback();
            }
        }.bind(this);
        jsonFile.send();

    }

    loadContext(){
        this.context = this.state.mainContext;
        for (var i = 0; i < this.state.curContext.length; i++) {
            this.context = this.context.containers[this.state.curContext[i]].inner;
        }
        canvasM.loadContext();
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
        var exhttp = new FakeHTTP();
        exhttp.open("POST", document.URL, true);
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
        this.xhttp.open("POST", document.URL, true);
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

new StateManager();
