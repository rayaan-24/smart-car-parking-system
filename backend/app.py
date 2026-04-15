from flask import Flask, request, send_file
from flask_cors import CORS
import os

def create_app():
    app = Flask(__name__)
    
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'parking-secret-key-2024')
    
    frontend_path = os.path.join(os.path.dirname(__file__), '..', 'frontend')
    
    CORS(app, 
         resources={r"/api/*": {"origins": "*"}},
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    
    from routes.auth import auth_bp
    from routes.parking import parking_bp
    from routes.reservation import reservation_bp
    from routes.admin import admin_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(parking_bp, url_prefix='/api/parking')
    app.register_blueprint(reservation_bp, url_prefix='/api/reservations')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    @app.route('/')
    def index():
        return send_file(os.path.join(frontend_path, 'index.html'))
    
    @app.route('/dashboard.html')
    def dashboard():
        return send_file(os.path.join(frontend_path, 'dashboard.html'))
    
    @app.route('/admin.html')
    def admin_page():
        return send_file(os.path.join(frontend_path, 'admin.html'))
    
    @app.route('/css/<path:filename>')
    def serve_css(filename):
        return send_file(os.path.join(frontend_path, 'css', filename))
    
    @app.route('/js/<path:filename>')
    def serve_js(filename):
        return send_file(os.path.join(frontend_path, 'js', filename))
    
    @app.route('/favicon.ico')
    def favicon():
        return '', 204
    
    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy', 'message': 'Smart Parking API is running'}, 200
    
    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith('/api/'):
            return {'error': 'Endpoint not found'}, 404
        return send_file(os.path.join(frontend_path, 'index.html'))
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
