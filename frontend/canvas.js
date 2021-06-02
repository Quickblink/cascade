import {StateManager} from "./state.js";
import {sourceEndpoint, targetEndpoint} from "./style/style.js";
import {RoutineManager} from "./routines.js";


/*
newNode

buildNode

when is jsplumb ready?

use css hierarchy for differentiating between dummy and real
 */


let stateM = undefined;

const routineM = new RoutineManager();


let instance = undefined;

let secondini = undefined;

const canvas = document.getElementById("canvas");

const canvasClone = document.getElementById("canvasClone");

const sidenav = document.getElementById('sidenav');



function newNode(pos, type) {
    let id = 'n'+stateM.state.idCounter;
    let change2 = {path: ['state', 'idCounter'], value: stateM.state.idCounter+1};
    stateM.commitChange(change2);
    let stateInfo = {
        left: (pos[0] - stateM.context.canvas.pos[0]) / stateM.context.canvas.scale,
        top: (pos[1] - stateM.context.canvas.pos[1]) / stateM.context.canvas.scale,
        conType: type
    };
    switch (stateInfo.conType) {
        case "in":
            stateInfo.text = id.substring(0, 7);
            break;
        case "containerNode":
            stateInfo.inner = {canvas: {pos:[0,0], scale:1}, containers: {
                    plugin: {left: 500, top: 100, conType: 'plugin'},
                    plugout: {left: 500, top: 800, conType: 'plugout'}}};
    }
    buildNode(id, stateInfo);
    let change = {path: ["context", "containers", id], value: stateInfo};
    stateM.commitChange(change);
}


function buildNode(id, stateInfo) {
    const type = stateInfo.conType;
    let d = buildBasics(id, stateInfo);
    canvas.appendChild(d);
    build[type].node(d, stateInfo);


    instance.draggable(d, {
        start:function(params) {
            canvasClone.appendChild(params.el); //d
        },
        stop:function(params) {
            // console.log(params);
            canvas.appendChild(params.el); //d
            let change;
            if(params.e.x < 200 && !(type === 'plugin') && !(type === 'plugout')){
                //not necessary to delete connections cause events
                instance.remove(params.el.id);
                change = {path:["context", "containers",params.el.id], mode:'delete'};
            }else{
                change = {path:["context", "containers",params.el.id], value:{left:params.finalPos[0],top:params.finalPos[1]}};
            }
            stateM.commitChange(change);
        }
    });
}

function buildDummy(id, stateInfo) {
    const type = stateInfo.conType;
    let d = buildBasics(id, stateInfo);
    sidenav.appendChild(d);
    build[type].dummy(d, stateInfo);
    secondini.draggable(d, {clone:true,
        stop: function(params){
            if(params.finalPos[0]>200) {
                newNode(params.finalPos, type);
            }
        }, drag:function(params) {
            if(params.pos[0] > 200){
                params.drag.getDragElement().style.transform = "scale("+stateM.context.canvas.scale+")";
                params.drag.getDragElement().style.transformOrigin = "0 0";
            }else{
                params.drag.getDragElement().style.transform = "scale(1)";
            }
        }});
}


function buildBasics(id, stateInfo) {
    let d = document.createElement("div");
    d.className = "window";
    d.classList.add(stateInfo.conType);
    d.id = id;
    d.style.left = stateInfo.left + "px";
    d.style.top = stateInfo.top + "px";
    return d;
}


function makeInput(d, stateInfo){
    let input = document.createElement("input");
    input.type = "text";
    input.style = "width:120px";
    input.value = stateInfo.text;
    d.appendChild(input);
    return input;
}

function makeButton(d, buttonText){
    let button = document.createElement("button");
    button.type = "button";
    button.innerText = buttonText;
    button.style.margin = "10px";
    d.appendChild(button); // put it into the DOM
    return button;
}


function makeOuttext(d) {
    let outtext = document.createElement("div");
    outtext.className = 'outtext';
    d.appendChild(outtext); // put it into the DOM
    return outtext;
}

