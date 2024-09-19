document.addEventListener('DOMContentLoaded', () => {
    const controlPanelUrlInput = document.getElementById('control-panel-url');
    const controlPanelWebview = document.getElementById('control-panel-webview');
    const autoTargetUrlInput = document.getElementById('auto-target-url');
    const autoTargetWebview = document.getElementById('auto-target-webview');
    const autoTargetStatus = document.getElementById('auto-target-status');

    // 设置默认URL
    const controlPanelUrl = `http://localhost:8888`;
    controlPanelUrlInput.value = controlPanelUrl;
    controlPanelWebview.src = controlPanelUrl;

    // Plan B for faking UserAgent.
    const customUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36';
    autoTargetWebview.addEventListener('dom-ready', () => {
        autoTargetWebview.setUserAgent(customUserAgent);
    });

    // 处理左侧地址栏的回车事件
    controlPanelUrlInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            controlPanelWebview.src = controlPanelUrlInput.value;
        }
    });

    // 处理右侧地址栏的回车事件
    autoTargetUrlInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            autoTargetWebview.src = autoTargetUrlInput.value;
        }
    });

    // 处理左侧 "Go" 按钮点击事件
    document.getElementById('control-panel-go').addEventListener('click', () => {
        const url = controlPanelUrlInput.value;
        if (controlPanelWebview.src === url) {
            controlPanelWebview.reload(); // 刷新页面
        } else {
            controlPanelWebview.src = url;
        }
    });

    // 处理右侧 "Go" 按钮点击事件
    document.getElementById('auto-target-go').addEventListener('click', () => {
        const url = autoTargetUrlInput.value;
        if (autoTargetWebview.src === url) {
            autoTargetWebview.reload(); // 刷新页面
        } else {
            autoTargetWebview.src = url;
        }
    });

    // 监听主进程发送的 navigate-to 事件
    window.electronAPI.onNavigateTo((event, url) => {
        if (autoTargetWebview.src.replace(/\/$/, '') === url.replace(/\/$/, '')) //removing any trailing slashes before comparing them
        {
            autoTargetWebview.reload(); // 刷新页面
        } else {
            autoTargetWebview.src = url;
        }
    });

    // 监听左侧 webview 的导航事件，更新地址栏
    controlPanelWebview.addEventListener('did-navigate', (event) => {
        controlPanelUrlInput.value = event.url;
    });

    // 监听右侧 webview 的导航事件，更新地址栏
    autoTargetWebview.addEventListener('did-navigate', (event) => {
        autoTargetUrlInput.value = event.url;
    });

    // 监听右侧 webview 的加载完成事件
    autoTargetWebview.addEventListener('did-finish-load', () => {
        console.log('Page loaded');
        autoTargetStatus.textContent = 'Loaded';

        // Send the rendered HTML to the main process
        autoTargetWebview.executeJavaScript(`
            (function() {
                return document.documentElement.outerHTML;
            })();
        `).then((html) => {
            let page = {
                url: autoTargetWebview.src,
                html: html,
            };
            window.electronAPI.pageLoaded(page);
        });

        // .catch((error) => {
        //     console.error('Error executing JavaScript in webview:', error);  // Add this line to catch any errors
        // });
    });

    // 监听右侧 webview 的加载开始事件
    autoTargetWebview.addEventListener('did-start-loading', () => {
        console.log('Page loading');
        autoTargetStatus.textContent = 'Loading...';
    });

    // 监听右侧 webview 的加载失败事件
    autoTargetWebview.addEventListener('did-fail-load', () => {
        console.log('Page load failed');
        autoTargetStatus.textContent = 'Load Failed';
    });

    // Listen for mouse click events from the main process
    window.electronAPI.onMouseClick((event, x, y, pressTime) => {
        simulateMouseClick(autoTargetWebview, x, y, pressTime);
    });

    // Listen for mouse move events from the main process
    window.electronAPI.onMouseMove((event, startX, startY, endX, endY, duration) => {
        simulateMouseMove(autoTargetWebview, startX, startY, endX, endY, duration);
    });

    // Listen for mouse press events from the main process
    window.electronAPI.onMousePress((event, x, y) => {
        simulateMousePress(autoTargetWebview, x, y);
    });

    // Listen for mouse up events from the main process
    window.electronAPI.onMouseUp((event, x, y) => {
        simulateMouseUp(autoTargetWebview, x, y);
    });

    // Listen for key click events from the main process
    window.electronAPI.onKeyClick((event, key) => {
        simulateKeyClick(autoTargetWebview, key);
    });

    // Listen for key press events from the main process
    window.electronAPI.onKeyPress((event, key) => {
        simulateKeyPress(autoTargetWebview, key);
    });

    // Listen for key up events from the main process
    window.electronAPI.onKeyUp((event, key) => {
        simulateKeyUp(autoTargetWebview, key);
    });

    // Listen for type events from the main process
    window.electronAPI.onType((event, text, minInt, maxInt) => {
        simulateType(autoTargetWebview, text, minInt, maxInt);
    });

    // Listen for get element info requests from the main process
    window.electronAPI.onGetElement(async (event, method, query) => {
        const element = await getElementInfo(autoTargetWebview, method, query);
        window.electronAPI.elementGot(element);
    });

    // Handle scroll event from the main process
    window.electronAPI.onScroll((event, x, y) => {
        autoTargetWebview.executeJavaScript(`window.scrollTo(${x}, ${y});`);
    });

    // Respond to request for webview size
    window.electronAPI.onGetSize(() => {
        const rect = autoTargetWebview.getBoundingClientRect();
        window.electronAPI.webviewSize({ width: rect.width, height: rect.height });
    });
});

