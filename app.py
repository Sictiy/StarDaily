#!/usr/bin/env python3
"""Local Star Daily web server, backed by SQLite."""
import json
import os
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
DB = Path(os.environ.get('STAR_DAILY_DB', ROOT / 'data' / 'stars.db'))
SCHEMA = '''CREATE TABLE IF NOT EXISTS editions (date TEXT PRIMARY KEY, collected_at TEXT NOT NULL, source TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS repositories (edition_date TEXT NOT NULL REFERENCES editions(date) ON DELETE CASCADE, rank INTEGER NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL, description TEXT NOT NULL, language TEXT, total_stars INTEGER NOT NULL, daily_stars INTEGER NOT NULL, PRIMARY KEY (edition_date, rank));'''

def connect():
    DB.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB, timeout=30)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    db.executescript(SCHEMA)
    return db

def read_edition(day=None):
    with connect() as db:
        dates = [row['date'] for row in db.execute('SELECT date FROM editions ORDER BY date DESC')]
        selected = day or (dates[0] if dates else None)
        edition = db.execute('SELECT * FROM editions WHERE date=?', (selected,)).fetchone() if selected else None
        rows = db.execute('SELECT rank,name,url,description,language,total_stars,daily_stars FROM repositories WHERE edition_date=? ORDER BY rank', (selected,)).fetchall() if edition else []
        return {'dates': dates, 'edition': dict(edition) if edition else None, 'repositories': [dict(row) for row in rows]}

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = urlparse(self.path)
        if url.path == '/api/editions':
            data = read_edition(parse_qs(url.query).get('date', [None])[0])
            self.respond(200, json.dumps(data, ensure_ascii=False).encode(), 'application/json; charset=utf-8')
        elif url.path in ('/', '/style.css', '/app.js'):
            filename = 'index.html' if url.path == '/' else url.path[1:]
            content_type = {'index.html':'text/html', 'style.css':'text/css', 'app.js':'text/javascript'}[filename]
            self.respond(200, (ROOT / 'static' / filename).read_bytes(), content_type + '; charset=utf-8')
        else:
            self.respond(404, b'Not found', 'text/plain')
    def respond(self, status, body, content_type):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)

if __name__ == '__main__':
    host = os.environ.get('HOST', '127.0.0.1')
    port = int(os.environ.get('PORT', '8000'))
    with ThreadingHTTPServer((host, port), Handler) as server:
        print(f'Star Daily: http://{host}:{port}', flush=True)
        server.serve_forever()
