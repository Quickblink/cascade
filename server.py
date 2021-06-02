import autograd
import autograd.numpy as np
import bintorch as torch
import json
import time
import scipy

PORT = 3000

filename = 'state.json'


def joinObjects(obj1, obj2, deep):
    # TODO: add deep merge
    for key in obj2:
        obj1[key] = obj2[key]


def isObject(dict1, key):
    return type(dict1[key]) is dict  # key in dict1 and
    # TODO: lists should work as well


def isNone(obj, key):
    if type(obj) is dict:
        return not key in obj
    else:
        return key >= len(obj)


def follow(dest, path):
    for i in range(len(path) - 1):
        if isNone(dest, path[i]):
            dest[path[i]] = {} if type(path[i + 1]) is str else []
        dest = dest[path[i]]
    return dest


class StateManager:
    def __init__(self, json_string):
        if json_string:
            self.state = json.loads(json_string)
        else:
            self.state = {'curContext': [], 'mainContext': {'canvas': {'pos': [0, 0], 'scale': 1}}, 'routine': [],
                          'idCounter': 1}
        self.loadContext()

    def followPath(self, path):
        dest = self.state if path[0] == 'state' else self.context
        return follow(dest, path[1:])

    def commit(self, change):
        print(change)
        print('')
        dest = None
        last = change['path'][-1]
        value = change['value'] if 'value' in change else None

        if 'sourceMode' in change:
            if len(change['value']) > len(change['path']) and change['mode'] == 'insert':
                dest = self.followPath(change['path'])
                dest.insert(last, value)
                change['mode'] = 'replace'
            src = self.followPath(change['value'])
            srcKey = change['value'][-1]
            value = src[srcKey]
            if 'sourceMode' in change and change['sourceMode'] == 'move':
                del src[srcKey]

        dest = dest or self.followPath(change['path'])

        if change['mode'] == 'delete':
            del dest[last]
        elif change['mode'] == 'insert':
            dest.insert(last, value)
        elif change['mode'] == 'merge' and not isNone(dest, last) and isObject(dest, last):
            joinObjects(dest[last], value, False)
        else:
            dest[last] = value


    def loadContext(self):
        # print('Context loaded.')
        self.context = self.state['mainContext']
        for id in self.state['curContext']:
            self.context = self.context['containers'][id]['inner']

    def switchContext(self, newContext):
        self.state['curContext'] = newContext
        self.loadContext()


    def jumpIn(self, id):
        self.state['curContext'].append(id)
        self.context = self.context['containers'][id]['inner']

    def jumpOut(self):
        id = self.state['curContext'].pop()
        self.loadContext()
        return id


stateManager = StateManager(json_string)


# make node id's in order n1,n2...
# initialize all nodes (before every routine or seperately) (make initialization codeblock)
# synth code and wrap with function
# return immediately in rec when no parameters

def toggle(ar):
    ar[0] = not ar[0]
    return ar[0]


envi = {}


class MyHandler:

    # only works in python 3.7
    # def __init__(self, *args):
    # http.server.SimpleHTTPRequestHandler.__init__(self, *args, directory='/frontend/')

    def do_POST(self, y):
        z = json.loads(y)
        if z['type'] == 'update':
            stateManager.commit(z['body'])
        elif z['type'] == 'execute':
            return self.execute(z['body'])
        elif z['type'] == 'contextSwitch':
            stateManager.switchContext(z['body'])
        elif z['type'] == 'routine':
            return self.routine()
        elif z['type'] == 'initialize':
            self.initialize()

        # exec(y, vars)
        # self.wfile.write(bytes(str(vars['v1']),  'utf-8'))
        # print('Message sent!')

    def routine(self):
        global envi
        self.parseInitialize()
        # print(self.varCode)
        time_start = time.time()
        self.routineRec(stateManager.state['routine'])
        print(time.time() - time_start)
        newenvi = {}
        for key in envi:
            if key[:2] != 'fn':
                newenvi[key] = envi[key]
        envi = newenvi
        return 'finished'
        # print(not envi)

    def routineRec(self, dic):
        global envi  # TODO: what about this global stuff, was somewhere else previously
        for item in dic:
            if item['class'] == 'execute' and 'connected' in item and item['connected'] in stateManager.context[
                'containers']:
                if 'fn' + item['connected'] in envi:
                    exec('v1=fn' + item['connected'] + '()', envi)
                else:
                    self.onlyEx(item['connected'])
            elif item['class'] == 'initialize':
                envi = {'np': np, 'toggle': toggle, 't': torch, 'sp': scipy}
                exec(self.varCode, envi)
            elif item['class'] == 'loopblock':
                if 'body' in item and 'text' in item:
                    for i in range(int(item['text'])):
                        self.routineRec(item['body'])

    def initialize(self):
        global envi
        self.parseInitialize()
        envi = {'np': np, 'toggle': toggle, 't': torch, 'sp': scipy}
        exec(self.varCode, envi)

    def parseInitialize(self):
        self.varCode = 'pass'
        self.initializeRec(stateManager.state['mainContext']['containers'])

    def initializeRec(self, dic):
        for id, item in dic.items():
            if item['conType'] == 'containerNode':
                self.initializeRec(follow(item, ['inner', 'containers', 'dummyid']))
            elif item['conType'] == 'in':
                self.varCode += ';' + id + '=' + item['text']

    def onlyEx(self, id):
        # print(not envi)
        self.vcnt = 1
        self.code = 'v1=None'
        outwin = stateManager.context['containers'][id]
        # print(state)
        if not ('connections' in outwin and '1' in outwin['connections']): return False
        pred = outwin['connections']['1']
        self.clr(pred)
        self.rec(pred)
        exec('def fn' + id + '():' + self.code + ';return v1', envi)
        exec('v1=fn' + id + '()', envi)
        print(self.code)

        # exec(self.code, envi)
        return True
        # self.wfile.write(bytes(str(vars['v1']),  'utf-8'))
        # print('Message sent!')

    def execute(self, message):
        # print(not envi)
        if self.onlyEx(message['id']):
            return str(envi['v1'])

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
                return 1  # Error
        if dic[id]['conType'] == 'plugin':
            conId = stateManager.jumpOut()
            container = stateManager.context['containers'][conId]
            if 'connections' in container and src['k'] in container['connections']:
                res = self.rec(container['connections'][src['k']])
                stateManager.jumpIn(conId)
                return res
            else:
                stateManager.jumpIn(conId)
                return 1  # Error
        if 'varId' in dic[id]:
            return dic[id]['varId']
        dic[id]['varId'] = id
        if 'connections' in dic[id] and len(dic[id]['connections']) > 0:
            dic[id]['varId'] = 'v' + str(self.vcnt)
            tcode = ';' + dic[id]['varId'] + '=' + id + '('
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
                return 1  # Error
        if dic[id]['conType'] == 'plugin':
            conId = stateManager.jumpOut()
            container = stateManager.context['containers'][conId]
            if 'connections' in container and src['k'] in container['connections']:
                res = self.clr(container['connections'][src['k']])
                stateManager.jumpIn(conId)
                return res
            else:
                stateManager.jumpIn(conId)
                return 1  # Error
        if 'varId' in dic[id]:
            del dic[id]['varId']
        if 'connections' in dic[id] and len(dic[id]['connections']) > 0:
            for srcId in dic[id]['connections'].values():
                self.clr(srcId)


handler = MyHandler()


