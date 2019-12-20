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
const bali = require('bali-component-framework').api();


// PRIVATE CONSTANTS

// the POSIX end of line character
const EOL = '\n';


// DOCUMENT REPOSITORY

/**
 * This function creates a new instance of a local storage mechanism.  If the
 * repository does not yet exist it is created.
 * 
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
const LocalStorage = function(root, debug) {
    // validate the arguments
    root = root || os.homedir() + '/.bali/';
    if (debug === null || debug === undefined) debug = 0;  // default is off
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

    this.staticExists = async function(resource) {
        const file = generatePath('statics', resource);
        try {
            await pfs.stat(file);  // attempt to access the static resource
            return true; // no exception, the static resource exists
        } catch (cause) {
            if (cause.code === 'ENOENT') return false; // the static resource does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$staticExists',
                $exception: '$unexpected',
                $file: file,
                $text: 'An unexpected error occurred while checking whether or not a static resource exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readStatic = async function(resource) {
        const file = generatePath('statics', resource);
        try {
            return await pfs.readFile(file);  // returns a Buffer (may contain utf8 encoded string)
        } catch (cause) {
            if (cause.code === 'ENOENT') return undefined; // the static resource does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$readStatic',
                $exception: '$unexpected',
                $file: file,
                $text: 'An unexpected error occurred while attempting to read a static resource from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.citationExists = async function(name) {
        const file = generateFilename('citations', name);
        try {
            await pfs.stat(file);  // attempt to access the citation
            return true; // no exception, the citation exists
        } catch (cause) {
            if (cause.code === 'ENOENT') return false; // the citation does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$citationExists',
                $exception: '$unexpected',
                $file: file,
                $text: 'An unexpected error occurred while checking whether or not a citation exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readCitation = async function(name) {
        const file = generateFilename('citations', name);
        try {
            const source = await pfs.readFile(file, 'utf8');
            return bali.component(source);
        } catch (cause) {
            if (cause.code === 'ENOENT') return undefined; // the citation does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$readCitation',
                $exception: '$unexpected',
                $file: file,
                $text: 'An unexpected error occurred while attempting to read a citation from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeCitation = async function(name, citation) {
        const file = generateFilename('citations', name);
        try {
            const path = file.slice(0, file.lastIndexOf('/'));
            await pfs.mkdir(path, {recursive: true, mode: 0o700});
            const source = citation.toString() + EOL;  // add POSIX compliant <EOL>
            await pfs.writeFile(file, source, {encoding: 'utf8', mode: 0o400});
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$writeCitation',
                $exception: '$unexpected',
                $file: file,
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to write a citation to the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.documentExists = async function(type, tag, version) {
        const file = generateFilename(type, tag, version);
        try {
            await pfs.stat(file);  // attempt to access the document
            return true; // no exception, the document exists
        } catch (cause) {
            if (cause.code === 'ENOENT') return false; // the document does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$documentExists',
                $exception: '$unexpected',
                $file: file,
                $text: 'An unexpected error occurred while checking whether or not a document exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readDocument = async function(type, tag, version) {
        const file = generateFilename(type, tag, version);
        try {
            const source = await pfs.readFile(file, 'utf8');
            return bali.component(source);
        } catch (cause) {
            if (cause.code === 'ENOENT') return undefined; // the document does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$readDocument',
                $exception: '$unexpected',
                $file: file,
                $text: 'An unexpected error occurred while attempting to read a document from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeDocument = async function(type, tag, version, document) {
        const file = generateFilename(type, tag, version);
        try {
            const path = file.slice(0, file.lastIndexOf('/'));
            await pfs.mkdir(path, {recursive: true, mode: 0o700});
            const mode = (type === 'drafts') ? 0o600 : 0o400;
            const source = document.toString() + EOL;  // add POSIX compliant <EOL>
            await pfs.writeFile(file, source, {encoding: 'utf8', mode: mode});
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$writeDocument',
                $exception: '$unexpected',
                $file: file,
                $document: document,
                $text: 'An unexpected error occurred while attempting to write a document to the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.deleteDocument = async function(type, tag, version) {
        const file = generateFilename(type, tag, version);
        try {
            const source = await pfs.readFile(file, 'utf8');
            await pfs.unlink(file);  // delete the document
            return true;  // the document was deleted
        } catch (cause) {
            if (cause.code === 'ENOENT') return false; // the document does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$deleteDocument',
                $exception: '$unexpected',
                $file: file,
                $text: 'An unexpected error occurred while attempting to delete a document from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.addMessage = async function(queue, message) {
        const identifier = bali.tag().getValue();  // strip off the leading '#'
        const file = generateFilename('queues', queue, identifier);
        try {
            const path = file.slice(0, file.lastIndexOf('/'));
            await pfs.mkdir(path, {recursive: true, mode: 0o700});
            const source = message.toString() + EOL;  // add POSIX compliant <EOL>
            await pfs.writeFile(file, source, {encoding: 'utf8', mode: 0o600});
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$addMessage',
                $exception: '$unexpected',
                $file: file,
                $message: message,
                $text: 'An unexpected error occurred while attempting to add a message to a queue.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.removeMessage = async function(queue) {
        const path = generatePath('queues', queue);
        try {
            const files = await pfs.readdir(path, 'utf8');
            if (files.length) {
                const messages = bali.list(files);
                const generator = bali.generator();
                const index = generator.generateIndex(messages.getSize());
                const filename = path + '/' + messages.getItem(index).getValue();
                const source = await pfs.readFile(filename, 'utf8');
                await pfs.unlink(filename);  // delete the file
                return bali.component(source);
            } else {
                await pfs.rmdir(path);  // remove the empty directory
            }
        } catch (cause) {
            if (cause.code === 'ENOENT') return undefined; // the directory does not exist
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalStorage',
                $procedure: '$removeMessage',
                $exception: '$unexpected',
                $path: path,
                $text: 'An unexpected error occurred while attempting to remove a message from a queue.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    const generatePath = function(type, directory) {
        // the directory is either a name beginning with '/' or a tag beginning with '#'
        const path = root + type + '/' + directory.toString().slice(1);  // remove the leading '/' or '#'
        return path;
    };

    const generateFilename = function(type, directory, file) {
        // the directory is either a name beginning with '/' or a tag beginning with '#'
        var filename = generatePath(type, directory);
        if (file) filename += '/' + file;
        filename += '.bali';
        return filename;
    };

    return this;
};
LocalStorage.prototype.constructor = LocalStorage;
exports.LocalStorage = LocalStorage;
