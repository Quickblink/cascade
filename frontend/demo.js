jsPlumb.ready(function () {

    var instance = window.jsp = jsPlumb.getInstance({
        // default drag options
        DragOptions: { cursor: 'pointer', zIndex: 2000 },

        Container: "canvas"
    });

    var basicType = {
        connector: "StateMachine",
        paintStyle: { stroke: "red", strokeWidth: 4 },
        hoverPaintStyle: { stroke: "blue" },
        overlays: [
            "Arrow"
        ]
    };
    instance.registerConnectionType("basic", basicType);


    // this is the paint style for the connecting lines..
    var connectorPaintStyle = {
            strokeWidth: 2,
            stroke: "#61B7CF",
            joinstyle: "round",
            outlineStroke: "white",
            outlineWidth: 2
        },
        // .. and this is the hover style.
        connectorHoverStyle = {
            strokeWidth: 3,
            stroke: "#216477",
            outlineWidth: 5,
            outlineStroke: "white"
        },
        endpointHoverStyle = {
            fill: "#216477",
            stroke: "#216477"
        },
        // the definition of source endpoints (the small blue ones)
        sourceEndpoint = {
            endpoint: "Dot",
            paintStyle: {
                stroke: "#7AB02C",
                fill: "transparent",
                radius: 7,
                strokeWidth: 1
            },
            isSource: true,
            maxConnections: -1,
            connector: [ "Flowchart", { stub: [40, 60], gap: 10, cornerRadius: 5, alwaysRespectStubs: true } ],
            connectorStyle: connectorPaintStyle,
            hoverPaintStyle: endpointHoverStyle,
            connectorHoverStyle: connectorHoverStyle,
            dragOptions: {},
            anchor: "BottomCenter"
        },
        // the definition of target endpoints (will appear when the user drags a connection)
        targetEndpoint = {
            endpoint: "Dot",
            paintStyle: { fill: "#7AB02C", radius: 7 },
            hoverPaintStyle: endpointHoverStyle,
            maxConnections: 1,
            dropOptions: { hoverClass: "hover", activeClass: "active" },
            isTarget: true
        };



    var jsonFile = new XMLHttpRequest();
    jsonFile.open("GET","http://localhost:3000/state.json?"+ new Date().getTime(),true);
    jsonFile.send();

    jsonFile.onreadystatechange = function() {
        if (jsonFile.readyState== 4 && jsonFile.status == 200) {
            console.log('JSON loaded');
            state = JSON.parse(jsonFile.responseText);
 /*           if (!state.containers || !state.containers.output0){
                var id = "output0";
                var stateInfo = {left: 100, top: 100, conType:"out"};
                //createNode(id, stateInfo);
                var change = {path:["containers",id], value:stateInfo};
                //console.log(change);
                commitChange(change);
            }*/
            if(!state.canvas){
                var change = {path:["canvas"], value:{pos:[0,0], scale:1}};
                commitChange(change);
            }
            instance.batch(loadfromState);
        }
    };

    var xhttp = new XMLHttpRequest();


    var loadfromState = function(){
        /*output.style.left = state.output.left + "px";
        output.style.top = state.output.top + "px";*/

        applyCanvasTransforms();


        for (var id in state.containers) {
            if (!state.containers.hasOwnProperty(id)) continue;
            createNode(id, state.containers[id]);
        }

        for (var id in state.containers){
            if (!state.containers.hasOwnProperty(id) || !state.containers[id].connections) continue;
            var endlist = instance.selectEndpoints({target:id});
            for (var i = 0; i < endlist.length; i++) {
                var endp = endlist.get(i);
                var n = endp.getParameter('n');
                if (state.containers[id].connections[n]) {
                    //console.log('Trying to connect');
                    instance.connect({
                        target: endp,
                        source: instance.selectEndpoints({source: state.containers[id].connections[n]}).get(0)
                    });
                }
            }
        }

    };

    var canvas = document.getElementById("canvas");

    var dragContainer = document.getElementById("dragContainer"); //innercon

    var canvasClone = document.getElementById("canvasClone");


    var applyCanvasTransforms = function(){
        canvas.style.left = state.canvas.pos[0] + "px";
        canvas.style.top = state.canvas.pos[1] + "px";
        canvas.style.transform = "scale("+state.canvas.scale+")";
        canvasClone.style.transform = "translatex("+state.canvas.pos[0]+"px) translatey("+state.canvas.pos[1]+"px) scale("+state.canvas.scale+")";
        instance.setZoom(state.canvas.scale);
    };


    var secondini = jsPlumb.getInstance({
        // default drag options
        DragOptions: { cursor: 'pointer', zIndex: 1 }});

    secondini.draggable(dragContainer ,{
        stop:function(params) {
            var change = {path:["canvas","pos"], value:[state.canvas.pos[0]+params.finalPos[0], state.canvas.pos[1]+params.finalPos[1]]};
            commitChange(change);
            applyCanvasTransforms();
            params.el.style.left = 0;
            params.el.style.top = 0;
        }});


    dragContainer.addEventListener('wheel', function(e) {
        var change;
        if (e.deltaY < 0){
            change = {path:["canvas"], value:{pos:[1.1*state.canvas.pos[0]-0.1*e.x, 1.1*state.canvas.pos[1]-0.1*e.y], scale: state.canvas.scale * 1.1}};
        }else{
            change = {path:["canvas"], value:{pos:[(state.canvas.pos[0]+0.1*e.x)/1.1, (state.canvas.pos[1]+0.1*e.y)/1.1], scale: state.canvas.scale / 1.1}};
        }
        commitChange(change);
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

        for(var id in state.containers){
            if (state.containers[id].left > bndLeft && state.containers[id].left < bndRight && state.containers[id].top > bndTop && state.containers[id].top < bndBottom){
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



    //selector.style.visibility = 'hidden';


    // bind a double click listener to "canvas"; add new node when this occurs.
 /*   jsPlumb.on(dragContainer, "dblclick", function(e) {

        console.log(state);
    });*/

/*    var dummy = document.getElementById("flowchartWindow1");

    secondini.draggable(dummy, {clone:true, stop: function(params){
            if(params.finalPos[0]>200) {
                var id = jsPlumbUtil.uuid();
                var stateInfo = {
                    left: (params.finalPos[0] - state.canvas.pos[0]) / state.canvas.scale,
                    top: (params.finalPos[1] - state.canvas.pos[1]) / state.canvas.scale,
                    text: id.substring(0, 7),
                    conType: "in"
                };
                createNode(id, stateInfo);
                var change = {path: ["containers", id], value: stateInfo};
                commitChange(change);
            }
            //console.log('drag', params);
        }, drag:function(params) {
            if(params.pos[0] > 200){
                params.drag.getDragElement().style.transform = "scale("+state.canvas.scale+")";
                params.drag.getDragElement().style.transformOrigin = "0 0";
            }else{
                params.drag.getDragElement().style.transform = "scale(1)";
            }
            //console.log(params);
        }});*/

    var convertToCanvas = function(v, i){
        return (v-state.canvas.pos[i])/state.canvas.scale;
    };



    var createDummyNode = function(id, stateInfo2) {
        var d = document.createElement("div");
        d.className = "window";
        d.id = id;
        d.style.left = stateInfo2.left + "px";
        d.style.top = stateInfo2.top + "px";
        //instance.getContainer().appendChild(d);
        document.getElementById('sidenav').appendChild(d);

        switch(stateInfo2.conType) {
            case "out":
                var button = document.createElement("button");
                button.type = "button";
                button.innerText = "Execute";
                button.disabled = true;

                var outtext = document.createElement("div");

                d.style.flexDirection = "column";
                d.style.height = "auto";
                outtext.style.border = "1px solid darkgrey";
                outtext.style.minHeight = "30px";
                outtext.style.width = "100%";
                outtext.style.textAlign = "initial";
                button.style.margin = "10px";

                d.appendChild(button); // put it into the DOM
                d.appendChild(outtext); // put it into the DOM

                break;
            default:
                var input = document.createElement("input");
                input.type = "text";
                input.style = "width:120px"; // set the CSS class
                input.value = stateInfo2.text;
                input.disabled = true;

                d.appendChild(input); // put it into the DOM

        }


        secondini.draggable(d, {clone:true, stop: function(params){
                if(params.finalPos[0]>200) {
                    var id = jsPlumbUtil.uuid();
                    var stateInfo = {
                        left: (params.finalPos[0] - state.canvas.pos[0]) / state.canvas.scale,
                        top: (params.finalPos[1] - state.canvas.pos[1]) / state.canvas.scale,
                        text: id.substring(0, 7),
                        conType: stateInfo2.conType
                    };
                    createNode(id, stateInfo);
                    var change = {path: ["containers", id], value: stateInfo};
                    commitChange(change);
                }
                //console.log('drag', params);
            }, drag:function(params) {
                if(params.pos[0] > 200){
                    params.drag.getDragElement().style.transform = "scale("+state.canvas.scale+")";
                    params.drag.getDragElement().style.transformOrigin = "0 0";
                }else{
                    params.drag.getDragElement().style.transform = "scale(1)";
                }
                //console.log(params);
            }});

    };


    createDummyNode("indummy", {left: 15, top: 10+150, text:"Function Name", conType: "in"});
    createDummyNode("outdummy", {left: 15, top: 80+150, conType: "out"});



    /*    secondini.droppable(dragContainer,{
            drop: function(p){
                ///Handle the drop event here. Just a sample.
                p.drag.el.style.left = "300px";
                p.drag.el.top = "300px";
                dragContainer.appendChild(p.drag.el);

                console.log(p);
                return true;
            }
        });*/

        /*    var output = document.getElementById("OutputWindow");
            instance.draggable(output, {
                stop:function(params) {
                    var change = {path:["output"], value:{left:params.finalPos[0],top:params.finalPos[1]}};
                    //console.log(change);
                    commitChange(change);
                }});*/
    //var windows = jsPlumb.getSelector(".statemachine-demo .w");

    // bind a click listener to each connection; the connection is deleted. you could of course
    // just do this: instance.bind("click", instance.deleteConnection), but I wanted to make it clear what was
    // happening.
/*    instance.bind("click", function (c) {
        instance.deleteConnection(c);
    });*/

    instance.bind("connection", function (info, oe) {
        if (!oe) return;
        //console.log(info.targetEndpoint.getParameter('n'), info.targetId);
        var change = {path:["containers",info.targetId,"connections", info.targetEndpoint.getParameter('n')+''], value:info.sourceId};
        commitChange(change);
        //console.log('Attached!');
    });

    instance.bind("connectionDetached", function (info) {
        //console.log('Detached!');
        var change = {path:["containers",info.targetId,"connections", info.targetEndpoint.getParameter('n')+''], delete:true};
        commitChange(change);
    });

    instance.bind("connectionMoved", function (info) {
        //console.log('moved!');
        var change = {path:["containers",info.originalTargetId,"connections", info.originalTargetEndpoint.getParameter('n')+''], delete:true};
        commitChange(change);
        //console.log(info);
    });











    var state = {};

    var isObject = function(obj) {
        return typeof obj === 'object' && !!obj;
    };

    var joinObjects = function(obj1, obj2, deep){
        // TODO: add deep merge
        for (var attrname in obj2) { obj1[attrname] = obj2[attrname];}
    };

    var commitChange = function(change) {
        //queue and send json, flush queue
        xhttp.open("POST", "http://localhost:3000", true);
        xhttp.send(JSON.stringify({type:"update", body: change}));

        var dest = state;
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
    };



    var createNode = function(id, stateInfo) {
        var d = document.createElement("div");
        d.className = "window";
        d.id = id;
        d.style.left = stateInfo.left + "px";
        d.style.top = stateInfo.top + "px";
        //instance.getContainer().appendChild(d);
        canvas.appendChild(d);

        switch(stateInfo.conType) {
            case "out":
                var button = document.createElement("button");
                button.type = "button";
                button.innerText = "Execute";
                //button.style = "width:120px"; // set the CSS class
                var exhttp = new XMLHttpRequest();
                button.onclick = function() {
                    exhttp.open("POST", "http://localhost:3000", true);
                    exhttp.send(JSON.stringify({type:"execute", id: id}));
                };
                var outtext = document.createElement("div");
                exhttp.onreadystatechange = function() {
                    if (exhttp.readyState== 4 && exhttp.status == 200) {
                        outtext.innerHTML = this.responseText;
                    }
                };
                d.style.flexDirection = "column";
                d.style.height = "auto";
                outtext.style.border = "1px solid darkgrey";
                outtext.style.minHeight = "30px";
                outtext.style.width = "100%";
                outtext.style.textAlign = "initial";
                button.style.margin = "10px";
                //var butdiv = document.createElement("div");
                //d.appendChild(butdiv); // put it into the DOM
                d.appendChild(button);
                d.appendChild(outtext);

                instance.addEndpoint(id, targetEndpoint, { anchor: "TopCenter", parameters:{n:1}});

                break;
            default:
                var input = document.createElement("input");
                input.type = "text";
                input.style = "width:120px"; // set the CSS class
                input.value = stateInfo.text;
                input.addEventListener('keyup', function() { //change maybe?
                    //console.log(params);
                    var change = {path:["containers",id], value:{text:input.value}};
                    //console.log(change);
                    commitChange(change);
                });
                d.appendChild(input); // put it into the DOM

                instance.addEndpoint(id, sourceEndpoint); //, {uuid: id+"Source"}

                const n = 4;
                for (var j = 1; j < n + 1; j++) {
                    instance.addEndpoint(id, targetEndpoint, { anchor: [j/(n+1),0,0,-1], parameters:{n:j}}); //, uuid: "Target" + j + id
                }
        }




        // initialise draggable elements.
        instance.draggable(d, {
            start:function() {
                canvasClone.appendChild(d);
            },
            stop:function(params) {
                // console.log(params);
                canvas.appendChild(d);
                if(params.e.x < 200){
                    //not necessary cause events
                   /* instance.select({source: params.el.id}).each(function(connection) {
                        var change = {path:["containers",connection.targetId, "connections", connection.getParameter('n')+''], delete:true};
                        commitChange(change);
                        //console.log(connection.targetId, connection.getParameter('n'));
                    });*/
                    instance.remove(params.el.id);
                    var change = {path:["containers",params.el.id], delete:true};
                    commitChange(change);
                }else{
                    var change = {path:["containers",params.el.id], value:{left:params.finalPos[0],top:params.finalPos[1]}};
                    commitChange(change);
                }

                //console.log(params);
            }});




        // return d;
    };




/*


    var getSource = function(endpoint) {
        return endpoint.connections[0].source
    };


    // suspend drawing and initialise.
    instance.batch(function () {
        var e = instance.addEndpoint(output.id, targetEndpoint, { anchor: "TopCenter", uuid: output.id + "Target"});
        // output.myattr = 1;
        // console.log(document.getElementById("OutputWindow").myattr);
        var button = document.getElementById("OutputButton");
        var outtext = document.getElementById("OutputText");





        button.onclick = function() {
            var pred = getSource(e);
            vcnt = 1;
            code = "pass";
            clr(pred);
            rec(pred);
            console.log(code);
            xhttp.open("POST", "http://localhost:3000", true);
            xhttp.send(code);

/!*            console.log(pred.firstChild.value);
            var endlist = instance.selectEndpoints({target:pred});
            console.log(endlist);
            for (var i = 0; i < endlist.length; i++) {
                console.log(endlist.get(i));
            }*!/
            // console.log(e);
        };

        var vcnt = 1;
        var code = "";

        var rec = function(el){
            if(el.varId > 0){
                return el.varId;
            }
            el.varId = vcnt;
            vcnt++;
            var preds = [];
            var endlist = instance.selectEndpoints({target:el});
            for (var i = 0; i < endlist.length; i++) {
                var endp = endlist.get(i);
                if (endp.connections.length > 0){
                    preds.push(rec(endp.connections[0].source));
                }
            }
            code += ";v"+el.varId+"="+el.firstChild.value;
            if (preds.length > 0){
                code += "(v"+preds[0];
                for (var i = 1; i < preds.length; i++) {
                    code += ",v" + preds[i];
                }
                code += ")";
            }
            return el.varId;
        };

        var clr = function (el) {
            el.varId = 0;
            var endlist = instance.selectEndpoints({target:el});
            for (var i = 0; i < endlist.length; i++) {
                var endp = endlist.get(i);
                if (endp.connections.length > 0){
                    clr(endp.connections[0].source);
                }
            }
        }


    });

    jsPlumb.fire("jsPlumbDemoLoaded", instance);
*/

});


//
// initialise element as connection targets and source.
//
/*   var initNode = function(el) {

       el.varId = 0;

       // initialise draggable elements.
       instance.draggable(el, {
           stop:function(params) {
               console.log(params);
               var change = {path:["containers",params.el.id], value:{left:params.finalPos[0],top:params.finalPos[1]}};
               commitChange(change);
               console.log(state);
           }});

       instance.addEndpoint(el.id, sourceEndpoint, {uuid: el.id+"Source"});

       const n = 4;
       for (var j = 1; j < n + 1; j++) {
           instance.addEndpoint(el.id, targetEndpoint, { anchor: [j/(n+1),0,0,-1], uuid: el.id + "Target" + j });
       }

/!*        instance.makeSource(el, {
           // filter: ".ep",
           anchor: "BottomCenter",
           // connectorStyle: { stroke: "#5c96bc", strokeWidth: 2, outlineStroke: "transparent", outlineWidth: 4 },
           connectionType:"basic",
           // extract:{
           //    "action":"the-action"
           // },
           maxConnections: -1,
           // onMaxConnections: function (info, e) {
           //    alert("Maximum connections (" + info.maxConnections + ") reached");
           // }
       });

       instance.makeTarget(el, {
           dropOptions: { hoverClass: "dragHover" },
           anchor: "Continuous",
           allowLoopback: true
       });*!/

       // this is not part of the core demo functionality; it is a means for the Toolkit edition's wrapped
       // version of this demo to find out about new nodes being added.
       //
       //instance.fire("jsPlumbDemoNodeAdded", el);
   };*/


/*   var newNode = function(x, y) {
       var d = document.createElement("div");
       var id = jsPlumbUtil.uuid();
       d.className = "window";
       d.id = id;
       //d.innerHTML = "<input type=\"text\" style=width:120px value="+id.substring(0, 7)+">"; //"<div>"+id.substring(0, 7)+"</div>";
       d.style.left = x + "px";
       d.style.top = y + "px";
       //d.style.width = "150px";
       instance.getContainer().appendChild(d);

       var input = document.createElement("input");
       input.type = "text";
       input.style = "width:120px"; // set the CSS class
       input.value = id.substring(0, 7);
       input.addEventListener('change', function() { //keyup maybe?
           //console.log(params);
           var change = {path:["containers",id], value:{text:input.value}};
           //console.log(change);
           commitChange(change);
       });

       d.appendChild(input); // put it into the DOM


       initNode(d);
       var change = {path:["containers",id], value:{left:x,top:y,text:id.substring(0, 7)}};
       //console.log(change);
       commitChange(change);
       console.log(state);
       return d;
   };
*/
