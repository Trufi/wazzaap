#! /usr/bin/env node
'use strict';

const fs = require('fs');
const got = require('got');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment');
const semver = require('semver');
const _ = require('lodash');
const columnify = require('columnify')
const utils = require('./utils');
const get = require('./get');

const argv = require('minimist')(process.argv.slice(2));

const registry = 'https://registry.npmjs.org/';
const packageCache = {};

const listLength = Number(argv.l, 10) || 20;
const includeDevDeps = argv.dev;

utils.readFile(path.join(process.cwd(), 'package.json'))
    .then((data) => {
        try {
            data = JSON.parse(data);
        } catch(e) {
            return console.error('Couldn\'t parse package.json');
        }

        const deps = Object.assign(
            {},
            data.dependencies,
            includeDevDeps ? data.devDependencies : {}
        );

        if (!Object.keys(deps).length) {
            console.log('Dependencies not found');
        }

        return showDeps(deps)
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

    const promises = utils.map(deps, (version, name) => {
        return getAboutPackage(name)
            .then((data) => {
                if (!data || !data.versions || !data.time) { return; }

                const versions = Object.keys(data.versions);
                const lastVersion = semver.maxSatisfying(versions, version);

                if (!data.time[lastVersion]) {
                    // TODO: add log
                    return;
                }

                const pack = {
                    date: new Date(data.time[lastVersion]),
                    version: lastVersion,
                    name: name,
                    parentDeps
                };

                packages.push(pack);

                if (!data.versions[lastVersion]) {
                    // TODO: add log
                    return;
                }

                let deps = Object.assign(
                    {},
                    data.versions[lastVersion].dependencies,
                    includeDevDeps ? data.versions[lastVersion].devDependencies : {}
                );

                if (Object.keys(deps).length)  {
                    const newParentDeps = parentDeps.concat(name);
                    deps = utils.filterValues(deps, (version, name) => newParentDeps.indexOf(name) == -1);
                    return showDeps(deps, newParentDeps)
                        .then((packs) => packages = packages.concat(packs));
                }
            });
    });

    return Promise.all(promises).then(() => packages);
}

function prettyPrint(packages) {
    packages.sort((a, b) => b.date.getTime() - a.date.getTime());
    packages = deduplicate(packages);
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
    if (pack.from) {
        parents = chalk.magenta(pack.from.map(e => e + '...').join(', '));
    } else if (pack.parentDeps.length) {
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
        packageCache[name] = get(registry + name).then((data) => {
            return {
                time: data.body.time,
                versions: processVersions(data.body.versions)
            };
        }, (err) => {
            return null;
        });
    }

    // console.log(name);

    return packageCache[name];
}

function deduplicate(packages) {
    const uniqs = {};

    packages.forEach(pack => {
        const uniq = uniqs[pack.name + pack.version];

        if (uniqs[pack.name + pack.version]) {
            pack.parentDeps[0] && uniq.from.push(pack.parentDeps[0]);
        } else {
            pack.from = pack.parentDeps[0] ? [pack.parentDeps[0]] : [];
            uniqs[pack.name + pack.version] = pack;
        }
    });

    const res = [];
    for (const key in uniqs) {
        const uniq = uniqs[key];
        if (uniq.from.length == 1) {
            uniq.from = null;
        } else {
            uniq.from = _.uniq(uniq.from);
        }
        res.push(uniqs[key]);
    }

    return res;
}