function makePlot(d) {
    let outtext = document.createElement("div");
    outtext.className = 'plotholder';
    d.appendChild(outtext); // put it into the DOM
    return outtext;
}

const build = {
    in:{
        node: function (d, stateInfo) {
            let input = makeInput(d, stateInfo);
            input.addEventListener('keyup', function() {
                var change = {path:["context","containers",d.id], value:{text:input.value}};
                stateM.commitChange(change);
            });

            instance.addEndpoint(d.id, sourceEndpoint, {parameters:{k:'1'}});
            const n = 4;
            for (let j = 1; j < n + 1; j++) {
                instance.addEndpoint(d.id, targetEndpoint, { anchor: [j/(n+1),0,0,-1], parameters:{n:j+''}});
            }
        },
        dummy: function (d, stateInfo) {
            let input = makeInput(d, stateInfo);
            input.disabled = true;
        }
    },
    out:{
        node: function (d, stateInfo) {
            let button = makeButton(d, "Execute");
            let outtext = makeOuttext(d);

            let exhttp = new XMLHttpRequest();
            button.onclick = function() {
                exhttp.open("POST", "http://localhost:3000", true);
                exhttp.send(JSON.stringify({type:"execute", body:{id: d.id}}));
            };
            exhttp.onreadystatechange = function() {
                if (exhttp.readyState== 4 && exhttp.status == 200) {
                    outtext.innerText = this.responseText;
                }
            };
            instance.addEndpoint(d.id, targetEndpoint, { anchor: "TopCenter", parameters:{n:'1'}});

            d.addEventListener('click', function (evt) {
                evt.mycatch = true;
                routineM.connectNode(d.id);
            });

        },
        dummy: function (d, stateInfo) {
            let button = makeButton(d, "Execute");
            let outtext = makeOuttext(d);
            button.disabled = true;
        }
    },
    plot:{
        node: function (d, stateInfo) {
            let button = makeButton(d, "Execute");
            let plot = makePlot(d);

            let exhttp = new XMLHttpRequest();
            button.onclick = function() {
                exhttp.open("POST", "http://localhost:3000", true);
                exhttp.send(JSON.stringify({type:"execute", body:{id: d.id}}));
            };
            exhttp.onreadystatechange = function() {
                if (exhttp.readyState== 4 && exhttp.status == 200) {
                    if (this.responseText !== ''){
                        let response = JSON.parse(this.responseText);
                        console.log(response)
                        Plotly.purge(plot);
                        Plotly.newPlot(plot, [{
                                x: response[0],
                                y: response[1],
                                mode: 'markers',
                            }],
                            {
                                margin: {t: 30, l: 30, b: 30, r: 20}
                            }, {
                                displayModeBar: true
                            },);
                    }
                }
            };
            instance.addEndpoint(d.id, targetEndpoint, { anchor: "TopCenter", parameters:{n:'1'}});

            d.addEventListener('click', function (evt) {
                evt.mycatch = true;
                routineM.connectNode(d.id);
            });

        },
        dummy: function (d, stateInfo) {
            let button = makeButton(d, "Execute");
            let outtext = makePlot(d);
            button.disabled = true;
        }
    },
    containerNode:{
        node: function (d, stateInfo) {
            let button = makeButton(d, "Step in");
            button.onclick = function() {
                stateM.switchDown(d.id);
            };
            const n = 4;
            for (let j = 1; j < n + 1; j++) {
                instance.addEndpoint(d.id, { anchor: [j/(n+1),1,0,1], parameters:{k:j+''}}, sourceEndpoint);
            }

            for (let j = 1; j < n + 1; j++) {
                instance.addEndpoint(d.id, targetEndpoint, { anchor: [j/(n+1),0,0,-1], parameters:{n:j+''}});
            }
        },
        dummy: function (d, stateInfo) {
            let button = makeButton(d, "Step in");
            button.disabled = true;
        }
    },
    plugin:{
        node: function (d, stateInfo) {
            let button = makeButton(d, "Step out");
            button.onclick = function() {
                stateM.switchUp();
            };
            const n = 4;
            for (let j = 1; j < n + 1; j++) {
                instance.addEndpoint(d.id, { anchor: [j/(n+1),1,0,1], parameters:{k:j+''}}, sourceEndpoint);
            }
        }
    },
    plugout:{
        node: function (d, stateInfo) {
            let button = makeButton(d, "Step out");
            button.onclick = function() {
                stateM.switchUp();
            };
            const n = 4;
            for (let j = 1; j < n + 1; j++) {
                instance.addEndpoint(d.id, targetEndpoint, { anchor: [j/(n+1),0,0,-1], parameters:{n:j+''}});
            }
        }
    }
};


