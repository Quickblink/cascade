import {StateManager} from "./state.js";
import {NodeManager} from "./nodes.js";
import {Sortable, OnSpill} from '/lib/sortable.core.esm.js';

Sortable.mount(OnSpill);

jsPlumb.ready(function () {

    //TODO: create elements from extra html files like angular components

    var coderesource = document.getElementById('coderesource');

    var codecontainer = document.getElementById('codecontainer');



    //var someloop = coderesource.querySelector('.loopblock');

    //someloop.mytest = 'Hello World!';

    //codecontainer.appendChild(Sortable.utils.clone(someloop));

    //var sortable2 = Sortable.create(document.getElementById('innerList'), {group:'g'}); //, handle: '.handle'



    var onNew = function(evt){ //onRemove from coderesource
        if(evt.item.classList.contains('loopblock')){
            Sortable.create(evt.item.querySelector('.coderight'), sortconfig);
        }

        var path = getRoutinePath(evt.to);
        path.push(evt.newIndex);
        var change = {path:path, value:{class: evt.item.classList[0]}, mode: 'insert'};
        stateM.commitChange(change);
    };

    var onDelete = function(evt){
        evt.item.parentNode.removeChild(evt.item);
        var path = getRoutinePath(evt.from);// ["state", "routine"].concat(evt.from.mypath);
        path.push(evt.oldIndex);
        var change = {path:path, mode: 'delete'};
        stateM.commitChange(change);
    };

    var onMove = function(evt){
        console.log(evt);
        var pathFrom = getRoutinePath(evt.from); // ["state", "routine"].concat(evt.from.mypath);
        pathFrom.push(evt.oldIndex);
        var pathTo = getRoutinePath(evt.to); // ["state", "routine"].concat(evt.to.mypath);
        pathTo.push(evt.newIndex);
        var change = {path: pathTo, value: pathFrom, mode: 'insert', sourceMode: 'move'};
        stateM.commitChange(change);
    };

    var sortconfig = {
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

    var codesortable = Sortable.create(codecontainer, sortconfig);


    var recRoutineLoad = function(container, context){
        if(!context) return;
        for(var i = 0; i < context.length; i++){
            var newItem = Sortable.utils.clone(coderesource.querySelector('.'+context[i].class));
            container.appendChild(newItem);
            if(newItem.classList.contains('loopblock')){
                var innerContainer = newItem.querySelector('.coderight');
                Sortable.create(innerContainer, sortconfig);
                recRoutineLoad(innerContainer, context[i].body);
            }
        }
    };

    var loadRoutine = function(){
        console.log('Loading Routine');
        recRoutineLoad(codecontainer, stateM.state.routine);
        console.log(codesortable.toArray());
    };


    var getRoutinePath = function(el){
        if(el === codecontainer){
            return ["state", "routine"];
        }
        var upperItem = el.parentNode.parentNode;
        var path = getRoutinePath(upperItem.parentNode);
        var i=0;
        while(upperItem.previousElementSibling) {
            upperItem=upperItem.previousElementSibling;
            i++;
        }
        path.push(i);
        path.push('body');
        return path;
    };




    var instance = window.jsp = jsPlumb.getInstance({
        // default drag options
        DragOptions: { cursor: 'pointer', zIndex: 2000 },

        Container: "canvas"
    });

    var secondini = jsPlumb.getInstance({
        // default drag options
        DragOptions: { cursor: 'pointer', zIndex: 1 }
    });


    var canvas = document.getElementById("canvas");

    var dragContainer = document.getElementById("dragContainer"); //innercon

    var canvasClone = document.getElementById("canvasClone");

    var loadfromState = function(){
        /*output.style.left = stateM.context.output.left + "px";
        output.style.top = stateM.context.output.top + "px";*/
        //instance.reset();

        instance.silently(function() {
            instance.deleteEveryEndpoint();
            // console.log(instance);
            // instance.targetEndpointDefinitions = {};
            // instance.sourceEndpointDefinitions = {};
            //connections.length = 0;
        });

        //applyCanvasTransforms = applyCanvasTransforms.bind(instance);



        while(canvas.firstChild){
            canvas.firstChild.remove();
        }

        // instance.setZoom(stateM.context.canvas.scale);

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
                        source: getSourcePoint(stateM.context.containers[id].connections[n])
                    });
                }
            }
        }

        instance.setSuspendDrawing(false, true);

    };

    var stateM = new StateManager(loadfromState, loadRoutine);


    var getSourcePoint = function (dSource) {
        var endlist = instance.selectEndpoints({source: dSource.id});
        for (var i = 0; i < endlist.length; i++) {
            if(endlist.get(i).getParameter('k') === dSource.k){
                return endlist.get(i);
            }
        }
        console.error('SourcePoint not found: '+JSON.stringify(dSource));
    };




    var applyCanvasTransforms = function(){
        canvas.style.left = stateM.context.canvas.pos[0] + "px";
        canvas.style.top = stateM.context.canvas.pos[1] + "px";
        canvas.style.transform = "scale("+stateM.context.canvas.scale+")";
        canvasClone.style.transform = "translatex("+stateM.context.canvas.pos[0]+"px) translatey("+stateM.context.canvas.pos[1]+"px) scale("+stateM.context.canvas.scale+")";
        //console.log(instance.getZoom());
        instance.setZoom(stateM.context.canvas.scale);
        //console.log(instance.getZoom());
    };
    


    secondini.draggable(dragContainer ,{
        stop:function(params) {
            var change = {path:["context", "canvas","pos"], value:[stateM.context.canvas.pos[0]+params.finalPos[0], stateM.context.canvas.pos[1]+params.finalPos[1]]};
            stateM.commitChange(change);
            applyCanvasTransforms();
            params.el.style.left = 0;
            params.el.style.top = 0;
        }});


    dragContainer.addEventListener('wheel', function(e) {
        var change;
        if (e.deltaY < 0){
            change = {path:["context", "canvas"], value:{pos:[1.1*stateM.context.canvas.pos[0]-0.1*e.x, 1.1*stateM.context.canvas.pos[1]-0.1*e.y], scale: stateM.context.canvas.scale * 1.1}};
        }else{
            change = {path:["context", "canvas"], value:{pos:[(stateM.context.canvas.pos[0]+0.1*e.x)/1.1, (stateM.context.canvas.pos[1]+0.1*e.y)/1.1], scale: stateM.context.canvas.scale / 1.1}};
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
        //console.log(e);
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








    var connectionHandler = function (info, oe) {
        if (!oe) return;
        //console.log(info.targetEndpoint.getParameter('n'), info.targetId);
        var change = {path:["context", "containers",info.targetId,"connections", info.targetEndpoint.getParameter('n')+''], value:{id: info.sourceId, k: info.sourceEndpoint.getParameter('k')+''}};
        stateM.commitChange(change);
        //console.log('Attached!');
    };

    var connectionDetachedHandler = function (info) {
        //console.log('Detached!');
        var change = {path:["context", "containers",info.targetId,"connections", info.targetEndpoint.getParameter('n')+''], mode:'delete'};
        stateM.commitChange(change);
    };

    var connectionMovedHandler = function (info) {
        //console.log('moved!');
        var change = {path:["context", "containers",info.originalTargetId,"connections", info.originalTargetEndpoint.getParameter('n')+''], mode:'delete'};
        stateM.commitChange(change);
        //console.log(info);
    };


    instance.bind("connection", connectionHandler);

    instance.bind("connectionDetached", connectionDetachedHandler);

    instance.bind("connectionMoved", connectionMovedHandler);


    var nodeM = new NodeManager(stateM, instance, canvas, document.getElementById('sidenav'));

    var createDummyNode = function(id, stateInfo2) {
        var d = nodeM.createDummyNode(id, stateInfo2);

        secondini.draggable(d, {clone:true, stop: function(params){
                if(params.finalPos[0]>200) {
                    var id = jsPlumbUtil.uuid();
                    var stateInfo = {
                        left: (params.finalPos[0] - stateM.context.canvas.pos[0]) / stateM.context.canvas.scale,
                        top: (params.finalPos[1] - stateM.context.canvas.pos[1]) / stateM.context.canvas.scale,
                        //text: id.substring(0, 7),
                        conType: stateInfo2.conType
                    };
                    createNode(id, stateInfo);
                    //console.log(stateInfo);
                    //stateInfo is changed during createNode
                    var change = {path: ["context", "containers", id], value: stateInfo};
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
    createDummyNode("containerDummy", {left: 15, top: 100+80+150, conType: "containerNode"});


    var createNode = function(id, stateInfo) {
        var d = nodeM.createNode(id, stateInfo);

        var stopfun;

        if(stateInfo.conType === 'plugin' || stateInfo.conType === 'plugout'){
            stopfun = function(params) {
                canvas.appendChild(d);
                var change = {
                    path: ["context", "containers", params.el.id],
                    value: {left: params.finalPos[0], top: params.finalPos[1]}
                };
                stateM.commitChange(change);
            };
        }else{
            stopfun = function(params) {
                // console.log(params);
                canvas.appendChild(d);
                if(params.e.x < 200){
                    //not necessary to delete connections cause events
                    instance.remove(params.el.id);
                    var change = {path:["context", "containers",params.el.id], mode:'delete'};
                    stateM.commitChange(change);
                }else{
                    var change = {path:["context", "containers",params.el.id], value:{left:params.finalPos[0],top:params.finalPos[1]}};
                    stateM.commitChange(change);
                }

                //console.log(params);
            };
        }

        // initialise draggable elements.
        instance.draggable(d, {
            start:function() {
                canvasClone.appendChild(d);
            },
            stop:stopfun});

        // return d;
    };





});

