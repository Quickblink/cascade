import http.server
import socketserver
from http import HTTPStatus
import numpy as np
import json

PORT = 3000


state = {}

#TODO: clean this

with open('state.json', 'a') as f:
    pass

with open('state.json', 'r') as f:
    instr = f.read()

if len(instr) > 0:
    state = json.loads(instr)
else:
    with open('state.json', 'w') as out:
        out.write(json.dumps(state))

del instr

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
            update = z['body']
            print(update)
            print('')
            self.commit(update)
            #print(state)
        elif z['type'] == 'execute':
            self.vcnt = 1
            self.code = 'pass'
            outwin = state['containers'][z['id']]
            print(state)
            if 'connections' in outwin and '1' in outwin['connections']:
                pred = outwin['connections']['1']
                self.clr(pred)
                self.rec(pred)
                vars = {'np':np}
                print(self.code)
                exec(self.code, vars)
                self.wfile.write(bytes(str(vars['v1']),  'utf-8'))
                print('Message sent!')

        #exec(y, vars)
        #self.wfile.write(bytes(str(vars['v1']),  'utf-8'))
        #print('Message sent!')

    def joinObjects(self, obj1, obj2, deep):
        #TODO: add deep merge
        for key in obj2:
            obj1[key] = obj2[key]

    def isObject(self, dict1, key):
        return key in dict1 and type(dict1[key]) is dict

    def commit(self, change):
        dest = state
        for i in range(len(change['path']) - 1):
            if not self.isObject(dest, change['path'][i]):
                dest[change['path'][i]] = {}
            dest = dest[change['path'][i]]
        last = change['path'][-1]
        if 'delete' in change:
            del dest[last]
        elif 'strict' in change or not self.isObject(dest, last):
            dest[last] = change['value']
        else:
            self.joinObjects(dest[last], change['value'], 'deep' in change)
        with open('state.json', 'w') as out:
            out.write(json.dumps(state))


    def rec(self, id):
        dic = state['containers']
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

    def clr(self, id):
        dic = state['containers']
        if 'varId' in dic[id]:
            del dic[id]['varId']
        if 'connections' in dic[id] and len(dic[id]['connections'])>0:
            for srcId in dic[id]['connections'].values():
                self.clr(srcId)





httpd = socketserver.TCPServer(("", PORT), MyHandler)

print("serving at port", PORT)
httpd.serve_forever()
