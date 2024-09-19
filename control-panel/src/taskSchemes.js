// taskSchemes.js
export const taskSchemes = [
    {
        group: "default",
        type: "navigate",
        label: "Navigate",
        desc: "Navigate.",
        inputs: [
            { label: "URL", key: "url", type: "string" },
            { label: "Priority", key: "priority", type: "string" },
            {
                label: "Activation", key: "activation", options: [
                    { label: "One-Time", value: "oneTime" },
                    { label: "Periodically", value: "periodically" },
                    { label: "Succeeding", value: "succeeding" },
                ]
            }, {
                label: "Next Activation Time", key: "nextActivation", type: "string"
            },
            {
                label: "Activation Params", key: "activationParams", type: "string", tip:
                    `[Examples]

(Periodically)
"24:00:00" or "1d" for a day
"00:01:00" or "1m" for one minute

(Succeeding)
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
uuid for identifying preceding task`
            },
        ],
    },
    {
        group: "default",
        type: "clickElement",
        label: "Click",
        desc: "Click a specified element.",
        inputs: [
            {
                label: "Element Selector", key: "method", options: [
                    { value: "tag", label: "by Tag Name" },
                    { value: "class", label: "by Class Name" },
                    { value: "name", label: "by Name" },
                    { value: "id", label: "by ID" },
                    { value: "selector", label: "by CSS Selector" },
                    { value: "xpath", label: "by XPath" },
                    { value: "content", label: "by Content" }
                ]
            },
            { label: "Query", key: "query", type: "string" },
            { label: "Priority", key: "priority", type: "string" },
            {
                label: "Activation", key: "activation", options: [
                    { label: "One-Time", value: "oneTime" },
                    { label: "Periodically", value: "periodically" },
                    { label: "Succeeding", value: "succeeding" },
                ]
            }, {
                label: "Next Activation Time", key: "nextActivation", type: "string"
            },
            {
                label: "Activation Params", key: "activationParams", type: "string", tip:
                    `[Examples]

(Periodically)
"24:00:00" or "1d" for a day
"00:01:00" or "1m" for one minute

(Succeeding)
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
uuid for identifying preceding task`
            },
        ]
    },
    {
        group: "default",
        type: "fillElement",
        label: "Fill",
        desc: "Fill in a specified element.",
        inputs: [
            {
                label: "Element Selector", key: "method", options: [
                    { value: "tag", label: "by Tag Name" },
                    { value: "class", label: "by Class Name" },
                    { value: "name", label: "by Name" },
                    { value: "id", label: "by ID" },
                    { value: "selector", label: "by CSS Selector" },
                    { value: "xpath", label: "by XPath" },
                    { value: "content", label: "by Content" }
                ]
            },
            { label: "Query", key: "query", type: "string" },
            { label: "Text", key: "text", type: "string" },
            { label: "Priority", key: "priority", type: "string" },
            {
                label: "Activation", key: "activation", options: [
                    { label: "One-Time", value: "oneTime" },
                    { label: "Periodically", value: "periodically" },
                    { label: "Succeeding", value: "succeeding" },
                ]
            }, {
                label: "Next Activation Time", key: "nextActivation", type: "string"
            },
            {
                label: "Activation Params", key: "activationParams", type: "string", tip:
                    `[Examples]

(Periodically)
"24:00:00" or "1d" for a day
"00:01:00" or "1m" for one minute

(Succeeding)
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
uuid for identifying preceding task`
            },
        ]
    },
];
