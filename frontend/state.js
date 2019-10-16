
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

        this.xhttp = new XMLHttpRequest();

        jsonFile.onreadystatechange = function() {
            if (jsonFile.readyState== 4 && jsonFile.status == 200) {
                console.log('JSON loaded');
                this.state = JSON.parse(jsonFile.responseText);
                this.context = this.state;
                /*           if (!state.containers || !state.containers.output0){
                               var id = "output0";
                               var stateInfo = {left: 100, top: 100, conType:"out"};
                               //createNode(id, stateInfo);
                               var change = {path:["containers",id], value:stateInfo};
                               //console.log(change);
                               commitChange(change);
                           }*/
                if(!this.state.canvas){
                    var change = {path:["canvas"], value:{pos:[0,0], scale:1}};
                    this.commitChange(change);
                }
                callback();
            }
        }.bind(this);
    }


    commitChange(change) {
        //queue and send json, flush queue
        this.xhttp.open("POST", "http://localhost:3000", true);
        this.xhttp.send(JSON.stringify({type:"update", body: change}));

        var dest = this.state;
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
