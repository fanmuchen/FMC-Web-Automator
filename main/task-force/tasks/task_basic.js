async function task_navigate(s, task) {
    console.log(task);
    let url = task.content.url.trim();
    try {
        // Check if the URL has a scheme, if not, add 'http://'
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }

        // Create a new URL object to validate the URL
        let sanitizedURL = new URL(url);

        // Return the sanitized URL string
        url = sanitizedURL.toString();
    } catch (e) {
        // If the URL is invalid, return null
        return null;
    }
    s.navigate(url);
    await s.waitForPage(10000, true);
}

async function task_fillElement(s, task) {

    s.clickElement(task.content.method, task.content.query);
    await s.delay(100);
    await s.type(task.content.text, 50, 200)
}

async function task_clickElement(s, task) {
    s.clickElement(task.content.method, task.content.query);
}

module.exports = { task_navigate, task_fillElement, task_clickElement };
