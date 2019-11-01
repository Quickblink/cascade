import {StateManager, followPath} from "./state.js";
import {Sortable, OnSpill} from '/lib/sortable.core.esm.js';

Sortable.mount(OnSpill);


let stateM = undefined;


const coderesource = document.getElementById('coderesource');

const codecontainer = document.getElementById('codecontainer');

const routineButton = document.getElementById('routineButton');

let exhttp = new XMLHttpRequest();

routineButton.addEventListener('click', function () {
    exhttp.open("POST", "http://localhost:3000", true);
    exhttp.send(JSON.stringify({type:"routine"}));
});

document.getElementById('initializeButton').addEventListener('click', function () {
    exhttp.open("POST", "http://localhost:3000", true);
    exhttp.send(JSON.stringify({type:"initialize"}));
});

let selection = undefined;

function clickHandler(evt){
    console.log(evt);
    globalHandler(evt); //TODO: unselect in state as well
    evt.mycatch = true;
    selection = evt.target;
    selection.classList.add('myselect');
    console.log(getRoutinePath(selection), lookup(selection));
    const connected = document.getElementById(lookup(selection).connected);
    if(connected){
        connected.classList.add('myselect');
    }
}

function globalHandler(evt){
    if(!evt.mycatch && selection){
        selection.classList.remove('myselect');
        const connected = document.getElementById(lookup(selection).connected);
        // console.log(lookup(selection));
        if(connected){
            connected.classList.remove('myselect');
        }
        selection = undefined;
    }
}

document.addEventListener('click', globalHandler);


function prepareLoopblock(item){
    Sortable.create(item.querySelector('.coderight'), sortconfig);
    let input = item.querySelector('.loopinput');
    let dic = lookup(item);
    if(dic.text){
        input.value = dic.text;
    }
    input.disabled = false;
    input.addEventListener('keyup', function() {
        let change = {path:getRoutinePath(item), value:{text:this.value}};
        stateM.commitChange(change);
    });
}


function onNew(evt){ //onRemove from coderesource
    if(evt.item.classList.contains('loopblock')){
        prepareLoopblock(evt.item);
    }else if(evt.item.classList.contains('execute')){
        evt.item.addEventListener('click', clickHandler)
    }

    var path = getRoutinePath(evt.to);
    path.push(evt.newIndex);
    var change = {path:path, value:{class: evt.item.classList[0]}, mode: 'insert'};
    stateM.commitChange(change);
}

function onDelete(evt){
    evt.item.parentNode.removeChild(evt.item);
    var path = getRoutinePath(evt.from);// ["state", "routine"].concat(evt.from.mypath);
    path.push(evt.oldIndex);
    var change = {path:path, mode: 'delete'};
    stateM.commitChange(change);
}

function onMove(evt){
    console.log(evt);
    var pathFrom = getRoutinePath(evt.from); // ["state", "routine"].concat(evt.from.mypath);
    pathFrom.push(evt.oldIndex);
    var pathTo = getRoutinePath(evt.to); // ["state", "routine"].concat(evt.to.mypath);
    pathTo.push(evt.newIndex);
    var change = {path: pathTo, value: pathFrom, mode: 'insert', sourceMode: 'move'};
    stateM.commitChange(change);
}

const sortconfig = {
    group:'g',
    onRemove: onMove,
    onUpdate: onMove,
    onSpill: onDelete,
    removeOnSpill: true};


Sortable.create(coderesource, {  group: {
        name: 'g',
        pull: 'clone',
        put: false,
        revertClone: true
    },
    sort: false,
    onRemove: onNew});

Sortable.create(codecontainer, sortconfig);


var recRoutineLoad = function(container, context){
    if(!context) return;
    for(var i = 0; i < context.length; i++){
        var newItem = Sortable.utils.clone(coderesource.querySelector('.'+context[i].class));
        container.appendChild(newItem);
        if(newItem.classList.contains('loopblock')){
            prepareLoopblock(newItem);
            recRoutineLoad(newItem.querySelector('.coderight'), context[i].body);
        }else if(newItem.classList.contains('execute')){
            newItem.addEventListener('click', clickHandler)
        }
    }
};



const getRoutinePath = function(el){
    if(el === codecontainer){
        return ["state", "routine"];
    }
    let needsbody = false;
    if(el.classList.contains('inner')){
        el = el.parentNode.parentNode;
        needsbody = true;
    }
    let path = getRoutinePath(el.parentNode);
    let i=0;
    while(el.previousElementSibling) {
        el=el.previousElementSibling;
        i++;
    }
    path.push(i);
    if(needsbody){
        path.push('body');
    }
    return path;
};





function lookup(el){
    const path = getRoutinePath(el);
    path.push('dummy'); //because last element is ignored, might create dict at last
    return followPath(stateM, path);
}



export class RoutineManager {
    constructor(){
        if (RoutineManager.instance) {
            return RoutineManager.instance;
        }
        RoutineManager.instance = this;
    }

    connectNode(id){
        if(!selection) return;
        document.getElementById(id).classList.add('myselect');

        const connected = document.getElementById(lookup(selection).connected);
        // console.log(lookup(selection));
        if(connected){
            connected.classList.remove('myselect');
        }

        let change = {path: getRoutinePath(selection).concat(['connected']), value: id};
        stateM.commitChange(change);
        let change2 = {path: ['context', 'containers', id, 'connected'], value: true};
        //stateM.commitChange(change2);
    }

    loadRoutine(){
        console.log('Loading Routine');
        recRoutineLoad(codecontainer, stateM.state.routine);
    }

    init(){
        stateM = new StateManager();
    }



}
