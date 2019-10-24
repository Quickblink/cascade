import json
import os

filename = 'state.json'

def joinObjects(obj1, obj2, deep):
    #TODO: add deep merge
    for key in obj2:
        obj1[key] = obj2[key]

def isObject(dict1, key):
    return type(dict1[key]) is dict #key in dict1 and 
    #TODO: lists should work as well
  
def isNone(obj, key):
    if type(obj) is dict:
        return not key in obj
    else:
        return key >= len(obj)

class StateManager:
    def __init__(self):
        if os.path.exists(filename):
            with open(filename, 'r') as f:
                self.state = json.loads(f.read())
        else:
            self.state = {'curContext':[], 'mainContext':{'canvas': {'pos':[0,0], 'scale':1}}}
            with open(filename, 'w') as out:
                out.write(json.dumps(self.state))
        self.loadContext()

    def followPath(self, path):
        dest = self.state if path[0] == 'state' else self.context
        for i in range(1, len(path) - 1):
            if isNone(dest, path[i]):
                dest[path[i]] = {} if type(path[i+1]) is str else []
            dest = dest[path[i]]
        return dest
        
    def commit(self, change):
        print(change)
        print('')
        dest = self.followPath(change['path'])
        last = change['path'][-1]
        value = change['value'] if 'value' in change else None
        
        if 'sourceMode' in change:
            src = self.followPath(change['value'])
            srcKey = change['value'][-1]
            value = src[srcKey]
            if change['sourceMode'] == 'move':
                del src[srcKey]
        
        if change['mode'] == 'delete':
            del dest[last]
        elif change['mode'] == 'insert':
            dest.insert(last, value)
        elif change['mode'] == 'merge' and not isNone(dest, last) and isObject(dest, last):
            joinObjects(dest[last], change['value'], False)
        else:
            dest[last] = change['value']
        with open('state.json', 'w') as out:
            out.write(json.dumps(self.state))

    def loadContext(self):
        #print('Context loaded.')
        self.context = self.state['mainContext']
        for id in self.state['curContext']:
            self.context = self.context['containers'][id]['inner']

    def switchContext(self, newContext):
        self.state['curContext'] = newContext
        self.loadContext()
        with open('state.json', 'w') as out:
            out.write(json.dumps(self.state))

    def jumpIn(self, id):
        self.state['curContext'].append(id)
        self.context = self.context['containers'][id]['inner']

    def jumpOut(self):
        id = self.state['curContext'].pop()
        self.loadContext()
        return id