function applyCanvasTransforms(){
    canvas.style.left = stateM.context.canvas.pos[0] + "px";
    canvas.style.top = stateM.context.canvas.pos[1] + "px";
    canvas.style.transform = "scale("+stateM.context.canvas.scale+")";
    canvasClone.style.transform = "translatex("+stateM.context.canvas.pos[0]+"px) translatey("+stateM.context.canvas.pos[1]+"px) scale("+stateM.context.canvas.scale+")";
    instance.setZoom(stateM.context.canvas.scale);
}


const dragContainer = document.getElementById("dragContainer"); //innercon


function onDragContainer(params) {
    let change = {path:["context", "canvas","pos"], value:[stateM.context.canvas.pos[0]+params.finalPos[0], stateM.context.canvas.pos[1]+params.finalPos[1]]};
    stateM.commitChange(change);
    applyCanvasTransforms();
    params.el.style.left = 0;
    params.el.style.top = 0;
}



dragContainer.addEventListener('wheel', function(e) {
    let change;
    if (e.deltaY < 0){
        change = {path:["context", "canvas"], value:{pos:[1.1*stateM.context.canvas.pos[0]-0.1*e.x, 1.1*stateM.context.canvas.pos[1]-0.1*e.y], scale: stateM.context.canvas.scale * 1.1}};
    }else{
        change = {path:["context", "canvas"], value:{pos:[(stateM.context.canvas.pos[0]+0.1*e.x)/1.1, (stateM.context.canvas.pos[1]+0.1*e.y)/1.1], scale: stateM.context.canvas.scale / 1.1}};
    }
    stateM.commitChange(change);
    applyCanvasTransforms();
});


const selector = document.getElementById('selector');

const selectionBox = document.getElementById('selectionBox');

function convertToCanvas(v, i){
    return (v-stateM.context.canvas.pos[i])/stateM.context.canvas.scale;
}

let selectx = 0;
let selecty = 0;

let doingSelection = false;

function moveListener(e){
    if(doingSelection){
        selectionBox.style.width = Math.abs(e.x-selectx)+'px';
        selectionBox.style.height = Math.abs(e.y-selecty)+'px';
        selectionBox.style.left = Math.min(e.x, selectx)+'px';
        selectionBox.style.top = Math.min(e.y, selecty)+'px';
        e.preventDefault();
    }
}

function mouseupListener(e) {
    if(doingSelection) {
        doingSelection = false;
        selectionBox.style.visibility = 'hidden';
        //document.removeEventListener('mousemove', mouseupListener);
        //document.removeEventListener('mouseup', mouseupListener);

        const bndLeft = convertToCanvas(Math.min(e.x, selectx), 0);
        const bndRight = convertToCanvas(Math.max(e.x, selectx), 0);
        const bndTop = convertToCanvas(Math.min(e.y, selecty), 1);
        const bndBottom = convertToCanvas(Math.max(e.y, selecty), 1);

        instance.clearDragSelection();

        for (var id in stateM.context.containers) {
            if (stateM.context.containers[id].left > bndLeft && stateM.context.containers[id].left < bndRight && stateM.context.containers[id].top > bndTop && stateM.context.containers[id].top < bndBottom) {
                instance.addToDragSelection(id);
            }
        }
    }
}

