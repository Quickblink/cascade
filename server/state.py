import json
import os

filename = 'state.json'


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


    def joinObjects(self, obj1, obj2, deep):
        #TODO: add deep merge
        for key in obj2:
            obj1[key] = obj2[key]

    def isObject(self, dict1, key):
        return key in dict1 and type(dict1[key]) is dict

    def commit(self, change):
        print(change)
        print('')
        dest = self.context
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
            out.write(json.dumps(self.state))

    def loadContext(self):
        print('Context loaded.')
        self.context = self.state['mainContext']
        for id in self.state['curContext']:
            self.context = context['containers'][id]['inner']

    def switchContext(self, newContext):
        self.state['curContext'] = newContext
        self.loadContext()
