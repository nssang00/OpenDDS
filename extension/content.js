window.addEventListener('load', function() {
    // 모든 비디오 태그를 찾습니다.
    const videos = document.querySelectorAll('video');
    
    videos.forEach((video) => {
        // 이미 다운로드 버튼이 있다면 무시
        if (video.parentNode.querySelector('.download-btn')) return;

        // 다운로드 버튼 생성
        const button = document.createElement('button');
        button.innerText = 'Download Video';
        button.classList.add('download-btn');
        button.style.position = 'absolute';
        button.style.top = '10px';
        button.style.left = '10px';
        button.style.zIndex = '1000';

        // 버튼 클릭 시 m3u8 파일을 다운로드하는 기능 추가
        button.addEventListener('click', function() {
            const source = video.querySelector('source[src$=".m3u8"]');
            if (source) {
                window.open(source.src);  // 새 창에서 m3u8 파일 열기
            } else {
                alert('No m3u8 video found.');
            }
        });

        // 비디오 태그 부모 요소에 버튼 추가
        video.parentNode.style.position = 'relative';
        video.parentNode.appendChild(button);
    });
});
