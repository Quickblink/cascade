import {sourceEndpoint, targetEndpoint} from "./style/style.js";

class BaseNode{
    constructor(id, stateInfo, nodeM){
        this.id = id;
        this.stateInfo = stateInfo;
        this.nodeM = nodeM;
        this.d = document.createElement("div");
        this.d.className = "window";
        this.d.id = id;
        this.d.style.left = stateInfo.left + "px";
        this.d.style.top = stateInfo.top + "px";
    }
}

class InNode extends BaseNode{
    makeNode(){
        this.nodeM.dest.appendChild(this.d);
        this.stateInfo.text = this.id.substring(0, 7);
        this.makeInput();
        this.input.addEventListener('keyup', function() {
            var change = {path:["containers",this.id], value:{text:this.input.value}};
            this.nodeM.stateM.commitChange(change);
        }.bind(this));

        this.nodeM.plumbInstance.addEndpoint(this.id, sourceEndpoint);
        const n = 4;
        for (var j = 1; j < n + 1; j++) {
            this.nodeM.plumbInstance.addEndpoint(this.id, targetEndpoint, { anchor: [j/(n+1),0,0,-1], parameters:{n:j}});
        }
    }

    makeDummy(){
        this.nodeM.dummydest.appendChild(this.d);
        this.makeInput();
        this.input.disabled = true;
    }

    makeInput(){
        this.input = document.createElement("input");
        this.input.type = "text";
        this.input.style = "width:120px";
        this.input.value = this.stateInfo.text;
        this.d.appendChild(this.input);
    }
}


class OutNode extends BaseNode{
    makeNode(){
        this.nodeM.dest.appendChild(this.d);
        this.makeStuff();

        var exhttp = new XMLHttpRequest();
        this.button.onclick = function() {
            exhttp.open("POST", "http://localhost:3000", true);
            exhttp.send(JSON.stringify({type:"execute", body:{id: this.id}}));
        }.bind(this);
        var that = this;
        exhttp.onreadystatechange = function() {
            if (exhttp.readyState== 4 && exhttp.status == 200) {
                that.outtext.innerHTML = this.responseText;
            }
        };

        this.nodeM.plumbInstance.addEndpoint(this.id, targetEndpoint, { anchor: "TopCenter", parameters:{n:1}});

    }


    makeDummy(){
        this.nodeM.dummydest.appendChild(this.d);
        this.makeStuff();
        this.button.disabled = true;
    }

    makeStuff(){
        this.button = document.createElement("button");
        this.button.type = "button";
        this.button.innerText = "Execute";

        this.outtext = document.createElement("div");

        this.d.style.flexDirection = "column";
        this.d.style.height = "auto";
        this.outtext.style.border = "1px solid darkgrey";
        this.outtext.style.minHeight = "30px";
        this.outtext.style.width = "100%";
        this.outtext.style.textAlign = "initial";
        this.button.style.margin = "10px";

        this.d.appendChild(this.button); // put it into the DOM
        this.d.appendChild(this.outtext); // put it into the DOM
    }
}

class ContainerNode extends BaseNode{
    makeNode(){
        this.nodeM.dest.appendChild(this.d);
        this.stateInfo.inner = {canvas: {pos:[0,0], scale:1}, containers: {}}; //TODO: add inner nodes
        this.makeStuff();
        this.button.onclick = function() {
            this.nodeM.stateM.switchDown(this.id);
        }.bind(this);
    }

    makeDummy(){
        this.nodeM.dummydest.appendChild(this.d);
        this.makeStuff();
        this.button.disabled = true;
    }

    makeStuff(){
        this.button = document.createElement("button");
        this.button.type = "button";
        this.button.innerText = "Step in";
        this.d.appendChild(this.button); // put it into the DOM
    }
}

class PlugNode extends BaseNode{
    makeStuff(){
        this.nodeM.dest.appendChild(this.d);
        this.button = document.createElement("button");
        this.button.type = "button";
        this.button.innerText = "Step out";
        this.button.onclick = function() {
            this.nodeM.stateM.switchUp();
        }.bind(this);
        this.d.appendChild(this.button); // put it into the DOM
    }
}

class PlugIn extends PlugNode{
    makeNode(){
        this.makeStuff();
        //TODO: make source endpoints
    }
}

class PlugOut extends PlugNode{
    makeNode(){
        this.makeStuff();
        //TODO: make target endpoints
    }
}


const createSwitch = function(id, stateInfo, nodeM) {
    switch (stateInfo.conType) {
        case "out":
            return new OutNode(id, stateInfo, nodeM);
        case "in":
            return new InNode(id, stateInfo, nodeM);
        default:
            console.error("Tried to create unsupported node of type " + stateInfo.conType);
    }
};


export class NodeManager {
    constructor(stateM, plumbInstance, dest, dummydest){
        this.stateM = stateM;
        this.plumbInstance = plumbInstance;
        this.dest = dest;
        this.dummydest = dummydest;
    }
    createNode(id, stateInfo){
        var node = createSwitch(id, stateInfo, this);
        node.makeNode();
        return node.d;
    }

    createDummyNode(id, stateInfo){
        var node = createSwitch(id, stateInfo, this);
        node.makeDummy();
        return node.d;
    }

}
