/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/
'use strict';

///////////////////////////////////////////////////////////////////////////////////////
// This module should be used for LOCAL TESTING ONLY.  It is NOT SECURE and provides //
// no guarantees on protecting access to the documents.  YOU HAVE BEEN WARNED!!!     //
///////////////////////////////////////////////////////////////////////////////////////


/*
 * This class implements a local filesystem based storage mechanism.  It treats
 * documents as UTF-8 encoded strings.  It can be used for local testing of the
 * Bali Nebula™.  If a root directory is specified, it will be created and used as
 * the repository.  Otherwise, a repository directory will be created and used
 * within a '.bali/' root directory in the home directory for the running process.
 */
const os = require('os');
const pfs = require('fs').promises;


// PRIVATE CONSTANTS

// the POSIX end of line character
const EOL = '\n';


// DOCUMENT REPOSITORY

/**
 * This function creates a new instance of a local storage mechanism.  If the
 * repository does not yet exist it is created.
 *
 * @param {DigitalNotary} notary The digital notary to be used to cite the documents.
 * @param {String} root An optional root directory to be used for local configuration storage. If
 * no directory is specified, a directory called '.bali/' is created in the home directory.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new local storage mechanism.
 */
const LocalStorage = function(notary, root, debug) {
    // validate the arguments
    root = root || os.homedir() + '/.bali/';
    if (debug === null || debug === undefined) debug = 0;  // default is off
    const bali = require('bali-component-framework').api(debug);
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/repositories/LocalStorage', '$LocalStorage', '$root', root, [
            '/javascript/Undefined',
            '/javascript/String'
        ]);
    }

    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/repositories/LocalStorage',
            $root: root
        });
        return catalog.toString();
    };

    this.nameExists = async function(name) {
        try {
            const path = generatePath(['names']);
            const file = generateFilename(path, name.toString());
            await pfs.stat(file);  // attempt to access the citation
            return true; // no exception, the citation exists
        } catch (cause) {
            if (cause.code === 'ENOENT') return false; // the citation does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$nameExists',
                $exception: '$unexpected',
                $name: name,
                $text: 'An unexpected error occurred while checking whether or not a citation exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readName = async function(name) {
        try {
            var path = generatePath(['names']);
            var file = generateFilename(path, name.toString());
            var source = await pfs.readFile(file, 'utf8');
            const citation = bali.component(source);
            if (citation) {
                const tag = citation.getValue('$tag');
                const version = citation.getValue('$version');
                path = generatePath(['documents', tag.toString().slice(1)]);
                file = generateFilename(path, version.toString());
                var source = await pfs.readFile(file, 'utf8');
                const document = bali.component(source);
                const matches = await notary.citationMatches(citation, document);
                if (!matches) throw Error('The cited document was modified after it was created.');
                return document;
            }
        } catch (cause) {
            if (cause.code === 'ENOENT') return undefined; // the document does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$readName',
                $exception: '$unexpected',
                $name: name,
                $text: 'An unexpected error occurred while attempting to read a document from the local storage.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeName = async function(name, citation) {
        try {
            if (! await this.documentExists(citation)) throw Error('The cited document does not exist.');
            var path = generatePath(['names']);
            const file = generateFilename(path, name.toString());
            path = file.slice(0, file.lastIndexOf('/'));
            await pfs.mkdir(path, {recursive: true, mode: 0o700});
            const source = citation.toString() + EOL;  // add POSIX compliant <EOL>
            await pfs.writeFile(file, source, {encoding: 'utf8', mode: 0o400});
            return citation;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$writeName',
                $exception: '$unexpected',
                $name: name,
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to write a citation to the local storage.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.draftExists = async function(citation) {
        try {
            const tag = citation.getValue('$tag');
            const version = citation.getValue('$version');
            const path = generatePath(['drafts', tag.toString().slice(1)]);
            const file = generateFilename(path, version.toString());
            await pfs.stat(file);  // attempt to access the draft
            return true; // no exception, the draft exists
        } catch (cause) {
            if (cause.code === 'ENOENT') return false; // the draft does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$draftExists',
                $exception: '$unexpected',
                $citation: citation,
                $text: 'An unexpected error occurred while checking whether or not a draft exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readDraft = async function(citation) {
        try {
            const tag = citation.getValue('$tag');
            const version = citation.getValue('$version');
            const path = generatePath(['drafts', tag.toString().slice(1)]);
            const file = generateFilename(path, version.toString());
            const source = await pfs.readFile(file, 'utf8');
            return bali.component(source);
        } catch (cause) {
            if (cause.code === 'ENOENT') return undefined; // the draft does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$readDraft',
                $exception: '$unexpected',
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to read a draft from the local storage.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeDraft = async function(draft) {
        try {
            const citation = await notary.citeDocument(draft);
            const tag = citation.getValue('$tag');
            const version = citation.getValue('$version');
            if (await this.documentExists(citation)) throw Error('A committed version of the draft document exists.');
            const path = generatePath(['drafts', tag.toString().slice(1)]);
            const file = generateFilename(path, version.toString());
            await pfs.mkdir(path, {recursive: true, mode: 0o700});
            const source = draft.toString() + EOL;  // add POSIX compliant <EOL>
            await pfs.writeFile(file, source, {encoding: 'utf8', mode: 0o600});
            return citation;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$writeDraft',
                $exception: '$unexpected',
                $draft: draft,
                $text: 'An unexpected error occurred while attempting to write a draft to the local storage.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.deleteDraft = async function(citation) {
        try {
            const tag = citation.getValue('$tag');
            const version = citation.getValue('$version');
            const path = generatePath(['drafts', tag.toString().slice(1)]);
            const file = generateFilename(path, version.toString());
            const source = await pfs.readFile(file, 'utf8');
            await pfs.unlink(file);  // delete the draft
            try {
                await pfs.rmdir(path);  // attempt to remove the tag directory if no more versions
            } catch (cause) {
                // ignore
            }
            return bali.component(source);  // the draft was deleted
        } catch (cause) {
            if (cause.code === 'ENOENT') return undefined; // the draft did not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$deleteDraft',
                $exception: '$unexpected',
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to delete a draft from the local storage.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.documentExists = async function(citation) {
        try {
            const tag = citation.getValue('$tag');
            const version = citation.getValue('$version');
            const path = generatePath(['documents', tag.toString().slice(1)]);
            const file = generateFilename(path, version.toString());
            await pfs.stat(file);  // attempt to access the document
            return true; // no exception, the document exists
        } catch (cause) {
            if (cause.code === 'ENOENT') return false; // the document does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$documentExists',
                $exception: '$unexpected',
                $citation: citation,
                $text: 'An unexpected error occurred while checking whether or not a document exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readDocument = async function(citation) {
        try {
            const tag = citation.getValue('$tag');
            const version = citation.getValue('$version');
            const path = generatePath(['documents', tag.toString().slice(1)]);
            const file = generateFilename(path, version.toString());
            const source = await pfs.readFile(file, 'utf8');
            return bali.component(source);
        } catch (cause) {
            if (cause.code === 'ENOENT') return undefined; // the document does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$readDocument',
                $exception: '$unexpected',
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to read a document from the local storage.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeDocument = async function(document) {
        try {
            const citation = await notary.citeDocument(document);
            const tag = citation.getValue('$tag');
            const version = citation.getValue('$version');
            const path = generatePath(['documents', tag.toString().slice(1)]);
            const file = generateFilename(path, version.toString());
            await pfs.mkdir(path, {recursive: true, mode: 0o700});
            const source = document.toString() + EOL;  // add POSIX compliant <EOL>
            await pfs.writeFile(file, source, {encoding: 'utf8', mode: 0o400});
            await this.deleteDraft(citation);
            return await notary.citeDocument(document);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$writeDocument',
                $exception: '$unexpected',
                $document: document,
                $text: 'An unexpected error occurred while attempting to write a document to the local storage.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.messageCount = async function(bag) {
        try {
            const tag = bag.getValue('$tag');
            const version = bag.getValue('$version');
            const path = generatePath(['messages', tag.toString().slice(1), version.toString()]);
            const files = await pfs.readdir(path, 'utf8');
            return files.length;
        } catch (cause) {
            if (cause.code === 'ENOENT') return 0; // the directory does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$messageCount',
                $exception: '$unexpected',
                $bag: bag,
                $text: 'An unexpected error occurred while attempting to check the number of messages that are in a bag.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.addMessage = async function(bag, message) {
        try {
            const tag = bag.getValue('$tag');
            const version = bag.getValue('$version');
            const identifier = message.getValue('$content').getParameter('$tag');
            const path = generatePath(['messages', tag.toString().slice(1), version.toString()]);
            await pfs.mkdir(path, {recursive: true, mode: 0o700});
            const file = generateFilename(path, identifier.toString().slice(1));
            const source = message.toString() + EOL;  // add POSIX compliant <EOL>
            await pfs.writeFile(file, source, {encoding: 'utf8', mode: 0o600});
            return await notary.citeDocument(message);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$addMessage',
                $exception: '$unexpected',
                $bag: bag,
                $message: message,
                $text: 'An unexpected error occurred while attempting to add a message to a bag.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.removeMessage = async function(bag) {
        try {
            const tag = bag.getValue('$tag');
            const version = bag.getValue('$version');
            var path = generatePath(['messages', tag.toString().slice(1), version.toString()]);
            const files = await pfs.readdir(path, 'utf8');
            if (files.length) {
                const messages = bali.list(files);
                const generator = bali.generator();
                const index = generator.generateIndex(messages.getSize());
                const file = path + '/' + messages.getItem(index).getValue();
                const source = await pfs.readFile(file, 'utf8');
                await pfs.unlink(file);  // delete the file
                if (files.length === 1) {
                    // the last message was removed
                    await pfs.rmdir(path);  // remove the version directory
                    path = file.slice(0, path.lastIndexOf('/'));  // slice off the trailing version
                    try {
                        await pfs.rmdir(path);  // attempt to remove the tag directory if no more versions
                    } catch (cause) {
                        // ignore
                    }
                }
                return bali.component(source);
            } else {
                // the bag is empty
                await pfs.rmdir(path);  // remove the version directory
                path = file.slice(0, file.lastIndexOf('/'));  // slice off the trailing version
                try {
                    await pfs.rmdir(path);  // attempt to remove the tag directory if no more versions
                } catch (cause) {
                    // ignore
                }
            }
        } catch (cause) {
            if (cause.code === 'ENOENT') return undefined; // the directory does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$removeMessage',
                $exception: '$unexpected',
                $bag: bag,
                $text: 'An unexpected error occurred while attempting to remove a message from a bag.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    const generatePath = function(directories) {
        const path = root + '/' + directories.join('/');
        return path;
    };

    const generateFilename = function(path, file) {
        var filename = path + '/' + file;
        filename += '.bali';
        return filename;
    };

    return this;
};
LocalStorage.prototype.constructor = LocalStorage;
exports.LocalStorage = LocalStorage;