function simulateMouseMove(webview, startX, startY, endX, endY, duration) {
    const steps = 50;
    const stepDuration = duration / steps;
    const deltaX = (endX - startX) / steps;
    const deltaY = (endY - startY) / steps;

    let currentX = startX;
    let currentY = startY;
    for (let i = 0; i <= steps; i++) {
        setTimeout(() => {
            webview.sendInputEvent({
                type: 'mouseMove',
                x: currentX,
                y: currentY
            });
            currentX += deltaX;
            currentY += deltaY;
        }, i * stepDuration);
    }
}

function simulateMouseClick(webview, x, y, pressTime = 10) {
    simulateMousePress(webview, x, y);
    setTimeout(() => {
        simulateMouseUp(webview, x, y);
    }, pressTime);
}

function simulateMousePress(webview, x, y) {
    webview.sendInputEvent({
        type: 'mouseDown',
        x: x,
        y: y,
        button: 'left',
        clickCount: 1
    });
}

function simulateMouseUp(webview, x, y) {
    webview.sendInputEvent({
        type: 'mouseUp',
        x: x,
        y: y,
        button: 'left',
        clickCount: 1
    });
}

function simulateKeyClick(webview, key, pressTime = 10) {
    // simulateKeyPress(webview, key);
    simulateChar(webview, key);
    setTimeout(() => {
        // simulateKeyUp(webview, key);
    }, pressTime); // Adding a small delay to simulate a key press
}

function simulateKeyPress(webview, key, modifiers = []) {
    webview.sendInputEvent({
        type: 'keyDown',
        keyCode: key,
        modifiers: modifiers,
    });
}

function simulateChar(webview, key) {
    webview.sendInputEvent({
        type: 'char',
        keyCode: key
    });
}

function simulateKeyUp(webview, key, modifiers) {
    webview.sendInputEvent({
        type: 'keyUp',
        keyCode: key,
        modifiers: modifiers,
    });
}

