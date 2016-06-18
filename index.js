#! /usr/bin/env node
'use strict';

const fs = require('fs');
const got = require('got');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment');
const semver = require('semver');
const utils = require('./utils');

const registry = 'https://registry.npmjs.org/';
const packageCache = {};

utils.readFile(path.join(process.cwd(), 'package.json'))
    .then((data) => {
        try {
            data = JSON.parse(data);
        } catch(e) {
            return console.error('Couldn\'t parse package.json');
        }

        return showMainDeps(data);
    }, (err) => {
        console.error('File package.json not found!');
    })
    .catch((err) => console.error(err.stack));

function showMainDeps(pack) {
    let packages = {};
    let chain = Promise.resolve();

    utils.forEach(pack.dependencies, (version, name) => {
        chain = chain
            .then(() => getAboutPackage(name))
            .then((data) => packages[name] = {name, version, data});
    });

    chain.then(() => {
        packages = utils.map(packages, (pack, name) => {
            const versions = Object.keys(pack.data.versions);
            const lastVersion = semver.maxSatisfying(versions, pack.version);
            return {
                date: new Date(pack.data.time[lastVersion]),
                version: lastVersion,
                name
            };
        }).sort((a, b) => a.date < b.date);

        packages.forEach(formatLog);
    })
    .catch(err => console.error(err.stack));

    return chain;
}

function formatLog(pack) {
    const diff = moment().diff(pack.date);
    const fromNow = moment(pack.date).fromNow();
    let released;

    // 12 hours ago
    if (diff < 1000 * 60 * 60 * 12) {
        released = chalk.red(fromNow);

    // 5 day ago
    } else if (diff < 1000 * 60 * 60 * 24 * 5) {
        released = chalk.yellow(fromNow);
    } else {
        released = chalk.green(fromNow);
    }

    const text =
        chalk.blue(pack.name) +
        ' ' + chalk.cyan(pack.version) +
        ' released ' + released;

    console.log(text);
}

function getAboutPackage(name) {
    if (!packageCache[name]) {
        packageCache[name] = got(registry + name, {
            json: true
        }).then((data) => data.body);
    }

    return packageCache[name];
}

function readPackageJson(pack) {
    const deps = pack.dependencies;
    const devDeps = pack.devDependencies;

    if (deps) {
        Object.keys()
    }
}
