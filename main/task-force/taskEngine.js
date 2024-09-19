const { app } = require('electron');
const WebSocket = require('ws');
const path = require('path');

const SubtaskRunner = require('./tasks/subtask-runner');
const task_test = require("./tasks/task_test");
const { task_navigate, task_fillElement, task_clickElement } = require("./tasks/task_basic");
const {
    calculateNextExecutionTime,
    loadData,
    saveData
} = require('./utilities');

class TaskEngine {
    constructor() {
        this.dataPath = path.join(process.cwd(), 'data');
        // this.dataPath = path.join(app.getAppPath(), 'data');
        this.tasklist = [];
        this.profile = {};
        this.isTaskRunning = false;
        this.isUp = false;
        this.webContents = null;
        this.currentTaskId = null;
        this.abortCurrentTask = false;
        this.justCompletedId = null;
        const data = loadData(this.dataPath);
        this.profile = data.profile;
        this.tasklist = data.tasklist;
        this.taskHandlers = {
            'test': task_test,
            'navigate': task_navigate,
            'fillElement': task_fillElement,
            'clickElement': task_clickElement,
            // Add more task handlers here as needed
        };
    }

    addTask(task) {
        this.updateTasklist([...this.tasklist, task]);
    }

    deleteTask(taskId) {
        if (this.currentTaskId === taskId) {
            this.abortCurrentTask = true;
        }
        this.updateTasklist(this.tasklist.filter(task => task.id !== taskId));
    }

    editTask(updatedTask) {
        const updatedTasklist = this.tasklist.map(task =>
            task.id === updatedTask.id ? { ...task, ...updatedTask } : task
        );
        if (!updatedTasklist.some(task => task.id === updatedTask.id)) {
            updatedTasklist.push(updatedTask);
        }
        this.updateTasklist(updatedTasklist);
    }

    updateTasklist(tasklist) {
        this.tasklist = tasklist;
        saveData(this.profile, this.tasklist, this.dataPath);
        this.broadcastTasklist();
    }

    start(webContents) {
        this.webContents = webContents;
        const data = loadData(this.dataPath);
        this.profile = data.profile;
        this.tasklist = data.tasklist;
        this.broadcastTasklist();
        if (!this.isUp) {
            this.runTaskCycle();
        }
        this.isUp = true;
        console.log("Task Engine Started.")
    }

    stop() {
        this.isUp = false;
        console.log("Task Engine Stopped.")
    }

    runTaskCycle() {
        const interval = 1000;
        const taskCycle = setInterval(() => {
            if (!this.isUp) {
                clearInterval(taskCycle);
            }
            if (!this.isTaskRunning && this.isUp) {
                this.executeNextTask();
            }
        }, interval);
    }

    async executeNextTask() {
        const nextTask = this.getNextTask();
        if (nextTask) {
            this.isTaskRunning = true;
            await this.executeTask(nextTask);
            this.isTaskRunning = false;
        } else {
            // console.log('No tasks to execute.');
        }
    }

    async executeTask(task) {
        console.log('Executing task:', task);
        this.currentTaskId = task.id;
        this.abortCurrentTask = false;
        const subtaskRunner = new SubtaskRunner(this.webContents, () => this.abortCurrentTask);
        try {
            const taskHandler = this.taskHandlers[task.type];
            if (taskHandler) {
                await taskHandler(subtaskRunner, task);
                this.justCompletedId = task.id;
            } else {
                console.error('Unknown task type:', task.type);
            }
        } catch (e) {
            console.log(e);
        }
        this.currentTaskId = null;
        if (task.content.activation === 'periodically') {
            task.content.nextActivation = calculateNextExecutionTime(task.content.nextActivation, task.content.activationParams);
            this.editTask(task);
        } else if (task.content.activation === 'oneTime') {
            this.updateTasklist(this.tasklist.filter(t => t.id !== task.id));
        }
    }

    getNextTask() {
        const now = new Date();

        // Check for succeeding tasks first
        for (const task of this.tasklist) {
            if (task.content.activation === 'succeeding' && task.content.activationParams && task.content.activationParams === this.justCompletedId) {
                this.justCompletedId = null;  // Reset justCompletedId after finding the task
                return task;
            }
        }

        for (const task of this.tasklist) {
            if (task.content.activation !== 'succeeding') {
                const nextActivation = new Date(task.content.nextActivation);
                if (isNaN(nextActivation) || nextActivation <= now) {
                    return task;
                }
            }
        }

        return null;
    }



    broadcastTasklist() {
        const message = JSON.stringify({ type: 'tasklist-update', tasklist: this.tasklist });
        global.wsClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
}

module.exports = TaskEngine;
