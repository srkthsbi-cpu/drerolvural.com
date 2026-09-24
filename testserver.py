from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os, json, urllib.parse
ROOT='/mnt/data/audit6'
rec=json.load(open(ROOT+'/data/recovered-articles.json',encoding='utf8'))
mp={ '/'+p['slug']['tr']: '/'+p['slug']['tr']+'.html' for p in rec }
class H(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  p=urllib.parse.urlparse(path).path
  if p in mp: p=mp[p]
  return super().translate_path(p)
 def do_GET(self):
  if urllib.parse.urlparse(self.path).path.startswith('/api/'):
   self.send_response(404); self.end_headers(); return
  return super().do_GET()
 os.chdir(ROOT)
H.extensions_map.update({'': 'text/plain'})
os.chdir(ROOT)
ThreadingHTTPServer(('127.0.0.1',8765),H).serve_forever()
