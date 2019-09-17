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
 * This class implements a local filesystem based document repository.  It treats
 * documents as UTF-8 encoded strings.  It can be used for local testing of the
 * Bali Nebula™.  If a test directory is specified, it will be created and used as
 * the repository.  Otherwise, a repository directory will be created and used
 * within a '.bali/' directory in the home directory for the running process.
 */
const os = require('os');
const pfs = require('fs').promises;
const bali = require('bali-component-framework').api();


// PRIVATE CONSTANTS

// the POSIX end of line character
const EOL = '\n';

const READONLY = 0o400;
const UPDATEABLE = 0o600;

// PUBLIC FUNCTIONS

/**
 * This function creates a new instance of a local document repository.  If the
 * repository does not yet exist it is created.
 * 
 * @param {String} directory An optional directory to be used for local configuration storage. If
 * no directory is specified, a directory called '.bali/' is created in the home directory.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new local document repository.
 */
const LocalRepository = function(directory, debug) {
    // validate the arguments
    if (debug === null || debug === undefined) debug = 0;  // default is off
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/repositories/LocalRepository', '$LocalRepository', '$directory', directory, [
            '/javascript/Undefined',
            '/javascript/String'
        ]);
    }

    // setup the private attributes
    directory = directory || os.homedir() + '/.bali/';
    const citations = directory + 'citations/';
    const drafts = directory + 'drafts/';
    const documents = directory + 'documents/';
    const types = directory + 'types/';
    const queues = directory + 'queues/';

    /**
     * This function returns a string providing attributes about this repository.
     * 
     * @returns {String} A string providing attributes about this repository.
     */
    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/repositories/LocalRepository',
            $url: this.getURL()
        });
        return catalog.toString();
    };

    /**
     * This function returns a reference to this document repository.
     * 
     * @returns {Reference} A reference to this document repository.
     */
    this.getURL = function() {
        return bali.reference('file:' + directory);
    };

    /**
     * This function checks to see whether or not a document citation is associated
     * with the specified name.
     * 
     * @param {Name} name The unique name for the document citation being checked.
     * @returns {Boolean} Whether or not the document citation exists.
     */
    this.citationExists = async function(name) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/LocalRepository', '$citationExists', '$name', name, [
                    '/javascript/String'
                ]);
            }

            // create the directory if necessary
            await createDirectory(citations, debug);

            // check for existence
            const filename = citations + name.toString().replace(/\//g, '_') + '.bali';  // replace '/'s with '_'s
            const exists = await pathExists(filename, debug);

            return exists;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$citationExists',
                $exception: '$unexpected',
                $name: name,
                $text: bali.text('An unexpected error occurred while attempting to verify the existence of a citation.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function attempts to retrieve a document citation from the repository for
     * the specified name.
     * 
     * @param {Name} name The unique name for the document citation being fetched.
     * @returns {Catalog} A catalog containing the document citation or <code>undefined</code>
     * if it doesn't exist.
     */
    this.fetchCitation = async function(name) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/LocalRepository', '$fetchCitation', '$name', name, [
                    '/javascript/String'
                ]);
            }

            // fetch the citation
            const filename = citations + name.toString().replace(/\//g, '_') + '.bali';  // replace '/'s with '_'s
            const citation = await readComponent(filename, debug);

            return citation;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$fetchCitation',
                $exception: '$unexpected',
                $name: name,
                $text: bali.text('An unexpected error occurred while attempting to fetch a citation.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function associates a new name with the specified document citation in
     * the repository.
     * 
     * @param {Name} name The unique name for the specified document citation.
     * @param {Catalog} citation A catalog containing the document citation.
     */
    this.createCitation = async function(name, citation) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/LocalRepository', '$createCitation', '$name', name, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/LocalRepository', '$createCitation', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }

            // create the directory if necessary
            await createDirectory(citations, debug);

            // make sure the citation doesn't already exist
            const filename = citations + name.toString().replace(/\//g, '_') + '.bali';  // replace '/'s with '_'s
            if (await pathExists(filename, debug)) {
                const exception = bali.exception({
                    $module: '/bali/repositories/LocalRepository',
                    $procedure: '$createCitation',
                    $exception: '$citationExists',
                    $url: bali.reference('file:' + directory),
                    $file: filename,
                    $text: bali.text('The citation to be created already exists.')
                });
                if (debug) console.error(exception.toString());
                throw exception;
            }

            // create the new citation
            await writeComponent(filename, citation, READONLY, debug);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$createCitation',
                $exception: '$unexpected',
                $name: name,
                $citation: citation,
                $text: bali.text('An unexpected error occurred while attempting to create a citation.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function checks to see whether or not a draft document is associated with the
     * specified identifier.
     * 
     * @param {String} draftId The unique identifier (including version number) for
     * the draft document being checked.
     * @returns {Boolean} Whether or not the draft document exists.
     */
    this.draftExists = async function(draftId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/LocalRepository', '$draftExists', '$draftId', draftId, [
                    '/javascript/String'
                ]);
            }

            // check for existence
            const filename = drafts + draftId + '.bali';
            const exists = await pathExists(filename, debug);

            return exists;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$draftExists',
                $exception: '$unexpected',
                $draftId: draftId,
                $text: bali.text('An unexpected error occurred while attempting to verify the existence of a draft.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function attempts to retrieve the specified draft document from the repository.
     * 
     * @param {String} draftId The unique identifier (including version number) for
     * the draft document being fetched.
     * @returns {Catalog} A catalog containing the draft or <code>undefined</code>
     * if it doesn't exist.
     */
    this.fetchDraft = async function(draftId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/LocalRepository', '$fetchDraft', '$draftId', draftId, [
                    '/javascript/String'
                ]);
            }

            // fetch the draft document
            const filename = drafts + draftId + '.bali';
            const draft = await readComponent(filename, debug);

            return draft;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$fetchDraft',
                $exception: '$unexpected',
                $draftId: draftId,
                $text: bali.text('An unexpected error occurred while attempting to fetch a draft.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function saves a draft document in the repository.
     * 
     * @param {String} draftId The unique identifier (including version number) for
     * the draft document being saved.
     * @param {Catalog} draft A catalog containing the draft document.
     */
    this.saveDraft = async function(draftId, draft) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/LocalRepository', '$saveDraft', '$draftId', draftId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/LocalRepository', '$saveDraft', '$draft', draft, [
                    '/bali/collections/Catalog'
                ]);
            }

            // create the directory if necessary
            await createDirectory(drafts, debug);

            // save the draft document
            const filename = drafts + draftId + '.bali';
            await writeComponent(filename, draft, UPDATEABLE, debug);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$saveDraft',
                $exception: '$unexpected',
                $draftId: draftId,
                $draft: draft,
                $text: bali.text('An unexpected error occurred while attempting to save a draft.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function attempts to delete the specified draft document from the repository.
     * 
     * @param {String} draftId The unique identifier (including version number) for
     * the draft document being deleted.
     */
    this.deleteDraft = async function(draftId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/LocalRepository', '$deleteDraft', '$draftId', draftId, [
                    '/javascript/String'
                ]);
            }

            // delete the draft document
            const filename = drafts + draftId + '.bali';
            await deletePath(filename, debug);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$deleteDraft',
                $exception: '$unexpected',
                $draftId: draftId,
                $text: bali.text('An unexpected error occurred while attempting to delete a draft.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function checks to see whether or not a document is associated with the
     * specified identifier.
     * 
     * @param {String} documentId The unique identifier (including version number) for
     * the document being checked.
     * @returns {Boolean} Whether or not the document exists.
     */
    this.documentExists = async function(documentId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/LocalRepository', '$documentExists', '$documentId', documentId, [
                    '/javascript/String'
                ]);
            }

            // check the existence
            const filename = documents + documentId + '.bali';
            const exists = await pathExists(filename, debug);

            return exists;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$documentExists',
                $exception: '$unexpected',
                $documentId: documentId,
                $text: bali.text('An unexpected error occurred while attempting to verify the existence of a document.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function attempts to retrieve the specified document from the repository.
     * 
     * @param {String} documentId The unique identifier (including version number) for
     * the document being fetched.
     * @returns {Catalog} A catalog containing the document or <code>undefined</code>
     * if it doesn't exist.
     */
    this.fetchDocument = async function(documentId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/LocalRepository', '$fetchDocument', '$documentId', documentId, [
                    '/javascript/String'
                ]);
            }

            // fetch the document
            const filename = documents + documentId + '.bali';
            const document = await readComponent(filename, debug);

            return document;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$fetchDocument',
                $exception: '$unexpected',
                $documentId: documentId,
                $text: bali.text('An unexpected error occurred while attempting to fetch a document.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function creates a new document in the repository.
     * 
     * @param {String} documentId The unique identifier (including version number) for
     * the document being created.
     * @param {Catalog} document A catalog containing the document.
     */
    this.createDocument = async function(documentId, document) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/LocalRepository', '$createDocument', '$documentId', documentId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/LocalRepository', '$createDocument', '$document', document, [
                    '/bali/collections/Catalog'
                ]);
            }

            // create the directory if necessary
            await createDirectory(documents, debug);

            // make sure the document doesn't already exist
            const filename = documents + documentId + '.bali';
            if (await pathExists(filename, debug)) {
                const exception = bali.exception({
                    $module: '/bali/repositories/LocalRepository',
                    $procedure: '$createDocument',
                    $exception: '$fileExists',
                    $url: bali.reference('file:' + directory),
                    $file: filename,
                    $text: bali.text('The document to be created already exists.')
                });
                if (debug) console.error(exception.toString());
                throw exception;
            }

            // create the new document
            await writeComponent(filename, document, READONLY, debug);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$createDocument',
                $exception: '$unexpected',
                $documentId: documentId,
                $document: document,
                $text: bali.text('An unexpected error occurred while attempting to create a document.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function checks to see whether or not a type is associated with the
     * specified identifier.
     * 
     * @param {String} typeId The unique identifier (including version number) for
     * the type being checked.
     * @returns {Boolean} Whether or not the type exists.
     */
    this.typeExists = async function(typeId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/LocalRepository', '$typeExists', '$typeId', typeId, [
                    '/javascript/String'
                ]);
            }

            // check the existence
            const filename = types + typeId + '.bali';
            const exists = await pathExists(filename, debug);

            return exists;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$typeExists',
                $exception: '$unexpected',
                $typeId: typeId,
                $text: bali.text('An unexpected error occurred while attempting to verify the existence of a type.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function attempts to retrieve the specified type from the repository.
     * 
     * @param {String} typeId The unique identifier (including version number) for
     * the type being fetched.
     * @returns {Catalog} A catalog containing the type or <code>undefined</code>
     * if it doesn't exist.
     */
    this.fetchType = async function(typeId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/LocalRepository', '$fetchType', '$typeId', typeId, [
                    '/javascript/String'
                ]);
            }

            // fetch the type
            const filename = types + typeId + '.bali';
            const type = await readComponent(filename, debug);

            return type;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$fetchType',
                $exception: '$unexpected',
                $typeId: typeId,
                $text: bali.text('An unexpected error occurred while attempting to fetch a type.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function creates a new type in the repository.
     * 
     * @param {String} typeId The unique identifier (including version number) for
     * the type being created.
     * @param {Catalog} type A catalog containing the type.
     */
    this.createType = async function(typeId, type) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/LocalRepository', '$createType', '$typeId', typeId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/LocalRepository', '$createType', '$type', type, [
                    '/bali/collections/Catalog'
                ]);
            }

            // create the directory if necessary
            await createDirectory(types, debug);

            // make sure the type doesn't already exist
            const filename = types + typeId + '.bali';
            if (await pathExists(filename, debug)) {
                const exception = bali.exception({
                    $module: '/bali/repositories/LocalRepository',
                    $procedure: '$createType',
                    $exception: '$fileExists',
                    $url: bali.reference('file:' + directory),
                    $file: filename,
                    $text: bali.text('The type to be created already exists.')
                });
                if (debug) console.error(exception.toString());
                throw exception;
            }

            // create the new type
            await writeComponent(filename, type, READONLY, debug);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$createType',
                $exception: '$unexpected',
                $typeId: typeId,
                $type: type,
                $text: bali.text('An unexpected error occurred while attempting to create a type.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function adds a new message onto the specified queue in the repository.
     * 
     * @param {String} queueId The unique identifier for the queue.
     * @param {Catalog} message A catalog containing the message.
     */
    this.queueMessage = async function(queueId, message) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/LocalRepository', '$queueMessage', '$queueId', queueId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/LocalRepository', '$queueMessage', '$message', message, [
                    '/bali/collections/Catalog'
                ]);
            }

            // create the directory if necessary
            const queue = queues + queueId + '/';
            await createDirectory(queue, debug);

            // place the new message on the queue
            const messageId = bali.tag().getValue();
            const filename = queue + messageId + '.bali';
            await writeComponent(filename, message, UPDATEABLE, debug);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$queueMessage',
                $exception: '$unexpected',
                $queueId: queueId,
                $message: message,
                $text: bali.text('An unexpected error occurred while attempting to queue a message.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function removes a message (at random) from the specified queue in the repository.
     * 
     * @param {String} queueId The unique identifier for the queue.
     * @returns {Catalog} A catalog containing the message or <code>undefined</code>
     * if it doesn't exist.
     */
    this.dequeueMessage = async function(queueId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/LocalRepository', '$dequeueMessage', '$queueId', queueId, [
                    '/javascript/String'
                ]);
            }

            // remove a message from the queue
            const queue = queues + queueId + '/';
            var message;
            while (await pathExists(queue, debug)) {
                const messages = await listDirectory(queue, debug);
                const count = messages.length;
                if (count) {
                    // select a message a random since a distributed queue cannot guarantee FIFO
                    const generator = bali.generator();
                    const index = generator.generateIndex(count) - 1;  // convert to zero based indexing
                    const messageFile = messages[index];
                    const filename = queue + messageFile;
                    message = await readComponent(filename, debug);
                    try {
                        await deletePath(filename, debug);
                        break; // we got there first
                    } catch (exception) {
                        // another process got there first
                        message = undefined;
                    }
                } else {
                    break;  // no more messages
                }
            }

            return message;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$dequeueMessage',
                $exception: '$unexpected',
                $queueId: queueId,
                $text: bali.text('An unexpected error occurred while attempting to dequeue a message.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    return this;
};
LocalRepository.prototype.constructor = LocalRepository;
exports.LocalRepository = LocalRepository;


