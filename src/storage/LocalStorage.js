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
const StorageMechanism = require('../StorageMechanism').StorageMechanism;


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
    StorageMechanism.call(this, debug);
    debug = this.debug;
    const bali = this.bali;

    // validate the arguments
    root = root || os.homedir() + '/.bali/';
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/storage/LocalStorage', '$LocalStorage', '$root', root, [
            '/javascript/Undefined',
            '/javascript/String'
        ]);
    }

    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/storage/LocalStorage',
            $root: root
        });
        return catalog.toString();
    };

    this.citeDocument = async function(document) {
        return await notary.citeDocument(document);
    };

    this.nameExists = async function(name) {
        const location = generateLocation('names');
        const identifier = generateNameIdentifier(name);
        return await componentExists(location, identifier);
    };

    this.readName = async function(name) {
        // attempt to read the citation associated with the name
        const location = generateLocation('names');
        const identifier = generateNameIdentifier(name);
        const bytes = await readComponent(location, identifier);
        if (bytes) {
            const source = bytes.toString('utf8');
            const citation = bali.component(source);
            return citation;
        }
    };

    this.writeName = async function(name, citation) {
        const location = generateLocation('names');
        const identifier = generateNameIdentifier(name);
        if (await componentExists(location, identifier)) {
            const exception = bali.exception({
                $module: '/bali/storage/LocalStorage',
                $procedure: '$writeName',
                $exception: '$nameExists',
                $name: name,
                $location: location,
                $identifier: identifier,
                $citation: citation,
                $text: 'The named citation already exists.'
            });
            throw exception;
        }
        await writeComponent(location, identifier, citation);
        return citation;
    };

    this.draftExists = async function(citation) {
        const location = generateLocation('drafts');
        const identifier = generateDocumentIdentifier(citation);
        return await componentExists(location, identifier);
    };

    this.readDraft = async function(citation) {
        const location = generateLocation('drafts');
        const identifier = generateDocumentIdentifier(citation);
        const bytes = await readComponent(location, identifier);
        if (bytes) {
            const source = bytes.toString('utf8');
            const draft = bali.component(source);
            return draft;
        }
    };

    this.writeDraft = async function(draft) {
        var location = generateLocation('documents');
        const citation = await notary.citeDocument(draft);
        const identifier = generateDocumentIdentifier(citation);
        if (await componentExists(location, identifier)) {
            const exception = bali.exception({
                $module: '/bali/storage/LocalStorage',
                $procedure: '$writeDraft',
                $exception: '$documentExists',
                $location: location,
                $identifier: identifier,
                $draft: draft,
                $text: 'A committed document with the same tag and version already exists.'
            });
            throw exception;
        }
        location = generateLocation('drafts');
        await writeComponent(location, identifier, draft, true);
        return citation;
    };

    this.deleteDraft = async function(citation) {
        const location = generateLocation('drafts');
        const identifier = generateDocumentIdentifier(citation);
        const bytes = await readComponent(location, identifier);
        if (bytes) {
            const source = bytes.toString('utf8');
            const draft = bali.component(source);
            await deleteComponent(location, identifier);
            return draft;
        }
    };

    this.documentExists = async function(citation) {
        const location = generateLocation('documents');
        const identifier = generateDocumentIdentifier(citation);
        return await componentExists(location, identifier);
    };

    this.readDocument = async function(citation) {
        const location = generateLocation('documents');
        const identifier = generateDocumentIdentifier(citation);
        const bytes = await readComponent(location, identifier);
        if (bytes) {
            const source = bytes.toString('utf8');
            const document = bali.component(source);
            return document;
        }
    };

    this.writeDocument = async function(document) {
        const citation = await notary.citeDocument(document);
        var location = generateLocation('documents');
        const identifier = generateDocumentIdentifier(citation);
        if (await componentExists(location, identifier)) {
            const exception = bali.exception({
                $module: '/bali/storage/LocalStorage',
                $procedure: '$writeDocument',
                $exception: '$documentExists',
                $location: location,
                $identifier: identifier,
                $document: document,
                $text: 'The document already exists.'
            });
            throw exception;
        }
        await writeComponent(location, identifier, document);
        // delete any existing draft of this document
        location = generateLocation('drafts');
        await deleteComponent(location, identifier);
        return citation;
    };

    this.messageAvailable = async function(bag) {
        const location = generateLocation('messages');
        const identifier = generateBagIdentifier(bag, 'available');
        const list = await listComponents(location, identifier);
        return list.length > 0;
    };

    this.messageCount = async function(bag) {
        const location = generateLocation('messages');
        const identifier = generateBagIdentifier(bag, 'available');
        const list = await listComponents(location, identifier);
        return list.length;
    };

    this.addMessage = async function(bag, message) {
        const location = generateLocation('messages');
        const tag = extractTag(message);
        const available = generateMessageIdentifier(bag, 'available', tag);
        const processing = generateMessageIdentifier(bag, 'processing', tag);
        if (await componentExists(location, available) || await componentExists(location, processing)) {
            return false;
        }
        await writeComponent(location, available, message, true);
        return true;
    };

    this.borrowMessage = async function(bag) {
        const location = generateLocation('messages');
        const available = generateBagIdentifier(bag, 'available');
        const processing = generateBagIdentifier(bag, 'processing');
        while (true) {
            const list = await listComponents(location, available);
            const count = list.length;
            if (count === 0) break;  // no more messages
            const messages = bali.list(list);
            // select a message at random since a distributed bag cannot guarantee FIFO
            const generator = bali.generator();
            const index = generator.generateIndex(count);
            const identifier = messages.getItem(index).getValue();
            const availableMessage = available + '/' + identifier;
            const processingMessage = processing + '/' + identifier;
            const bytes = await readComponent(location, availableMessage);
            if (!bytes) {
                // someone else got there first, keep trying
                continue;
            }
            if (! await deleteComponent(location, availableMessage)) {
                // someone else got there first, keep trying
                continue;
            }
            // we got there first
            await writeComponent(location, processingMessage, bytes, true);
            const source = bytes.toString('utf8');
            const message = bali.component(source);
            return message;
        }
    };

    this.returnMessage = async function(bag, message) {
        const location = generateLocation('messages');
        const tag = extractTag(message);
        const availableIdentifier = generateMessageIdentifier(bag, 'available', tag);
        const processingIdentifier = generateMessageIdentifier(bag, 'processing', tag);
        if (! await deleteComponent(location, processingIdentifier)) return false;
        await writeComponent(location, availableIdentifier, message, true);
        return true;
    };

    this.deleteMessage = async function(bag, tag) {
        const location = generateLocation('messages');
        const processingIdentifier = generateMessageIdentifier(bag, 'processing', tag);
        const bytes = await readComponent(location, processingIdentifier);
        if (bytes) {
            const source = bytes.toString('utf8');
            const message = bali.component(source);
            await deleteComponent(location, processingIdentifier);
            return message;
        }
    };

    const extractTag = function(message) {
        const content = message.getValue('$content');
        const tag = content.getParameter('$tag');
        return tag;
    };

    const generateLocation = function(type) {
        return root + type;
    };

    const generateNameIdentifier = function(name) {
        var identifier = name.toString().slice(1);  // remove the leading '/'
        identifier += '.bali';
        return identifier;
    };

    const generateDocumentIdentifier = function(citation) {
        var identifier = citation.getValue('$tag').toString().slice(1);  // remove the leading '#'
        identifier += '/' + citation.getValue('$version');
        identifier += '.bali';
        return identifier;
    };

    const generateBagIdentifier = function(bag, state) {
        var identifier = bag.getValue('$tag').toString().slice(1);  // remove the leading '#'
        identifier += '/' + bag.getValue('$version');
        identifier += '/' + state;
        return identifier;
    };

    const generateMessageIdentifier = function(bag, state, tag) {
        var identifier = bag.getValue('$tag').toString().slice(1);  // remove the leading '#'
        identifier += '/' + bag.getValue('$version');
        identifier += '/' + state;
        identifier += '/' + tag.toString().slice(1);  // remove the leading '#'
        identifier += '.bali';
        return identifier;
    };

    return this;
};
LocalStorage.prototype = Object.create(StorageMechanism.prototype);
LocalStorage.prototype.constructor = LocalStorage;
exports.LocalStorage = LocalStorage;


