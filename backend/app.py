"""
노트북 디지털 트윈 - Python 백엔드
실시간 시스템 메트릭을 수집하고 REST API로 제공합니다.
"""

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import psutil
import json
from datetime import datetime

# Flask 앱 초기화
app = Flask(__name__, static_folder='../frontend')
CORS(app)  # CORS 설정 - 브라우저에서 API 호출 가능하게 함

# 메트릭 히스토리 저장 (선택적)
metrics_history = []

@app.route('/')
def index():
    """메인 페이지 제공"""
    return send_from_directory('../frontend', 'index.html')

@app.route('/js/<path:path>')
def send_js(path):
    """JavaScript 파일 제공"""
    return send_from_directory('../frontend/js', path)

@app.route('/css/<path:path>')
def send_css(path):
    """CSS 파일 제공"""
    return send_from_directory('../frontend/css', path)

@app.route('/api/system-info')
def system_info():
    """시스템 기본 정보"""
    try:
        battery = psutil.sensors_battery()
        return jsonify({
            'cpu_count': psutil.cpu_count(),
            'cpu_freq': psutil.cpu_freq().current if psutil.cpu_freq() else 0,
            'total_memory': psutil.virtual_memory().total / (1024**3),  # GB로 변환
            'has_battery': battery is not None
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/metrics')
def get_metrics():
    """실시간 시스템 메트릭 반환"""
    try:
        # CPU 정보
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_freq = psutil.cpu_freq()
        
        # 메모리 정보
        memory = psutil.virtual_memory()
        
        # 디스크 정보
        disk = psutil.disk_usage('/')
        
        # 배터리 정보 (노트북인 경우)
        battery = psutil.sensors_battery()
        battery_data = {
            'percent': battery.percent if battery else 100,
            'plugged': battery.power_plugged if battery else True,
            'time_left': battery.secsleft if battery and battery.secsleft != -1 else None
        }
        
        # 네트워크 정보
        net_io = psutil.net_io_counters()
        
        # 프로세스 정보
        process_count = len(psutil.pids())
        
        # 온도 정보 (가능한 경우)
        temps = {}
        try:
            if hasattr(psutil, "sensors_temperatures"):
                temp_data = psutil.sensors_temperatures()
                if temp_data:
                    for name, entries in temp_data.items():
                        if entries:
                            temps[name] = entries[0].current
        except:
            pass
        
        # 응답 데이터 구성
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'cpu': {
                'percent': cpu_percent,
                'frequency': cpu_freq.current if cpu_freq else 0,
                'frequency_max': cpu_freq.max if cpu_freq else 0,
                'cores': psutil.cpu_count(),
                'temperature': temps.get('coretemp', temps.get('cpu_thermal', 0))
            },
            'memory': {
                'percent': memory.percent,
                'used': memory.used / (1024**3),  # GB로 변환
                'total': memory.total / (1024**3),
                'available': memory.available / (1024**3)
            },
            'disk': {
                'percent': disk.percent,
                'used': disk.used / (1024**3),
                'total': disk.total / (1024**3),
                'free': disk.free / (1024**3)
            },
            'battery': battery_data,
            'network': {
                'bytes_sent': net_io.bytes_sent,
                'bytes_recv': net_io.bytes_recv,
                'packets_sent': net_io.packets_sent,
                'packets_recv': net_io.packets_recv
            },
            'process_count': process_count
        }
        
        # 히스토리 저장 (최근 60개만)
        metrics_history.append(metrics)
        if len(metrics_history) > 60:
            metrics_history.pop(0)
        
        return jsonify(metrics)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/metrics/history')
def get_metrics_history():
    """최근 60초 메트릭 히스토리"""
    return jsonify(metrics_history)

@app.route('/api/processes/top')
def top_processes():
    """상위 CPU 사용 프로세스"""
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                # CPU 퍼센트를 개별적으로 측정
                proc.cpu_percent(interval=None)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # 0.1초 대기 후 실제 측정
        import time
        time.sleep(0.1)
        
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                cpu_percent = proc.cpu_percent(interval=None)
                memory_percent = proc.memory_percent()
                
                processes.append({
                    'pid': proc.info['pid'],
                    'name': proc.info['name'],
                    'cpu_percent': cpu_percent,
                    'memory_percent': round(memory_percent, 2)
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        
        # CPU 사용률 기준 정렬 후 상위 10개만 반환
        processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
        return jsonify(processes[:10])
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 노트북 디지털 트윈 서버 시작!")
    print("📡 브라우저에서 http://localhost:5000 접속하세요")
    app.run(debug=True, host='0.0.0.0', port=5000)