// PRIVATE FUNCTIONS

/**
 * This function determines whether or not the specified directory path exists.
 * 
 * @param {String} path The directory path. 
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Boolean} Whether or not the directory path exists.
 */
const pathExists = async function(path, debug) {
    try {
        await pfs.stat(path);
        // the path exists
        return true;
    } catch (cause) {
        if (cause.code === 'ENOENT') {
            // the path does not exist
            return false;
        } else {
            // something else went wrong
            const exception = bali.exception({
                $module: '/bali/repositories/LocalRepository',
                $procedure: '$pathExists',
                $exception: '$unexpected',
                $path: path,
                $text: bali.text('An unexpected error occurred while attempting to check a path.')
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    }
};


/**
 * This function deletes the specified directory path if it exists.
 * 
 * @param {String} path The directory path. 
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 */
const deletePath = async function(path, debug) {
    try {
        if (await pathExists(path, debug)) await pfs.unlink(path);
    } catch (cause) {
        const exception = bali.exception({
            $module: '/bali/repositories/LocalRepository',
            $procedure: '$deletePath',
            $exception: '$unexpected',
            $path: path,
            $text: bali.text('An unexpected error occurred while attempting to delete a path.')
        }, cause);
        if (debug > 0) console.error(exception.toString());
        throw exception;
    }
};


/**
 * This function returns a list of the files contained in the specified directory.
 * 
 * @param {String} directory The directory to be listed.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Array} An array containing the filenames of the files in the directory.
 */
const listDirectory = async function(directory, debug) {
    try {
        const files = await pfs.readdir(directory, 'utf8');
        return files;
    } catch (cause) {
        const exception = bali.exception({
            $module: '/bali/repositories/LocalRepository',
            $procedure: '$listDirectory',
            $exception: '$unexpected',
            $directory: directory,
            $text: bali.text('An unexpected error occurred while attempting to list a directory.')
        }, cause);
        if (debug > 0) console.error(exception.toString());
        throw exception;
    }
};


/**
 * This function recursively creates the specified directory structure.
 * 
 * @param {String} directory The directory path to be created. 
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 */
const createDirectory = async function(directory, debug) {
    try {
        await pfs.mkdir(directory, {recursive: true, mode: 0o700}).catch(function() {});
    } catch (cause) {
        const exception = bali.exception({
            $module: '/bali/repositories/LocalRepository',
            $procedure: '$createDirectory',
            $exception: '$unexpected',
            $directory: directory,
            $text: bali.text('An unexpected error occurred while attempting to create a directory.')
        }, cause);
        if (debug > 0) console.error(exception.toString());
        throw exception;
    }
};


/**
 * This function returns the contents of the specified file as a component, or as
 * <code>undefined</code> if it does not exist.
 * 
 * @param {String} file The name of the file to be read.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Component} The component that was stored in the file.
 */
const readComponent = async function(file, debug) {
    try {
        var component;
        if (await pathExists(file, debug)) {
            const source = await pfs.readFile(file, 'utf8');
            component = bali.component(source, debug);
        }
        return component;
    } catch (cause) {
        const exception = bali.exception({
            $module: '/bali/repositories/LocalRepository',
            $procedure: '$readFile',
            $exception: '$unexpected',
            $file: file,
            $text: bali.text('An unexpected error occurred while attempting to read a file.')
        }, cause);
        if (debug > 0) console.error(exception.toString());
        throw exception;
    }
};


/**
 * This function stores the specified component in the specified file using Bali Document
 * Notation™.
 * 
 * @param {String} file The name of the file to be written to.
 * @param {Component} component The component to be stored in the file.
 * @param {Number} mode The access mode for the resulting file. 
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 */
const writeComponent = async function(file, component, mode, debug) {
    try {
        const source = component.toString() + EOL;  // add POSIX compliant <EOL>
        await pfs.writeFile(file, source, {encoding: 'utf8', mode: mode});
    } catch (cause) {
        const exception = bali.exception({
            $module: '/bali/repositories/LocalRepository',
            $procedure: '$writeFile',
            $exception: '$unexpected',
            $file: file,
            $source: source,
            $text: bali.text('An unexpected error occurred while attempting to write a file.')
        }, cause);
        if (debug > 0) console.error(exception.toString());
        throw exception;
    }
};