/**
 * This function causes the current thread to sleep for the specified number of milliseconds.
 * NOTE: it must be called using 'await' or it won't work.
 *
 * @param {Number} milliseconds The number of milliseconds to sleep.
 * @returns {Promise} A promise to return after the specified time has gone by.
 */
const sleep = function(milliseconds) {
    return new Promise(function(resolve) {
        setTimeout(resolve, milliseconds);
    });
};


// FILESYSTEM WRAPPER

const listComponents = async function(location, identifier) {
    try {
        const path = location + '/' + identifier;
        const files = await pfs.readdir(path, 'utf8');
        return files;
    } catch (exception) {
        if (exception.code === 'ENOENT') return []; // the directory does not exist
        // something else went wrong
        throw exception;
    }
};

const componentExists = async function(location, identifier) {
    try {
        const file = location + '/' + identifier;
        await pfs.stat(file);  // attempt to access the file
        return true; // no exception, the file exists
    } catch (exception) {
        if (exception.code === 'ENOENT') return false; // the file does not exist
        // something else went wrong
        throw exception;
    }
};

const readComponent = async function(location, identifier) {
    try {
        const file = location + '/' + identifier;
        const buffer = await pfs.readFile(file, 'utf8');
        return buffer;
    } catch (exception) {
        if (exception.code === 'ENOENT') return; // the file does not exist
        throw exception;
    }
};

const writeComponent = async function(location, identifier, component, isMutable) {
    const mode = isMutable ? 0o600 : 0o400;
    const file = location + '/' + identifier;
    const path = file.slice(0, file.lastIndexOf('/'));
    await pfs.mkdir(path, {recursive: true, mode: 0o700});
    const source = component.toString() + EOL;  // add POSIX compliant <EOL>
    await pfs.writeFile(file, source, {encoding: 'utf8', mode: mode});
};

const deleteComponent = async function(location, identifier) {
    try {
        const file = location + '/' + identifier;
        await pfs.unlink(file);  // delete the file
        const path = file.slice(0, file.lastIndexOf('/'));
        try { await pfs.rmdir(path); } catch (exception) {}  // ignore if directory is not empty
        return true;
    } catch (exception) {
        if (exception.code === 'ENOENT') return false; // the file did not exist
        // something else went wrong
        throw exception;
    }
};
