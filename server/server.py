import http.server
import socketserver
from http import HTTPStatus
import numpy as np
import torch
import json
import os
import time
from state import StateManager, follow

PORT = 3000


stateManager = StateManager()

#make node id's in order n1,n2...
#initialize all nodes (before every routine or seperately) (make initialization codeblock)
#synth code and wrap with function
#return immediately in rec when no parameters

def toggle(ar):
    ar[0] = not ar[0]
    return ar[0]

envi = {}

class MyHandler(http.server.SimpleHTTPRequestHandler):

    #only works in python 3.7
    #def __init__(self, *args):
        #http.server.SimpleHTTPRequestHandler.__init__(self, *args, directory='/frontend/')

    def do_POST(self):
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-type", "text/plain")
        self.end_headers()
        #print('Alive')
        #print(self.rfile)
        #print(self.wfile)
        x = self.headers.get("Content-Length")
        #print(x)
        y = self.rfile.read(int(x)).decode("utf-8")
        #print(y)
        z = json.loads(y)
        if z['type'] == 'update':
            stateManager.commit(z['body'])
        elif z['type'] == 'execute':
            self.execute(z['body'])
        elif z['type'] == 'contextSwitch':
            stateManager.switchContext(z['body'])
        elif z['type'] == 'routine':
            self.routine()
        elif z['type'] == 'initialize':
            self.initialize()

        #exec(y, vars)
        #self.wfile.write(bytes(str(vars['v1']),  'utf-8'))
        #print('Message sent!')
        
    def routine(self):
        global envi
        self.parseInitialize()
        #print(self.varCode)
        time_start = time.time()
        self.routineRec(stateManager.state['routine'])
        print(time.time()-time_start)
        self.wfile.write(bytes('finished',  'utf-8'))
        newenvi = {}
        for key in envi:
            if key[:2] != 'fn':
                newenvi[key] = envi[key]
        envi = newenvi
        #print(not envi)
        
    def routineRec(self, dic):
        global envi
        for item in dic:
            if item['class'] == 'execute' and 'connected' in item and item['connected'] in stateManager.context['containers']:
                if 'fn'+item['connected'] in envi:
                    exec('v1=fn'+item['connected']+'()', envi)
                else:
                    self.onlyEx(item['connected'])
            elif item['class'] == 'initialize':
                envi = {'np':np, 'toggle':toggle, 't':torch}
                exec(self.varCode, envi)
            elif item['class'] == 'loopblock':
                if 'body' in item and 'text' in item:
                    for i in range(int(item['text'])):
                        self.routineRec(item['body'])
                
    def initialize(self):
        global envi
        self.parseInitialize()
        envi = {'np':np, 'toggle':toggle, 't':torch}
        exec(self.varCode, envi)
                
    def parseInitialize(self):
        self.varCode = 'pass'
        self.initializeRec(stateManager.state['mainContext']['containers'])
        
    def initializeRec(self, dic):
        for id, item in dic.items():
            if item['conType'] == 'containerNode':
                self.initializeRec(follow(item, ['inner', 'containers', 'dummyid']))
            elif item['conType'] == 'in':
                self.varCode += ';'+id+'='+item['text']
                
    def onlyEx(self, id):
        #print(not envi)
        self.vcnt = 1
        self.code = 'v1=None'
        outwin = stateManager.context['containers'][id]
        #print(state)
        if not ('connections' in outwin and '1' in outwin['connections']): return False
        pred = outwin['connections']['1']
        self.clr(pred)
        self.rec(pred)
        exec('def fn'+id+'():'+self.code+';return v1', envi)
        exec('v1=fn'+id+'()', envi)
        print(self.code)

        #exec(self.code, envi)
        return True
        #self.wfile.write(bytes(str(vars['v1']),  'utf-8'))
        #print('Message sent!')

    def execute(self, message):
        #print(not envi)
        if self.onlyEx(message['id']):
            self.wfile.write(bytes(str(envi['v1']),  'utf-8'))
        

    def rec(self, src):
        id = src['id']
        dic = stateManager.context['containers']
        if dic[id]['conType'] == 'containerNode':
            stateManager.jumpIn(id)
            plugout = stateManager.context['containers']['plugout']
            if 'connections' in plugout and src['k'] in plugout['connections']:
                res = self.rec(plugout['connections'][src['k']])
                stateManager.jumpOut()
                return res
            else:
                stateManager.jumpOut()
                return 1 #Error
        if dic[id]['conType'] == 'plugin':
            conId = stateManager.jumpOut()
            container = stateManager.context['containers'][conId]
            if 'connections' in container and src['k'] in container['connections']:
                res = self.rec(container['connections'][src['k']])
                stateManager.jumpIn(conId)
                return res
            else:
                stateManager.jumpIn(conId)
                return 1 #Error
        if 'varId' in dic[id]:
            return dic[id]['varId']
        dic[id]['varId'] = id
        if 'connections' in dic[id] and len(dic[id]['connections'])>0:
            dic[id]['varId'] = 'v'+str(self.vcnt)
            tcode = ';'+dic[id]['varId']+'='+id+'('
            self.vcnt += 1
            first = True
            for k, srcId in sorted(dic[id]['connections'].items()):
                if not first:
                    tcode += ','
                first = False
                tcode += self.rec(srcId)
            tcode += ')'
            self.code += tcode
        return dic[id]['varId']

    def clr(self, src):
        id = src['id']
        dic = stateManager.context['containers']
        if dic[id]['conType'] == 'containerNode':
            stateManager.jumpIn(id)
            plugout = stateManager.context['containers']['plugout']
            if 'connections' in plugout and src['k'] in plugout['connections']:
                res = self.clr(plugout['connections'][src['k']])
                stateManager.jumpOut()
                return res
            else:
                stateManager.jumpOut()
                return 1 #Error
        if dic[id]['conType'] == 'plugin':
            conId = stateManager.jumpOut()
            container = stateManager.context['containers'][conId]
            if 'connections' in container and src['k'] in container['connections']:
                res = self.clr(container['connections'][src['k']])
                stateManager.jumpIn(conId)
                return res
            else:
                stateManager.jumpIn(conId)
                return 1 #Error
        if 'varId' in dic[id]:
            del dic[id]['varId']
        if 'connections' in dic[id] and len(dic[id]['connections'])>0:
            for srcId in dic[id]['connections'].values():
                self.clr(srcId)





httpd = socketserver.TCPServer(("", PORT), MyHandler)

print("serving at port", PORT)
httpd.serve_forever()
