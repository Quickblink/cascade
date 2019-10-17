import http.server
import socketserver
from http import HTTPStatus
import numpy as np
import json
import os
from state import StateManager

PORT = 3000


stateManager = StateManager()




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

        #exec(y, vars)
        #self.wfile.write(bytes(str(vars['v1']),  'utf-8'))
        #print('Message sent!')


    def execute(self, message):
        self.vcnt = 1
        self.code = 'pass'
        outwin = stateManager.context['containers'][message['id']]
        #print(state)
        if 'connections' in outwin and '1' in outwin['connections']:
            pred = outwin['connections']['1']
            self.clr(pred)
            self.rec(pred)
            vars = {'np':np}
            print(self.code)
            exec(self.code, vars)
            self.wfile.write(bytes(str(vars['v1']),  'utf-8'))
            #print('Message sent!')

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
                return 333 #Error
        if dic[id]['conType'] == 'plugin':
            conId = stateManager.jumpOut()
            container = stateManager.context['containers'][conId]
            if 'connections' in container and src['k'] in container['connections']:
                res = self.rec(container['connections'][src['k']])
                stateManager.jumpIn(conId)
                return res
            else:
                return 333 #Error
        if 'varId' in dic[id]:
            return dic[id]['varId']
        dic[id]['varId'] = self.vcnt
        tcode = ";v"+str(self.vcnt)+"="+dic[id]['text']
        self.vcnt += 1
        if 'connections' in dic[id] and len(dic[id]['connections'])>0:
            tcode += '('
            first = True
            for srcId in dic[id]['connections'].values():
                if not first:
                    tcode += ','
                first = False
                tcode += 'v' + str(self.rec(srcId))
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
                return 333 #Error
        if dic[id]['conType'] == 'plugin':
            conId = stateManager.jumpOut()
            container = stateManager.context['containers'][conId]
            if 'connections' in container and src['k'] in container['connections']:
                res = self.clr(container['connections'][src['k']])
                stateManager.jumpIn(conId)
                return res
            else:
                return 333 #Error
        if 'varId' in dic[id]:
            del dic[id]['varId']
        if 'connections' in dic[id] and len(dic[id]['connections'])>0:
            for srcId in dic[id]['connections'].values():
                self.clr(srcId)





httpd = socketserver.TCPServer(("", PORT), MyHandler)

print("serving at port", PORT)
httpd.serve_forever()
