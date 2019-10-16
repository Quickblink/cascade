import {StateManager} from "./state.js";
import {NodeManager} from "./nodes.js";

jsPlumb.ready(function () {

    var instance = window.jsp = jsPlumb.getInstance({
        // default drag options
        DragOptions: { cursor: 'pointer', zIndex: 2000 },

        Container: "canvas"
    });

    var secondini = jsPlumb.getInstance({
        // default drag options
        DragOptions: { cursor: 'pointer', zIndex: 1 }
    });

    var loadfromState = function(){
        /*output.style.left = stateM.context.output.left + "px";
        output.style.top = stateM.context.output.top + "px";*/

        instance.setSuspendDrawing(true);

        applyCanvasTransforms();


        for (var id in stateM.context.containers) {
            if (!stateM.context.containers.hasOwnProperty(id)) continue;
            createNode(id, stateM.context.containers[id]);
        }

        for (var id in stateM.context.containers){
            if (!stateM.context.containers.hasOwnProperty(id) || !stateM.context.containers[id].connections) continue;
            var endlist = instance.selectEndpoints({target:id});
            for (var i = 0; i < endlist.length; i++) {
                var endp = endlist.get(i);
                var n = endp.getParameter('n');
                if (stateM.context.containers[id].connections[n]) {
                    //console.log('Trying to connect');
                    instance.connect({
                        target: endp,
                        source: instance.selectEndpoints({source: stateM.context.containers[id].connections[n]}).get(0)
                    });
                }
            }
        }

        instance.setSuspendDrawing(false, true);

    };

    var stateM = new StateManager(loadfromState);





    var canvas = document.getElementById("canvas");

    var dragContainer = document.getElementById("dragContainer"); //innercon

    var canvasClone = document.getElementById("canvasClone");


    var applyCanvasTransforms = function(){
        canvas.style.left = stateM.context.canvas.pos[0] + "px";
        canvas.style.top = stateM.context.canvas.pos[1] + "px";
        canvas.style.transform = "scale("+stateM.context.canvas.scale+")";
        canvasClone.style.transform = "translatex("+stateM.context.canvas.pos[0]+"px) translatey("+stateM.context.canvas.pos[1]+"px) scale("+stateM.context.canvas.scale+")";
        instance.setZoom(stateM.context.canvas.scale);
    };
    


    secondini.draggable(dragContainer ,{
        stop:function(params) {
            var change = {path:["canvas","pos"], value:[stateM.context.canvas.pos[0]+params.finalPos[0], stateM.context.canvas.pos[1]+params.finalPos[1]]};
            stateM.commitChange(change);
            applyCanvasTransforms();
            params.el.style.left = 0;
            params.el.style.top = 0;
        }});


    dragContainer.addEventListener('wheel', function(e) {
        var change;
        if (e.deltaY < 0){
            change = {path:["canvas"], value:{pos:[1.1*stateM.context.canvas.pos[0]-0.1*e.x, 1.1*stateM.context.canvas.pos[1]-0.1*e.y], scale: stateM.context.canvas.scale * 1.1}};
        }else{
            change = {path:["canvas"], value:{pos:[(stateM.context.canvas.pos[0]+0.1*e.x)/1.1, (stateM.context.canvas.pos[1]+0.1*e.y)/1.1], scale: stateM.context.canvas.scale / 1.1}};
        }
        stateM.commitChange(change);
        applyCanvasTransforms();
    });

    var selector = document.getElementById('selector');

    var selectionel = document.createElement("div");

    selectionel.style.position = 'absolute';
    selectionel.style.border = '1px solid';

    selectionel.style.visibility = 'hidden';

    //selectionel.style.width = '0px';
    selector.appendChild(selectionel);

    var selectx = 0;
    var selecty = 0;

    var moveListener = function(e){
        selectionel.style.width = Math.abs(e.x-selectx)+'px';
        selectionel.style.height = Math.abs(e.y-selecty)+'px';
        selectionel.style.left = Math.min(e.x, selectx)+'px';
        selectionel.style.top = Math.min(e.y, selecty)+'px';
        e.preventDefault();
    };

    var mouseupListener = function (e) {
        selectionel.style.visibility = 'hidden';
        document.removeEventListener('mousemove', mouseupListener);
        document.removeEventListener('mouseup', mouseupListener);

        var bndLeft = convertToCanvas(Math.min(e.x, selectx), 0);
        var bndRight = convertToCanvas(Math.max(e.x, selectx), 0);
        var bndTop = convertToCanvas(Math.min(e.y, selecty), 1);
        var bndBottom = convertToCanvas(Math.max(e.y, selecty), 1);

        instance.clearDragSelection();

        for(var id in stateM.context.containers){
            if (stateM.context.containers[id].left > bndLeft && stateM.context.containers[id].left < bndRight && stateM.context.containers[id].top > bndTop && stateM.context.containers[id].top < bndBottom){
                instance.addToDragSelection(id);
            }
        }
    };

    selector.addEventListener('mousedown', function (e) {
        console.log(e);
        instance.clearDragSelection();
        if(e.button === 2){


            e.stopPropagation();
            //e.preventDefault();

            selectionel.style.visibility = 'initial';

            selectx = e.x;
            selecty = e.y;

            moveListener(e);

            document.addEventListener('mousemove', moveListener);
            document.addEventListener('mouseup', mouseupListener);
        }
    });




    var convertToCanvas = function(v, i){
        return (v-stateM.context.canvas.pos[i])/stateM.context.canvas.scale;
    };




    instance.bind("connection", function (info, oe) {
        if (!oe) return;
        //console.log(info.targetEndpoint.getParameter('n'), info.targetId);
        var change = {path:["containers",info.targetId,"connections", info.targetEndpoint.getParameter('n')+''], value:info.sourceId};
        stateM.commitChange(change);
        //console.log('Attached!');
    });

    instance.bind("connectionDetached", function (info) {
        //console.log('Detached!');
        var change = {path:["containers",info.targetId,"connections", info.targetEndpoint.getParameter('n')+''], delete:true};
        stateM.commitChange(change);
    });

    instance.bind("connectionMoved", function (info) {
        //console.log('moved!');
        var change = {path:["containers",info.originalTargetId,"connections", info.originalTargetEndpoint.getParameter('n')+''], delete:true};
        stateM.commitChange(change);
        //console.log(info);
    });

    var nodeM = new NodeManager(stateM, instance, canvas, document.getElementById('sidenav'));

    var createDummyNode = function(id, stateInfo2) {
        var d = nodeM.createDummyNode(id, stateInfo2);

        secondini.draggable(d, {clone:true, stop: function(params){
                if(params.finalPos[0]>200) {
                    var id = jsPlumbUtil.uuid();
                    var stateInfo = {
                        left: (params.finalPos[0] - stateM.context.canvas.pos[0]) / stateM.context.canvas.scale,
                        top: (params.finalPos[1] - stateM.context.canvas.pos[1]) / stateM.context.canvas.scale,
                        text: id.substring(0, 7),
                        conType: stateInfo2.conType
                    };
                    createNode(id, stateInfo);
                    var change = {path: ["containers", id], value: stateInfo};
                    stateM.commitChange(change);
                }
                //console.log('drag', params);
            }, drag:function(params) {
                if(params.pos[0] > 200){
                    params.drag.getDragElement().style.transform = "scale("+stateM.context.canvas.scale+")";
                    params.drag.getDragElement().style.transformOrigin = "0 0";
                }else{
                    params.drag.getDragElement().style.transform = "scale(1)";
                }
                //console.log(params);
            }});

    };


    createDummyNode("indummy", {left: 15, top: 10+150, text:"Function Name", conType: "in"});
    createDummyNode("outdummy", {left: 15, top: 80+150, conType: "out"});



    var createNode = function(id, stateInfo) {
        var d = nodeM.createNode(id, stateInfo);

        // initialise draggable elements.
        instance.draggable(d, {
            start:function() {
                canvasClone.appendChild(d);
            },
            stop:function(params) {
                // console.log(params);
                canvas.appendChild(d);
                if(params.e.x < 200){
                    //not necessary to delete connections cause events
                    instance.remove(params.el.id);
                    var change = {path:["containers",params.el.id], delete:true};
                    stateM.commitChange(change);
                }else{
                    var change = {path:["containers",params.el.id], value:{left:params.finalPos[0],top:params.finalPos[1]}};
                    stateM.commitChange(change);
                }

                //console.log(params);
            }});

        // return d;
    };





});

