#! /usr/bin/env node
'use strict';

const fs = require('fs');
const got = require('got');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment');
const semver = require('semver');
const columnify = require('columnify')
const utils = require('./utils');

const argv = require('minimist')(process.argv.slice(2));

const registry = 'https://registry.npmjs.org/';
const packageCache = {};

const listLength = Number(argv.l, 10) || 20;

utils.readFile(path.join(process.cwd(), 'package.json'))
    .then((data) => {
        try {
            data = JSON.parse(data);
        } catch(e) {
            return console.error('Couldn\'t parse package.json');
        }

        return showDeps(data.dependencies)
            .then((packages) => {
                packages.sort((a, b) => b.date.getTime() - a.date.getTime());
                prettyPrint(packages);
            })
            .catch(err => console.error(err.stack));
    }, (err) => {
        console.error('File package.json not found!');
    })
    .catch((err) => console.error(err.stack));

function showDeps(deps, parentDeps) {
    parentDeps = parentDeps || [];

    let packages = [];
    let chain = Promise.resolve();

    utils.forEach(deps, (version, name) => {
        chain = chain
            .then(() => getAboutPackage(name))
            .then((data) => {
                if (!data) { return; }

                if (!data.versions) { return; }
                const versions = Object.keys(data.versions);
                const lastVersion = semver.maxSatisfying(versions, version);
                const pack = {
                    date: new Date(data.time[lastVersion]),
                    version: lastVersion,
                    name: name,
                    parentDeps
                };

                packages.push(pack);

                let deps = data.versions[lastVersion] && data.versions[lastVersion].dependencies;
                if (deps)  {
                    parentDeps = parentDeps.concat(name);
                    deps = utils.filterValues(deps, (version, name) => parentDeps.indexOf(name) == -1);
                    return showDeps(deps, parentDeps)
                        .then((packs) => packages = packages.concat(packs));
                }
            });
    });

    return chain.then(() => packages);
}

function prettyPrint(packages) {
    const slicedPackages = packages.slice(0, listLength);

    let table = slicedPackages.map(formatLog);
    if (slicedPackages.length < packages.length) {
        table.push({
            package: chalk.blue('...'),
            version: chalk.cyan('...'),
            updated: chalk.green('...')
        });
    }

    const c = columnify(table);

    console.log(c);
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

    let parents = '';
    if (pack.parentDeps.length) {
        parents = chalk.magenta(pack.parentDeps.join(' -> '));
    }

    return {
        package: chalk.blue(pack.name),
        version: chalk.cyan(pack.version),
        updated: released,
        from: parents
    };
}

function processVersions(versions) {
    const result = {};

    for (const ver in versions) {
        result[ver] = {
            dependencies: versions[ver].dependencies,
            devDependencies: versions[ver].devDependencies
        };
    }

    return result;
}

function getAboutPackage(name) {
    if (!packageCache[name]) {
        packageCache[name] = got(registry + name, {
            json: true
        }).then((data) => {
            return {
                time: data.body.time,
                versions: processVersions(data.body.versions)
            };
        }, (err) => {
            return null;
        });
    }

    console.log(name);

    return packageCache[name];
}
