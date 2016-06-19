'use strict';

const got = require('got');

const maxParallelRequests = 5;
const queque = [];

let currentRequests = 0;

const checkQueque = () => {
    while(currentRequests < maxParallelRequests) {
        const first = queque.shift();

        if (!first) { break; }

        first().then((data) => {
            currentRequests--;
            checkQueque();
            return data;
        }, (err) => {
            checkQueque();
            currentRequests--;
            throw err;
        });

        currentRequests++;
    }
};

const addToQueque = (fn) => {
    queque.push(fn);
    checkQueque();
};

module.exports = (url) => {
    return new Promise((res, rej) => {
        addToQueque(() =>
            got(url, {
                json: true
            }).then(res, rej)
        );
    });
};
