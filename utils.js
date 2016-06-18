'use strict';

const fs = require('fs');

const callback = (res, rej) =>
    (err, data) => {
        if (err) {
            return rej(err);
        }
        res(data);
    };

exports.readFile = (path) =>
    new Promise((res, rej) => {
        return fs.readFile(path, 'utf8', callback(res, rej));
    });

exports.forEach = (obj, fn) => {
    for (const key in obj) {
        fn(obj[key], key);
    }
};

exports.map = (obj, fn) => {
    const res = [];

    for (const key in obj) {
        res.push(fn(obj[key], key));
    }

    return res;
};
