#! /usr/bin/env node
'use strict';

const fs = require('fs');
const got = require('got');
const path = require('path');
const semver = require('semver');
const pr = require('./promises');

const registry = 'https://registry.npmjs.org/';

pr.readFile(path.join(process.cwd(), 'package.json'))
    .then((data) => {
        try {
            data = JSON.parse(data);
        } catch(e) {
            return console.error('Couldn\'t parse package.json');
        }

        return showDeps(data);
    }, (err) => {
        console.error('File package.json not found!');
    });

function showDeps(pack) {
    return getAbout(Object.keys(pack.dependencies)[0]);
}

function getAbout(name) {
    return got(registry + name, {
            json: true
        }).then(data => {
            console.log(data.body.time);
        });
}

function readPackageJson(pack) {
    const deps = pack.dependencies;
    const devDeps = pack.devDependencies;

    if (deps) {
        Object.keys()
    }
}
