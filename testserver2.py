from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os, json, urllib.parse
ROOT='/mnt/data/audit6'; os.chdir(ROOT)
rec=json.load(open(ROOT+'/data/recovered-articles.json',encoding='utf8'))
mp={ '/'+p['slug']['tr']: '/'+p['slug']['tr']+'.html' for p in rec }
class H(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  p=urllib.parse.urlparse(path).path
  clean=p.rstrip('/') or '/'
  if clean in mp: p=mp[clean]
  return super().translate_path(p)
 def do_GET(self):
  if urllib.parse.urlparse(self.path).path.startswith('/api/'):
   self.send_response(404); self.end_headers(); return
  return super().do_GET()
ThreadingHTTPServer(('127.0.0.1',8766),H).serve_forever()
