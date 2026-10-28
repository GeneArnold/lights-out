# Serves the game for trying it on this computer or a phone on the home network, telling browsers
# never to keep a copy, so every reload picks up the latest edits.
# Run from the project folder:  python3 tools/serve.py   (then open http://<this computer>:8796)
import http.server
import socketserver


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("0.0.0.0", 8796), NoCache) as server:
    server.serve_forever()
