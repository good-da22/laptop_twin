/**
 * 노트북 디지털 트윈 - Three.js 메인 스크립트
 * 3D 씬 생성, 노트북 모델 로드, 실시간 데이터 시각화
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ===== 전역 변수 =====
let scene, camera, renderer, controls;
let laptop, cpuIndicator, memoryIndicator, batteryIndicator;
let animationId;
let autoRotate = true;
let metricsData = null;

// 색상 팔레트
const colors = {
    normal: 0x00ff88,
    warning: 0xffaa00,
    danger: 0xff4444,
    cpu: {
        cool: 0x00ffff,
        warm: 0xffff00,
        hot: 0xff6600,
        critical: 0xff0000
    }
};

// ===== 초기화 함수 =====
function init() {
    console.log('🚀 Three.js 씬 초기화 시작');
    
    // 씬 생성
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 5, 20);
    
    // 카메라 설정
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 2, 5);
    
    // 렌더러 설정
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // 캔버스 추가
    const container = document.getElementById('canvas-container');
    container.appendChild(renderer.domElement);
    
    // 컨트롤 설정
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2;
    
    // 조명 설정
    setupLights();
    
    // 노트북 모델 생성
    createLaptopModel();
    
    // 주변 환경 추가
    createEnvironment();
    
    // 이벤트 리스너
    window.addEventListener('resize', onWindowResize);
    setupControlButtons();
    
    // 로딩 완료
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
    }, 1000);
}

// ===== 조명 설정 =====
function setupLights() {
    // 환경광
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // 메인 방향광
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);
    
    // 포인트 라이트 (화면 빛)
    const screenLight = new THREE.PointLight(0x00aaff, 0.5, 5);
    screenLight.position.set(0, 1, 2);
    scene.add(screenLight);
}

// ===== 간단한 노트북 모델 생성 =====
function createLaptopModel() {
    console.log('💻 노트북 모델 생성 중...');
    
    const laptopGroup = new THREE.Group();
    
    // 베이스 (키보드 부분) - 실버 매트 질감
    const baseGeometry = new THREE.BoxGeometry(3, 0.15, 2);
    const baseMaterial = new THREE.MeshPhongMaterial({
        color: 0xc0c0c0,  // 실버 색상
        metalness: 0.3,    // 낮은 금속성 (매트한 느낌)
        roughness: 0.7,    // 높은 거칠기 (매트한 질감)
        specular: 0x666666 // 부드러운 반사
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.castShadow = true;
    base.receiveShadow = true;
    laptopGroup.add(base);
    
    // 키보드 텍스처 (간단한 표현) - 어두운 회색
    const keyboardGeometry = new THREE.BoxGeometry(2.8, 0.01, 1.8);
    const keyboardMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,   // 진한 회색
        emissive: 0x111111,
        emissiveIntensity: 0.1,
        roughness: 0.9     // 매트한 키보드
    });
    const keyboard = new THREE.Mesh(keyboardGeometry, keyboardMaterial);
    keyboard.position.y = 0.08;
    laptopGroup.add(keyboard);
    
    // 스크린 베젤 - 실버 프레임
    const screenFrameGeometry = new THREE.BoxGeometry(3, 2, 0.1);
    const screenFrameMaterial = new THREE.MeshPhongMaterial({
        color: 0xb8b8b8,   // 밝은 실버
        metalness: 0.4,    // 적당한 금속성
        roughness: 0.6     // 매트한 질감
    });
    const screenFrame = new THREE.Mesh(screenFrameGeometry, screenFrameMaterial);
    screenFrame.position.set(0, 1.1, -0.95);
    screenFrame.rotation.x = -0.25;
    screenFrame.castShadow = true;
    laptopGroup.add(screenFrame);
    
    // 스크린 (디스플레이)
    const screenGeometry = new THREE.PlaneGeometry(2.7, 1.7);
    const screenMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        emissive: 0x0055ff,
        emissiveIntensity: 0.1
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 1.1, -0.89);
    screen.rotation.x = -0.25;
    laptopGroup.add(screen);
    
    // CPU 인디케이터 (화면에 오버레이)
    const cpuGeometry = new THREE.PlaneGeometry(0.5, 0.5);
    const cpuMaterial = new THREE.MeshBasicMaterial({
        color: colors.cpu.cool,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    cpuIndicator = new THREE.Mesh(cpuGeometry, cpuMaterial);
    cpuIndicator.position.set(-0.8, 1.4, -0.88);
    cpuIndicator.rotation.x = -0.25;
    laptopGroup.add(cpuIndicator);
    
    // 메모리 인디케이터
    const memoryGeometry = new THREE.PlaneGeometry(0.5, 0.5);
    const memoryMaterial = new THREE.MeshBasicMaterial({
        color: colors.normal,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    memoryIndicator = new THREE.Mesh(memoryGeometry, memoryMaterial);
    memoryIndicator.position.set(0, 1.4, -0.88);
    memoryIndicator.rotation.x = -0.25;
    laptopGroup.add(memoryIndicator);
    
    // 배터리 인디케이터
    const batteryGeometry = new THREE.PlaneGeometry(0.5, 0.5);
    const batteryMaterial = new THREE.MeshBasicMaterial({
        color: colors.normal,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    batteryIndicator = new THREE.Mesh(batteryGeometry, batteryMaterial);
    batteryIndicator.position.set(0.8, 1.4, -0.88);
    batteryIndicator.rotation.x = -0.25;
    laptopGroup.add(batteryIndicator);
    
    // 힌지 (화면과 베이스 연결 부분) - 실버 매트
    const hingeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 16);
    const hingeMaterial = new THREE.MeshPhongMaterial({
        color: 0xa8a8a8,   // 실버 색상
        metalness: 0.5,    // 중간 금속성
        roughness: 0.5     // 매트한 질감
    });
    const hinge = new THREE.Mesh(hingeGeometry, hingeMaterial);
    hinge.position.set(0, 0.1, -1);
    hinge.rotation.z = Math.PI / 2;
    laptopGroup.add(hinge);
    
    laptop = laptopGroup;
    scene.add(laptop);
    
    // 파티클 시스템 추가 (CPU 온도 표현)
    createParticleSystem();
}

// ===== 파티클 시스템 =====
let particleSystem;

function createParticleSystem() {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 4;
        positions[i + 1] = Math.random() * 3;
        positions[i + 2] = (Math.random() - 0.5) * 4;
        
        colors[i] = 0;
        colors[i + 1] = 1;
        colors[i + 2] = 1;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    
    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
}

function updateParticles(cpuPercent) {
    if (!particleSystem) return;
    
    const positions = particleSystem.geometry.attributes.position.array;
    const colors = particleSystem.geometry.attributes.color.array;
    const intensity = cpuPercent / 100;
    
    for (let i = 0; i < positions.length; i += 3) {
        // 위로 이동
        positions[i + 1] += 0.01 * (1 + intensity);
        
        // 상단 도달시 리셋
        if (positions[i + 1] > 3) {
            positions[i + 1] = 0;
            positions[i] = (Math.random() - 0.5) * 4;
            positions[i + 2] = (Math.random() - 0.5) * 4;
        }
        
        // 색상 업데이트 (CPU 온도에 따라)
        if (cpuPercent < 30) {
            colors[i] = 0; colors[i + 1] = 1; colors[i + 2] = 1; // 시안
        } else if (cpuPercent < 60) {
            colors[i] = 1; colors[i + 1] = 1; colors[i + 2] = 0; // 노란색
        } else if (cpuPercent < 80) {
            colors[i] = 1; colors[i + 1] = 0.5; colors[i + 2] = 0; // 주황색
        } else {
            colors[i] = 1; colors[i + 1] = 0; colors[i + 2] = 0; // 빨간색
        }
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.geometry.attributes.color.needsUpdate = true;
}

// ===== 환경 요소 추가 =====
function createEnvironment() {
    // 바닥
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshPhongMaterial({
        color: 0x222233,
        metalness: 0.2,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // 그리드
    const gridHelper = new THREE.GridHelper(20, 20, 0x444466, 0x333344);
    gridHelper.position.y = -0.09;
    scene.add(gridHelper);
}

// ===== 데이터 업데이트 =====
async function updateMetrics() {
    try {
        const response = await fetch('/api/metrics');
        if (!response.ok) throw new Error('서버 응답 오류');
        
        const data = await response.json();
        metricsData = data;
        
        // UI 업데이트
        updateDashboard(data);
        
        // 3D 모델 업데이트
        update3DModel(data);
        
        // 에러 메시지 숨기기
        document.getElementById('error-message').classList.add('hidden');
        
    } catch (error) {
        console.error('메트릭 업데이트 실패:', error);
        document.getElementById('error-message').classList.remove('hidden');
    }
}

function updateDashboard(data) {
    // CPU
    const cpuValue = data.cpu.percent.toFixed(1);
    document.getElementById('cpu-value').textContent = cpuValue;
    const cpuBar = document.getElementById('cpu-bar');
    cpuBar.style.width = `${cpuValue}%`;
    
    // 색상 변경
    cpuBar.className = 'bar-fill';
    if (data.cpu.percent > 80) {
        cpuBar.classList.add('danger');
    } else if (data.cpu.percent > 60) {
        cpuBar.classList.add('warning');
    }
    
    // 메모리
    const memoryValue = data.memory.percent.toFixed(1);
    document.getElementById('memory-value').textContent = memoryValue;
    const memoryBar = document.getElementById('memory-bar');
    memoryBar.style.width = `${memoryValue}%`;
    
    memoryBar.className = 'bar-fill';
    if (data.memory.percent > 80) {
        memoryBar.classList.add('danger');
    } else if (data.memory.percent > 60) {
        memoryBar.classList.add('warning');
    }
    
    // 배터리
    const batteryValue = data.battery.percent.toFixed(0);
    document.getElementById('battery-value').textContent = batteryValue;
    document.getElementById('battery-bar').style.width = `${batteryValue}%`;
    
    // 디스크
    const diskValue = data.disk.percent.toFixed(1);
    document.getElementById('disk-value').textContent = diskValue;
    document.getElementById('disk-bar').style.width = `${diskValue}%`;
    
    // 프로세스 수
    document.getElementById('process-count').textContent = data.process_count;
}

function update3DModel(data) {
    if (!laptop) return;
    
    // CPU 인디케이터 색상 업데이트
    if (cpuIndicator) {
        let color;
        const cpu = data.cpu.percent;
        
        if (cpu < 30) {
            color = colors.cpu.cool;
        } else if (cpu < 60) {
            color = colors.cpu.warm;
        } else if (cpu < 80) {
            color = colors.cpu.hot;
        } else {
            color = colors.cpu.critical;
        }
        
        cpuIndicator.material.color.setHex(color);
        cpuIndicator.material.opacity = 0.5 + (cpu / 200);
        
        // 펄스 애니메이션
        const scale = 1 + Math.sin(Date.now() * 0.001) * 0.1 * (cpu / 100);
        cpuIndicator.scale.set(scale, scale, 1);
    }
    
    // 메모리 인디케이터
    if (memoryIndicator) {
        const memory = data.memory.percent;
        let color = memory > 80 ? colors.danger : memory > 60 ? colors.warning : colors.normal;
        memoryIndicator.material.color.setHex(color);
        memoryIndicator.material.opacity = 0.5 + (memory / 200);
        
        const scale = 1 + Math.sin(Date.now() * 0.001 + 1) * 0.1 * (memory / 100);
        memoryIndicator.scale.set(scale, scale, 1);
    }
    
    // 배터리 인디케이터
    if (batteryIndicator) {
        const battery = data.battery.percent;
        let color = battery < 20 ? colors.danger : battery < 50 ? colors.warning : colors.normal;
        batteryIndicator.material.color.setHex(color);
        batteryIndicator.material.opacity = 0.5 + (battery / 200);
        
        // 충전 중 애니메이션
        if (data.battery.plugged) {
            const scale = 1 + Math.sin(Date.now() * 0.002) * 0.2;
            batteryIndicator.scale.set(scale, scale, 1);
        }
    }
    
    // 노트북 진동 효과 (CPU 높을 때)
    if (data.cpu.percent > 80) {
        laptop.position.x = Math.sin(Date.now() * 0.01) * 0.01;
        laptop.position.y = Math.sin(Date.now() * 0.015) * 0.01;
    }
    
    // 파티클 업데이트
    updateParticles(data.cpu.percent);
}

// ===== 컨트롤 버튼 설정 =====
function setupControlButtons() {
    // 뷰 리셋
    document.getElementById('btn-reset-view').addEventListener('click', () => {
        camera.position.set(0, 2, 5);
        camera.lookAt(0, 0, 0);
        controls.reset();
    });
    
    // 애니메이션 토글
    document.getElementById('btn-toggle-animation').addEventListener('click', (e) => {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
            e.target.textContent = '▶️ 애니메이션';
        } else {
            animate();
            e.target.textContent = '⏸️ 애니메이션';
        }
    });
    
    // 자동 회전
    document.getElementById('auto-rotate').addEventListener('change', (e) => {
        autoRotate = e.target.checked;
    });
}

// ===== 윈도우 리사이즈 =====
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== 애니메이션 루프 =====
function animate() {
    animationId = requestAnimationFrame(animate);
    
    // 자동 회전
    if (autoRotate && laptop) {
        laptop.rotation.y += 0.003;
    }
    
    // 컨트롤 업데이트
    controls.update();
    
    // 렌더링
    renderer.render(scene, camera);
}

// ===== 메인 실행 =====
window.addEventListener('DOMContentLoaded', () => {
    init();
    animate();
    
    // 데이터 업데이트 시작
    updateMetrics();
    setInterval(updateMetrics, 1000); // 1초마다 업데이트
});

// 디버깅용 전역 노출
window.debugScene = () => {
    console.log('Scene:', scene);
    console.log('Camera:', camera);
    console.log('Laptop:', laptop);
    console.log('Metrics:', metricsData);
};