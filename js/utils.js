const Utils = {
    getVideoEmbedUrl: function(url, options = { showControls: true, modestBranding: true, showRelated: false }) {
        if (!url) return null;
        const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (driveMatch && url.includes('drive.google.com')) {
            return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
        }
        const iframeMatch = url.match(/src=["'](.*?)["']/);
        const link = iframeMatch ? iframeMatch[1] : url;
        const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?"]*).*/;
        const ytMatch = link.match(ytRegExp);
        if (ytMatch && ytMatch[2].length === 11) {
            const videoId = ytMatch[2];
            let params = [];
            if (options.showControls === false) params.push('controls=0');
            if (options.modestBranding === true) params.push('modestbranding=1');
            if (options.showRelated === false) params.push('rel=0');
            params.push('showinfo=0');
            params.push('iv_load_policy=3');
            const queryString = params.length > 0 ? '?' + params.join('&') : '';
            return `https://www.youtube-nocookie.com/embed/${videoId}${queryString}`;
        }
        return null;
    },
    
    getImageSrc: function(url) {
        if (!url) return null;
        const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (driveMatch && url.includes('drive.google.com')) {
            return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1600`;
        }
        return url;
    },
    
    simpleHash: function(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0;
        }
        return hash.toString();
    },
    
    setupResizers: function() {
        const resizerRight = document.getElementById('dragHandleRight');
        const rightCol = document.getElementById('rightPanel');
        if (resizerRight && rightCol) {
            resizerRight.addEventListener('mousedown', (e) => {
                e.preventDefault();
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                resizerRight.classList.add('resizing');
                const onMove = (e) => {
                    const newWidth = window.innerWidth - e.clientX;
                    if (newWidth > 200 && newWidth < window.innerWidth * 0.6) {
                        rightCol.style.width = newWidth + 'px';
                        rightCol.style.flex = 'none';
                    }
                };
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    document.body.style.cursor = 'default';
                    document.body.style.userSelect = '';
                    resizerRight.classList.remove('resizing');
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        }
        
        const resizerLeft = document.getElementById('dragHandleLeft');
        const leftCol = document.getElementById('leftPanel');
        if (resizerLeft && leftCol) {
            resizerLeft.addEventListener('mousedown', (e) => {
                e.preventDefault();
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                resizerLeft.classList.add('resizing');
                const onMove = (e) => {
                    const newWidth = e.clientX;
                    if (newWidth > 150 && newWidth < window.innerWidth * 0.4) {
                        leftCol.style.width = newWidth + 'px';
                        leftCol.style.flex = 'none';
                    }
                };
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    document.body.style.cursor = 'default';
                    document.body.style.userSelect = '';
                    resizerLeft.classList.remove('resizing');
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        }
    }
};