function createKeySequenceFromString(str) {
    const specialCharMapping = {
        '@': { keyCode: '2', modifiers: ['Shift'] },
        '!': { keyCode: '1', modifiers: ['Shift'] },
        '#': { keyCode: '3', modifiers: ['Shift'] },
        '$': { keyCode: '4', modifiers: ['Shift'] },
        '%': { keyCode: '5', modifiers: ['Shift'] },
        '^': { keyCode: '6', modifiers: ['Shift'] },
        '&': { keyCode: '7', modifiers: ['Shift'] },
        '*': { keyCode: '8', modifiers: ['Shift'] },
        '(': { keyCode: '9', modifiers: ['Shift'] },
        ')': { keyCode: '0', modifiers: ['Shift'] },
        '_': { keyCode: '-', modifiers: ['Shift'] },
        '+': { keyCode: '=', modifiers: ['Shift'] },
        '{': { keyCode: '[', modifiers: ['Shift'] },
        '}': { keyCode: ']', modifiers: ['Shift'] },
        ':': { keyCode: ';', modifiers: ['Shift'] },
        '"': { keyCode: '\'', modifiers: ['Shift'] },
        '<': { keyCode: ',', modifiers: ['Shift'] },
        '>': { keyCode: '.', modifiers: ['Shift'] },
        '?': { keyCode: '/', modifiers: ['Shift'] },
        '|': { keyCode: '\\', modifiers: ['Shift'] },
        '~': { keyCode: '`', modifiers: ['Shift'] },
        'A': { keyCode: 'A', modifiers: ['Shift'] },
        'B': { keyCode: 'B', modifiers: ['Shift'] },
        'C': { keyCode: 'C', modifiers: ['Shift'] },
        'D': { keyCode: 'D', modifiers: ['Shift'] },
        'E': { keyCode: 'E', modifiers: ['Shift'] },
        'F': { keyCode: 'F', modifiers: ['Shift'] },
        'G': { keyCode: 'G', modifiers: ['Shift'] },
        'H': { keyCode: 'H', modifiers: ['Shift'] },
        'I': { keyCode: 'I', modifiers: ['Shift'] },
        'J': { keyCode: 'J', modifiers: ['Shift'] },
        'K': { keyCode: 'K', modifiers: ['Shift'] },
        'L': { keyCode: 'L', modifiers: ['Shift'] },
        'M': { keyCode: 'M', modifiers: ['Shift'] },
        'N': { keyCode: 'N', modifiers: ['Shift'] },
        'O': { keyCode: 'O', modifiers: ['Shift'] },
        'P': { keyCode: 'P', modifiers: ['Shift'] },
        'Q': { keyCode: 'Q', modifiers: ['Shift'] },
        'R': { keyCode: 'R', modifiers: ['Shift'] },
        'S': { keyCode: 'S', modifiers: ['Shift'] },
        'T': { keyCode: 'T', modifiers: ['Shift'] },
        'U': { keyCode: 'U', modifiers: ['Shift'] },
        'V': { keyCode: 'V', modifiers: ['Shift'] },
        'W': { keyCode: 'W', modifiers: ['Shift'] },
        'X': { keyCode: 'X', modifiers: ['Shift'] },
        'Y': { keyCode: 'Y', modifiers: ['Shift'] },
        'Z': { keyCode: 'Z', modifiers: ['Shift'] },
        'a': { keyCode: 'a' },
        'b': { keyCode: 'b' },
        'c': { keyCode: 'c' },
        'd': { keyCode: 'd' },
        'e': { keyCode: 'e' },
        'f': { keyCode: 'f' },
        'g': { keyCode: 'g' },
        'h': { keyCode: 'h' },
        'i': { keyCode: 'i' },
        'j': { keyCode: 'j' },
        'k': { keyCode: 'k' },
        'l': { keyCode: 'l' },
        'm': { keyCode: 'm' },
        'n': { keyCode: 'n' },
        'o': { keyCode: 'o' },
        'p': { keyCode: 'p' },
        'q': { keyCode: 'q' },
        'r': { keyCode: 'r' },
        's': { keyCode: 's' },
        't': { keyCode: 't' },
        'u': { keyCode: 'u' },
        'v': { keyCode: 'v' },
        'w': { keyCode: 'w' },
        'x': { keyCode: 'x' },
        'y': { keyCode: 'y' },
        'z': { keyCode: 'z' }
    };

    const sequence = [];
    for (const char of str) {
        if (specialCharMapping[char]) {
            sequence.push(specialCharMapping[char]);
        } else {
            sequence.push({ keyCode: char });
        }
    }
    return sequence;
}

function simulateType(webview, text, minInt, maxInt) {
    const sequence = createKeySequenceFromString(text);

    let i = 0;
    function typeChar() {
        if (i < sequence.length) {
            const { keyCode, modifiers = [] } = sequence[i];
            simulateKeyPress(webview, keyCode, modifiers);
            simulateChar(webview, text[i]);
            simulateKeyUp(webview, keyCode, modifiers);
            i++;
            const delay = Math.random() * (maxInt - minInt) + minInt;
            setTimeout(typeChar, delay);
        }
    }
    typeChar();
}

async function getElementInfo(webview, method, query) {
    console.log('Method:', method);
    console.log('Query:', query);
    const info = await webview.executeJavaScript(`
        (function() {
            let element;
            switch('${method}') {
                case 'id':
                    element = document.getElementById('${query}');
                    break;
                case 'class':
                    element = document.getElementsByClassName('${query}')[0];
                    break;
                case 'tag':
                    element = document.getElementsByTagName('${query}')[0];
                    break;
                case 'name':
                    element = document.getElementsByName('${query}')[0];
                    break;
                case 'selector':
                    element = document.querySelector('${query}');
                    break;
                case 'xpath':
                    const xpathResult = document.evaluate('${query}', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                    element = xpathResult.snapshotItem(0);
                    break;
                case 'content':
                    const allElements = document.querySelectorAll('*');
                    element = Array.from(allElements).reduce((smallest, el) => {
                        if (el.textContent.includes('${query}')) {
                            if (!smallest || el.clientWidth * el.clientHeight < smallest.clientWidth * el.clientHeight) {
                                return el;
                            }
                        }
                        return smallest;
                    }, null);
                    break;
                default:
                    element = null;
            }
            console.log('Element found:', element);
            if (element) {
                const rect = element.getBoundingClientRect();
                return {
                    id: element.id,
                    tagName: element.tagName,
                    classList: [...element.classList],
                    boundingClientRect: {
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                    }
                };
            } else {
                return null;
            }
        })();
    `);
    console.log(JSON.stringify(info, null, 2));
    return info;
}
