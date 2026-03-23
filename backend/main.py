from flask import Flask, jsonify
import mysql.connector
import os

app = Flask(__name__)

# Basic MySQL connection placeholder
def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'tdt_crm')
        )
        return conn
    except Exception as e:
        print(f"Error connecting to MySQL: {e}")
        return None

@app.route('/api/status')
def status():
    return jsonify({"status": "running", "database": "connected" if get_db_connection() else "disconnected"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