document.addEventListener('mousemove', moveListener);
document.addEventListener('mouseup', mouseupListener);


selector.addEventListener('mousedown', function (e) {
    //console.log(e);
    instance.clearDragSelection();
    if(e.button === 2){

        doingSelection = true;
        e.stopPropagation();
        //e.preventDefault();

        selectionBox.style.visibility = 'initial';

        selectx = e.x;
        selecty = e.y;

        moveListener(e);
    }
});




function connectionHandler(info, oe) {
    if (!oe) return;
    //console.log(info.targetEndpoint.getParameter('n'), info.targetId);
    var change = {path:["context", "containers",info.targetId,"connections", info.targetEndpoint.getParameter('n')+''], value:{id: info.sourceId, k: info.sourceEndpoint.getParameter('k')+''}};
    stateM.commitChange(change);
    //console.log('Attached!');
}

function connectionDetachedHandler(info) {
    //console.log('Detached!');
    var change = {path:["context", "containers",info.targetId,"connections", info.targetEndpoint.getParameter('n')+''], mode:'delete'};
    stateM.commitChange(change);
}

function connectionMovedHandler(info) {
    //console.log('moved!');
    var change = {path:["context", "containers",info.originalTargetId,"connections", info.originalTargetEndpoint.getParameter('n')+''], mode:'delete'};
    stateM.commitChange(change);
    //console.log(info);
}








function getSourcePoint(dSource) {
    let endlist = instance.selectEndpoints({source: dSource.id});
    for (let i = 0; i < endlist.length; i++) {
        if(endlist.get(i).getParameter('k') === dSource.k){
            return endlist.get(i);
        }
    }
    console.error('SourcePoint not found: '+JSON.stringify(dSource));
}

export class CanvasManager {
    constructor() {
        if (CanvasManager.instance) {
            return CanvasManager.instance;
        }
        CanvasManager.instance = this;
    }

    loadContext() {
        instance.silently(function () {
            instance.deleteEveryEndpoint();
        });

        while (canvas.firstChild) {
            canvas.firstChild.remove();
        }

        instance.setSuspendDrawing(true);

        applyCanvasTransforms();

        for (let id in stateM.context.containers) {
            if (!stateM.context.containers.hasOwnProperty(id)) continue;
            buildNode(id, stateM.context.containers[id]);
        }

        for (let id in stateM.context.containers) {
            if (!stateM.context.containers.hasOwnProperty(id) || !stateM.context.containers[id].connections) continue;
            var endlist = instance.selectEndpoints({target: id});
            for (let i = 0; i < endlist.length; i++) {
                var endp = endlist.get(i);
                var n = endp.getParameter('n');
                if (stateM.context.containers[id].connections[n]) {
                    //console.log('Trying to connect');
                    instance.connect({
                        target: endp,
                        source: getSourcePoint(stateM.context.containers[id].connections[n])
                    });
                }
            }
        }

        instance.setSuspendDrawing(false, true);
    }

    init(){
        stateM = new StateManager();
        instance = jsPlumb.getInstance({
            // default drag options
            DragOptions: { cursor: 'pointer', zIndex: 2000 },

            Container: "canvas"
        });

        secondini = jsPlumb.getInstance({
            // default drag options
            DragOptions: { cursor: 'pointer', zIndex: 1 }
        });

        secondini.draggable(dragContainer ,{stop:onDragContainer});

        instance.bind("connection", connectionHandler);
        instance.bind("connectionDetached", connectionDetachedHandler);
        instance.bind("connectionMoved", connectionMovedHandler);
        buildDummy("indummy", {left: 15, top: 10+150, text:"Function Name", conType: "in"});
        buildDummy("outdummy", {left: 15, top: 80+150, conType: "out"});
        buildDummy("containerDummy", {left: 15, top: 100+80+150, conType: "containerNode"});
        buildDummy("plotdummy", {left: -285, top: 80+100+80+150, conType: "plot"});
    }
}




