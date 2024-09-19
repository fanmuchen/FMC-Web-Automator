const { ipcMain } = require('electron');
const cheerio = require('cheerio');
const WebSocket = require('ws');

class SubtaskRunner {
    constructor(webContents, abortSignal) {
        this.webContents = webContents;
        this.abortSignal = abortSignal;
    }

    checkAbort() {
        if (this.abortSignal()) {
            throw new Error('Task aborted');
        }
    }

    navigate(url) {
        this.checkAbort();
        try {
            this.webContents.send('navigate-to', url);
        } catch (error) {
            console.error('Error during navigation:', error);
        }
    }

    waitForPage(waitTime = 30000, allowContinue = false) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (allowContinue) {
                    resolve(null);
                } else {
                    reject(new Error('Timeout while waiting for page loading'));
                }
            }, waitTime); // default 30 seconds timeout
            ipcMain.once('page-loaded', (event, page) => {
                clearTimeout(timeout); // Clear the timeout if the event is received in time
                if (page) {
                    resolve(page);
                } else {
                    reject(new Error('Failed to retrieve page'));
                }
            });
        }).then(page => {
            this.checkAbort();
            return page;
        }).catch(error => {
            console.error('Error:', error);
            throw error;
        });
    }

    parsePage(html) {
        this.checkAbort();
        const $ = cheerio.load(html);
        const clickableItems = [];

        $('a, button').each(function () {
            const text = $(this).text().trim();
            if (text) {
                clickableItems.push(text);
            }
        });

        return clickableItems;
    }

    getElementInfo(method, query) {
        this.checkAbort();
        this.webContents.send('get-element-info', method, query);
        return new Promise((resolve, reject) => {
            ipcMain.once('element-got', (event, element) => {
                resolve(element);
            });
            setTimeout(() => {
                reject(new Error('Timeout waiting for element'));
            }, 5000); // Adjust the timeout as needed
        });
    }


    getClickPos(element) {
        this.checkAbort();
        const { top, left, width, height } = element.boundingClientRect;
        const x = left + width / 2;
        const y = top + height / 2;
        return { x, y };
    }

    mouseClick(x, y, pressTime) {
        this.checkAbort();
        this.webContents.send('mouse-click', x, y, pressTime);
        console.log('Send mouse click at', x, y);
    }

    async scrollToElement(method, query) {
        let element = await this.getElementInfo(method, query);
        // console.log("getting webview size");
        const webviewSize = await this.getWebviewSize();
        const { width: webviewWidth, height: webviewHeight } = webviewSize;
        // console.log("sending scroll");
        while (element && (element.boundingClientRect.top < 0 || element.boundingClientRect.top + element.boundingClientRect.height > webviewHeight || element.boundingClientRect.left < 0 || element.boundingClientRect.left + element.boundingClientRect.width > webviewWidth)) {
            const { top, left, width, height } = element.boundingClientRect;
            const scrollX = Math.max(0, left - (webviewWidth / 2 - width / 2));
            const scrollY = Math.max(0, top - (webviewHeight / 2 - height / 2));
            this.webContents.send('scroll', scrollX, scrollY);
            console.log("scrolling...");
            await this.delay(500); // Add delay to allow scroll to complete
            element = await this.getElementInfo(method, query); // Re-acquire the element position
        }
    }

    async getWebviewSize() {
        this.checkAbort();
        return new Promise((resolve) => {
            ipcMain.once('webview-size', (event, size) => {
                resolve(size);
            });
            this.webContents.send('get-size');
        });
    }

    async clickElement(method, query) {
        this.checkAbort();
        console.log("1");
        await this.scrollToElement(method, query);
        console.log("2");
        const element = await this.getElementInfo(method, query);
        console.log("3");
        if (element) {
            const { x, y } = this.getClickPos(element);
            this.mouseClick(x, y, 10);
        } else {
            console.error('Element not found');
        }
    }

    delay(elapseTime) {
        return new Promise(resolve => {
            setTimeout(() => {
                this.checkAbort();
                resolve();
            }, elapseTime);
        });
    }

    sendToClient(data) {
        this.checkAbort();
        global.wsClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }

    mouseMove(startX, startY, endX, endY, duration) {
        this.checkAbort();
        this.webContents.send('mouse-move', startX, startY, endX, endY, duration);
        console.log('Send mouse move from', startX, startY, 'to', endX, endY, 'over', duration, 'ms');
    }

    mousePress(x, y) {
        this.checkAbort();
        this.webContents.send('mouse-press', x, y);
        console.log('Send mouse press at', x, y);
    }

    mouseUp(x, y) {
        this.checkAbort();
        this.webContents.send('mouse-up', x, y);
        console.log('Send mouse up at', x, y);
    }

    keyClick(key) {
        this.checkAbort();
        this.webContents.send('key-click', key);
        console.log('Send key click:', key);
    }

    keyPress(key) {
        this.checkAbort();
        this.webContents.send('key-press', key);
        console.log('Send key press:', key);
    }

    keyUp(key) {
        this.checkAbort();
        this.webContents.send('key-up', key);
        console.log('Send key up:', key);
    }

    type(text, minInt, maxInt) {
        this.checkAbort();
        this.webContents.send('type', text, minInt, maxInt);
        console.log('Send type:', text, 'with interval between', minInt, 'and', maxInt, 'ms');
        return new Promise(resolve => setTimeout(resolve, text.length * maxInt));
    }
}

module.exports = SubtaskRunner;
