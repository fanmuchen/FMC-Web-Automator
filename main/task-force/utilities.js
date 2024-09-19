// utilities.js

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function parseInterval(interval) {
    let days = 0, hours = 0, minutes = 0, seconds = 0;

    if (interval.includes(":")) {
        let parts = interval.split(":");
        if (parts.length !== 3) throw new Error("Invalid interval format");
        hours = parseInt(parts[0]);
        minutes = parseInt(parts[1]);
        seconds = parseInt(parts[2]);
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) throw new Error("Invalid interval values");
    } else {
        let regex = /^(\d+d)?(\d+h)?(\d+m)?(\d+s)?$/;
        let matches = interval.match(regex);

        if (!matches) throw new Error("Invalid interval format");

        if (matches[1]) days = parseInt(matches[1]);
        if (matches[2]) hours = parseInt(matches[2]);
        if (matches[3]) minutes = parseInt(matches[3]);
        if (matches[4]) seconds = parseInt(matches[4]);

        if (isNaN(days) || isNaN(hours) || isNaN(minutes) || isNaN(seconds)) throw new Error("Invalid interval values");
    }

    return { days, hours, minutes, seconds };
}

function addIntervalToDate(date, intervalObj) {
    date.setDate(date.getDate() + intervalObj.days);
    date.setHours(date.getHours() + intervalObj.hours);
    date.setMinutes(date.getMinutes() + intervalObj.minutes);
    date.setSeconds(date.getSeconds() + intervalObj.seconds);
}

function calculateNextExecutionTime(currentTime, interval) {
    let intervalObj;
    try {
        intervalObj = parseInterval(interval);
    } catch (error) {
        console.error(error.message);
        return null; // or handle the error as needed
    }

    let currentDate = new Date(currentTime);
    if (isNaN(currentDate.getTime())) {
        currentDate = new Date(); // Reset to now if invalid
    }
    let now = new Date();
    let intervalInMs = (intervalObj.days * 24 * 60 * 60 * 1000) +
        (intervalObj.hours * 60 * 60 * 1000) +
        (intervalObj.minutes * 60 * 1000) +
        (intervalObj.seconds * 1000);

    while (currentDate.getTime() <= now.getTime()) {
        addIntervalToDate(currentDate, intervalObj);
    }

    return currentDate.toISOString();
}


function loadData(dataPath) {
    let profile = {};
    let tasklist = [];

    try {
        const data = fs.readFileSync(path.join(dataPath, 'profile.json'), 'utf8');
        profile = JSON.parse(data);
        console.log('Profile loaded:', profile);
    } catch (error) {
        console.error('Error loading profile:', error);
    }

    try {
        const data = fs.readFileSync(path.join(dataPath, 'tasklist.json'), 'utf8');
        tasklist = JSON.parse(data);
        console.log('Tasks loaded:', tasklist);
    } catch (error) {
        console.error('Error loading tasks:', error);
    }

    return { profile, tasklist };
}

function ensureDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

function saveProfile(profile, dataPath) {
    try {
        const profilePath = path.join(dataPath, 'profile.json');
        ensureDirectoryExistence(profilePath);
        fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf8');
        console.log('Profile saved.');
    } catch (error) {
        console.error('Error saving profile:', error);
    }
}

function saveTasklist(tasklist, dataPath) {
    try {
        const tasklistPath = path.join(dataPath, 'tasklist.json');
        ensureDirectoryExistence(tasklistPath);
        fs.writeFileSync(tasklistPath, JSON.stringify(tasklist, null, 2), 'utf8');
        console.log('Tasks saved.');
    } catch (error) {
        console.error('Error saving tasks:', error);
    }
}

function saveData(profile, tasklist, dataPath) {
    saveProfile(profile, dataPath);
    saveTasklist(tasklist, dataPath);
}

module.exports = {
    parseInterval,
    addIntervalToDate,
    calculateNextExecutionTime,
    loadData,
    saveProfile,
    saveTasklist,
    saveData
};
