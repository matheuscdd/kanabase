from functools import partial
from http.server import SimpleHTTPRequestHandler, HTTPServer

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

print("Server on")
DIRECTORY = "./podcasts"

handler = partial(Handler, directory=DIRECTORY)
HTTPServer(("localhost", 3000), handler).serve_forever()