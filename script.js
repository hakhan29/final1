const video = document.getElementById('video');
const expressionDiv = document.getElementById('expression');

// 모델 파일 로드
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(startVideo);

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => video.srcObject = stream)
        .catch(err => console.error(err));
}

video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);

    const hexCanvas = document.createElement('canvas');
    hexCanvas.width = 300;
    hexCanvas.height = 300;
    hexCanvas.style.position = 'absolute';
    hexCanvas.style.top = '10px';
    hexCanvas.style.right = '10px';
    document.body.append(hexCanvas);
    const hexContext = hexCanvas.getContext('2d');

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();

        if (detections.length > 0) {
            const expressions = detections[0].expressions;

            // 감정별 색상 및 비율
            const colors = {
                anger: `rgba(255, 0, 0, ${expressions.anger || 0})`,        // 빨강
                happy: `rgba(255, 255, 0, ${expressions.happy || 0})`,      // 노랑
                sad: `rgba(0, 0, 255, ${expressions.sad || 0})`,            // 파랑
                neutral: `rgba(255, 255, 255, ${expressions.neutral || 0})`, // 흰색
                surprised: `rgba(255, 165, 0, ${expressions.surprised || 0})`, // 주황
                fear: `rgba(128, 0, 128, ${expressions.fear || 0})`          // 보라
            };

            // 6각형 중심 및 반지름 설정
            const centerX = hexCanvas.width / 2;
            const centerY = hexCanvas.height / 2;
            const radius = 100;

            // 6각형 꼭짓점 계산
            const points = [];
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 2; // 각도를 회전하여 위쪽 꼭짓점부터 시작
                points.push({
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle),
                });
            }

            // 캔버스 초기화
            hexContext.clearRect(0, 0, hexCanvas.width, hexCanvas.height);

            // 감정별로 영역 나누기
            const colorKeys = Object.keys(colors);
            for (let i = 0; i < points.length; i++) {
                const nextIndex = (i + 1) % points.length; // 다음 꼭짓점 인덱스
                const gradient = hexContext.createLinearGradient(centerX, centerY, points[i].x, points[i].y);

                // 현재 감정과 다음 감정의 색상 추가
                gradient.addColorStop(0, colors[colorKeys[i]]);
                gradient.addColorStop(1, colors[colorKeys[nextIndex]]);

                // 삼각형 영역 그리기
                hexContext.beginPath();
                hexContext.moveTo(centerX, centerY); // 중심점
                hexContext.lineTo(points[i].x, points[i].y); // 현재 꼭짓점
                hexContext.lineTo(points[nextIndex].x, points[nextIndex].y); // 다음 꼭짓점
                hexContext.closePath();

                // 그라데이션 채우기
                hexContext.fillStyle = gradient;
                hexContext.fill();
            }
        } else {
            hexContext.clearRect(0, 0, hexCanvas.width, hexCanvas.height);
        }
    }, 100);
});
