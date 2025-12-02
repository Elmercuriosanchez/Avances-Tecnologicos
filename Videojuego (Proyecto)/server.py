#!/usr/bin/env python3
"""
Servidor para el juego de práctica de puntería.
Guarda y recupera las mejores puntuaciones.
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import sqlite3
from urllib.parse import urlparse, parse_qs
import os

# Configuración de la base de datos
DB_FILE = "scores.db"

def init_database():
    """Inicializa la base de datos SQLite para almacenar puntuaciones."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS scores
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  player_name TEXT NOT NULL,
                  score INTEGER NOT NULL,
                  accuracy REAL NOT NULL,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

class GameRequestHandler(BaseHTTPRequestHandler):
    """Manejador de peticiones HTTP para el juego."""
    
    def do_GET(self):
        """Maneja las peticiones GET."""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/':
            # Servir el archivo HTML principal
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            with open('index.html', 'rb') as file:
                self.wfile.write(file.read())
                
        elif parsed_path.path == '/scores':
            # Obtener las mejores puntuaciones
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute('''SELECT player_name, score, accuracy, 
                        strftime('%d/%m/%Y %H:%M', timestamp) as time
                        FROM scores 
                        ORDER BY score DESC, accuracy DESC 
                        LIMIT 10''')
            
            scores = []
            for row in c.fetchall():
                scores.append({
                    'player_name': row[0],
                    'score': row[1],
                    'accuracy': f"{row[2]:.1f}%",
                    'time': row[3]
                })
            
            conn.close()
            self.wfile.write(json.dumps(scores).encode('utf-8'))
            
        elif parsed_path.path == '/game.js':
            # Servir el archivo JavaScript del juego
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            with open('game.js', 'rb') as file:
                self.wfile.write(file.read())
                
        elif parsed_path.path == '/style.css':
            # Servir el archivo CSS
            self.send_response(200)
            self.send_header('Content-Type', 'text/css')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            with open('style.css', 'rb') as file:
                self.wfile.write(file.read())
                
        else:
            # Ruta no encontrada
            self.send_response(404)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<h1>404 - Pagina no encontrada</h1>')
    
    def do_POST(self):
        """Maneja las peticiones POST para guardar puntuaciones."""
        if self.path == '/save_score':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Guardar en la base de datos
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute('''INSERT INTO scores (player_name, score, accuracy) 
                        VALUES (?, ?, ?)''', 
                     (data['player_name'], data['score'], data['accuracy']))
            conn.commit()
            conn.close()
            
            # Responder con éxito
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {'status': 'success', 'message': 'Puntuacion guardada'}
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run_server(port=8000):
    """Inicia el servidor HTTP."""
    init_database()
    server_address = ('', port)
    httpd = HTTPServer(server_address, GameRequestHandler)
    print(f"Servidor iniciado en http://localhost:{port}")
    print("Presiona Ctrl+C para detener el servidor")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()