import {followPath} from "./state.js";

const coderesource = document.getElementById('coderesource');

const codecontainer = document.getElementById('codecontainer');

const getRoutinePath = function(el){
    if(el === codecontainer){
        return ["state", "routine"];
    }
    if(el.classList.contains('inner')){
        el = el.parentNode.parentNode;
    }
    var path = getRoutinePath(el.parentNode);
    var i=0;
    while(el.previousElementSibling) {
        el=el.previousElementSibling;
        i++;
    }
    path.push(i);
    if(el.classList.contains('loopblock')){
        path.push('body');
    }
    return path;
};




export class RoutineManager {
    constructor(stateM){
        this.stateM = stateM;
        this.selection = undefined;
        document.addEventListener('click', function(evt){
            if(!evt.mycatch && this.selection){
                this.selection.classList.remove('myselect');
                var connected = document.getElementById(this.lookup(this.selection).connected);
                if(connected){
                    connected.classList.remove('myselect');
                }
            }
        }.bind(this));

    }

    lookup(el){
        return followPath(this.stateM, getRoutinePath(el));
    }

    connectNode(id){
        if(!this.selection) return;

        var change = {path: getRoutinePath(this.selection).concat(['connected']), value: id};
        this.stateM.commit(change);
        var change2 = {path: ['context', 'containers', id, 'connected'], value: true};
        this.stateM.commit(change2);
    }



}
