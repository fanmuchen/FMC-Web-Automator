async function task_test(s, task = null) {

    let element = null

    s.navigate("https://ts20.x2.international.travian.com/");
    await s.waitForPage();
    await s.delay(100);

    s.getElementInfo('name', 'name')
    element = await s.waitForElement();
    s.clickElement(element);
    await s.delay(100);
    await s.type("knight", 50, 200)

    s.getElementInfo('name', 'password')
    element = await s.waitForElement();
    s.clickElement(element);
    await s.delay(100);
    await s.type("qwe123AA", 50, 200)

    await s.delay(100);
    s.getElementInfo('content', 'Login')
    element = await s.waitForElement();
    s.clickElement(element);

    await s.waitForPage();
    await s.delay(5000);
}

module.exports = task_test;