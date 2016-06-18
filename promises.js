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
