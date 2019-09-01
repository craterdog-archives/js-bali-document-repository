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
 * This module defines a singleton that implements a local filesystem based document
 * repository. It treats documents as UTF-8 encoded strings. It can be used for local
 * testing of the Bali Nebula™. If a test directory is specified, it will be created
 * and used as the repository. Otherwise, a repository directory will be created and
 * used within a '.bali/' directory in the home directory for the running process.
 */
const pfs = require('fs').promises;
const os = require('os');
const bali = require('bali-component-framework');
const EOL = '\n';  // POSIX compliant end of line


/**
 * This function returns an object that implements the API for a local TEST document
 * repository. If the repository does not yet exist it is created.
 * 
 * @param {String} directory The location of the directory to be used for the repository.
 * will be logged to the error console.
 * @param {Boolean} debug An optional flag that determines whether or not exceptions
 * will be logged to the error console.
 * @returns {Object} An object implementing the document repository interface.
 */
exports.repository = function(directory, debug) {
    debug = debug || false;
    const repositoryDirectory = directory + 'repository/';
    const citations = repositoryDirectory + 'citations/';
    const drafts = repositoryDirectory + 'drafts/';
    const documents = repositoryDirectory + 'documents/';
    const types = repositoryDirectory + 'types/';
    const queues = repositoryDirectory + 'queues/';

    // return a singleton object for the API
    return {

        /**
         * This function returns a string providing attributes about this repository.
         * 
         * @returns {String} A string providing attributes about this repository.
         */
        toString: function() {
            const catalog = bali.catalog({
                $module: '/bali/repositories/LocalRepository',
                $url: this.getURL()
            });
            return catalog.toString();
        },

        /**
         * This function returns a reference to this document repository.
         * 
         * @returns {Reference} A reference to this document repository.
         */
        getURL: function() {
            return bali.reference('file:' + directory);
        },

        /**
         * This function initializes the document repository.  It will be called before any
         * other API function executes and can only be called once.
         */
        initializeAPI: async function() {
            try {
                await pfs.mkdir(directory, 0o700).catch(function() {});
                await pfs.mkdir(repositoryDirectory, 0o700).catch(function() {});
                await pfs.mkdir(citations, 0o700).catch(function() {});
                await pfs.mkdir(drafts, 0o700).catch(function() {});
                await pfs.mkdir(documents, 0o700).catch(function() {});
                await pfs.mkdir(types, 0o700).catch(function() {});
                await pfs.mkdir(queues, 0o700).catch(function() {});
                this.initializeAPI = undefined;  // can only be called once
            } catch (cause) {
                const exception = bali.exception({
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$initializeAPI',
                    $exception: '$unexpected',
                    $directory: directory,
                    $text: bali.text('An unexpected error occurred while attempting to initialize the local repository.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function checks to see whether or not a document citation is associated
         * with the specified name.
         * 
         * @param {String} name The unique name for the document citation being checked.
         * @returns {Boolean} Whether or not the document citation exists.
         */
        citationExists: async function(name) {
            try {
                if (this.initializeAPI) await this.initializeAPI();
                const filename = citations + name.replace(/\//g, '_') + '.bali';  // replace '/'s with '_'s
                const exists = await doesExist(filename);
                return exists;
            } catch (cause) {
                const exception = bali.exception({
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$citationExists',
                    $exception: '$unexpected',
                    $name: name,
                    $text: bali.text('An unexpected error occurred while attempting to verify the existence of a citation.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function attempts to retrieve a document citation from the repository for
         * the specified name.
         * 
         * @param {String} name The unique name for the document citation being fetched.
         * @returns {String} The canonical source string for the document citation, or
         * <code>undefined</code> if it doesn't exist.
         */
        fetchCitation: async function(name) {
            try {
                if (this.initializeAPI) await this.initializeAPI();
                var citation;
                const filename = citations + name.replace(/\//g, '_') + '.bali';  // replace '/'s with '_'s
                const exists = await doesExist(filename);
                if (exists) {
                    citation = await pfs.readFile(filename);
                    citation = citation.toString().slice(0, -1);  // remove POSIX compliant <EOL>
                }
                return citation;
            } catch (cause) {
                const exception = bali.exception({
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$fetchCitation',
                    $exception: '$unexpected',
                    $name: name,
                    $text: bali.text('An unexpected error occurred while attempting to fetch a citation.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function associates a new name with the specified document citation in
         * the repository.
         * 
         * @param {String} name The unique name for the specified document citation.
         * @param {String} citation The canonical source string for the document citation.
         */
        createCitation: async function(name, citation) {
            try {
                if (this.initializeAPI) await this.initializeAPI();
                const filename = citations + name.replace(/\//g, '_') + '.bali';  // replace '/'s with '_'s
                const exists = await doesExist(filename);
                if (exists) {
                    const exception = bali.exception({
                        $module: '/bali/repositories/LocalRepository',
                        $procedure: '$createCitation',
                        $exception: '$fileExists',
                        $url: bali.reference('file:' + directory),
                        $file: filename,
                        $text: bali.text('The file to be written already exists.')
                    });
                    if (debug) console.error(exception.toString());
                    throw exception;
                }
                const document = citation + EOL;  // add POSIX compliant <EOL>
                await pfs.writeFile(filename, document, {encoding: 'utf8', mode: 0o400});
            } catch (cause) {
                const exception = bali.exception({
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$createCitation',
                    $exception: '$unexpected',
                    $name: name,
                    $citation: citation,
                    $text: bali.text('An unexpected error occurred while attempting to create a citation.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function checks to see whether or not a draft document is associated with the
         * specified identifier.
         * 
         * @param {String} draftId The unique identifier (including version number) for
         * the draft document being checked.
         * @returns {Boolean} Whether or not the draft document exists.
         */
        draftExists: async function(draftId) {
            try {
                if (this.initializeAPI) await this.initializeAPI();
                const filename = drafts + draftId + '.bali';
                const exists = await doesExist(filename);
                return exists;
            } catch (cause) {
                const exception = bali.exception({
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$draftExists',
                    $exception: '$unexpected',
                    $draftId: draftId,
                    $text: bali.text('An unexpected error occurred while attempting to verify the existence of a draft.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function attempts to retrieve the specified draft document from the repository.
         * 
         * @param {String} draftId The unique identifier (including version number) for
         * the draft document being fetched.
         * @returns {String} The canonical source string for the draft document, or
         * <code>undefined</code> if it doesn't exist.
         */
        fetchDraft: async function(draftId) {
            try {
                if (this.initializeAPI) await this.initializeAPI();
                var draft;
                const filename = drafts + draftId + '.bali';
                const exists = await doesExist(filename);
                if (exists) {
                    draft = await pfs.readFile(filename);
                    draft = draft.toString().slice(0, -1);  // remove POSIX compliant <EOL>
                }
                return draft;
            } catch (cause) {
                const exception = bali.exception({
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$fetchDraft',
                    $exception: '$unexpected',
                    $draftId: draftId,
                    $text: bali.text('An unexpected error occurred while attempting to fetch a draft.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function saves a draft document in the repository.
         * 
         * @param {String} draftId The unique identifier (including version number) for
         * the draft document being saved.
         * @param {String} draft The canonical source string for the draft document.
         */
        saveDraft: async function(draftId, draft) {
            try {
                if (this.initializeAPI) await this.initializeAPI();
                const filename = drafts + draftId + '.bali';
                const document = draft + EOL;  // add POSIX compliant <EOL>
                await pfs.writeFile(filename, document, {encoding: 'utf8', mode: 0o600});
            } catch (cause) {
                const exception = bali.exception({
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$saveDraft',
                    $exception: '$unexpected',
                    $draftId: draftId,
                    $draft: draft,
                    $text: bali.text('An unexpected error occurred while attempting to save a draft.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function attempts to delete the specified draft document from the repository.
         * 
         * @param {String} draftId The unique identifier (including version number) for
         * the draft document being deleted.
         */
        deleteDraft: async function(draftId) {
            try {
                if (this.initializeAPI) await this.initializeAPI();
                const filename = drafts + draftId + '.bali';
                const exists = await doesExist(filename);
                if (exists) {
                    await pfs.unlink(filename);
                }
            } catch (cause) {
                const exception = bali.exception({
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$deleteDraft',
                    $exception: '$unexpected',
                    $draftId: draftId,
                    $text: bali.text('An unexpected error occurred while attempting to delete a draft.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function checks to see whether or not a document is associated with the
         * specified identifier.
         * 
         * @param {String} documentId The unique identifier (including version number) for
         * the document being checked.
         * @returns {Boolean} Whether or not the document exists.
         */
        documentExists: async function(documentId) {
            try {
                if (this.initializeAPI) await this.initializeAPI();
                const filename = documents + documentId + '.bali';
                const exists = await doesExist(filename);
                return exists;
            } catch (cause) {
                const exception = bali.exception({
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$documentExists',
                    $exception: '$unexpected',
                    $documentId: documentId,
                    $text: bali.text('An unexpected error occurred while attempting to verify the existence of a document.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function attempts to retrieve the specified document from the repository.
         * 
         * @param {String} documentId The unique identifier (including version number) for
         * the document being fetched.
         * @returns {String} The canonical source string for the document, or
         * <code>undefined</code> if it doesn't exist.
         */
        fetchDocument: async function(documentId) {
            try {
                if (this.initializeAPI) await this.initializeAPI();
                var document;
                const filename = documents + documentId + '.bali';
                const exists = await doesExist(filename);
                if (exists) {
                    document = await pfs.readFile(filename);
                    document = document.toString().slice(0, -1);  // remove POSIX compliant <EOL>
                }
                return document;
            } catch (cause) {
                const exception = bali.exception({
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$fetchDocument',
                    $exception: '$unexpected',
                    $documentId: documentId,
                    $text: bali.text('An unexpected error occurred while attempting to fetch a document.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function creates a new document in the repository.
         * 
         * @param {String} documentId The unique identifier (including version number) for
         * the document being created.
         * @param {String} document The canonical source string for the document.
         */
        createDocument: async function(documentId, document) {
            try {
                if (this.initializeAPI) await this.initializeAPI();
                const filename = documents + documentId + '.bali';
                const exists = await doesExist(filename);
                if (exists) {
                    const exception = bali.exception({
                        $module: '/bali/repositories/LocalRepository',
                        $procedure: '$createDocument',
                        $exception: '$fileExists',
                        $url: bali.reference('file:' + directory),
                        $file: filename,
                        $text: bali.text('The file to be written already exists.')
                    });
                    if (debug) console.error(exception.toString());
                    throw exception;
                }
                document = document + EOL;  // add POSIX compliant <EOL>
                await pfs.writeFile(filename, document, {encoding: 'utf8', mode: 0o400});
            } catch (cause) {
                const exception = bali.exception({
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$createDocument',
                    $exception: '$unexpected',
                    $documentId: documentId,
                    $document: document,
                    $text: bali.text('An unexpected error occurred while attempting to create a document.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function checks to see whether or not a type is associated with the
         * specified identifier.
         * 
         * @param {String} typeId The unique identifier (including version number) for
         * the type being checked.
         * @returns {Boolean} Whether or not the type exists.
         */
        typeExists: async function(typeId) {
            try {
                if (this.initializeAPI) await this.initializeAPI();
                const filename = types + typeId + '.bali';
                const exists = await doesExist(filename);
                return exists;
            } catch (cause) {
                const exception = bali.exception({
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$typeExists',
                    $exception: '$unexpected',
                    $typeId: typeId,
                    $text: bali.text('An unexpected error occurred while attempting to verify the existence of a type.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function attempts to retrieve the specified type from the repository.
         * 
         * @param {String} typeId The unique identifier (including version number) for
         * the type being fetched.
         * @returns {String} The canonical source string for the type, or
         * <code>undefined</code> if it doesn't exist.
         */
        fetchType: async function(typeId) {
            try {
                if (this.initializeAPI) await this.initializeAPI();
                var type;
                const filename = types + typeId + '.bali';
                const exists = await doesExist(filename);
                if (exists) {
                    type = await pfs.readFile(filename);
                    type = type.toString().slice(0, -1);  // remove POSIX compliant <EOL>
                }
                return type;
            } catch (cause) {
                const exception = bali.exception({
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$fetchType',
                    $exception: '$unexpected',
                    $typeId: typeId,
                    $text: bali.text('An unexpected error occurred while attempting to fetch a type.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function creates a new type in the repository.
         * 
         * @param {String} typeId The unique identifier (including version number) for
         * the type being created.
         * @param {String} type The canonical source string for the type.
         */
        createType: async function(typeId, type) {
            try {
                if (this.initializeAPI) await this.initializeAPI();
                const filename = types + typeId + '.bali';
                const exists = await doesExist(filename);
                if (exists) {
                    const exception = bali.exception({
                        $module: '/bali/repositories/LocalRepository',
                        $procedure: '$createType',
                        $exception: '$fileExists',
                        $url: bali.reference('file:' + directory),
                        $file: filename,
                        $text: bali.text('The file to be written already exists.')
                    });
                    if (debug) console.error(exception.toString());
                    throw exception;
                }
                type = type + EOL;  // add POSIX compliant <EOL>
                await pfs.writeFile(filename, type, {encoding: 'utf8', mode: 0o400});
            } catch (cause) {
                const exception = bali.exception({
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$createType',
                    $exception: '$unexpected',
                    $typeId: typeId,
                    $type: type,
                    $text: bali.text('An unexpected error occurred while attempting to create a type.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function adds a new message onto the specified queue in the repository.
         * 
         * @param {String} queueId The unique identifier for the queue.
         * @param {String} message The canonical source string for the message.
         */
        queueMessage: async function(queueId, message) {
            try {
                if (this.initializeAPI) await this.initializeAPI();
                const queue = queues + queueId + '/';
                const messageId = bali.tag().getValue();
                if (!await doesExist(queue)) await pfs.mkdir(queue, 0o700);
                const filename = queue + messageId + '.bali';
                const document = message + EOL;  // add POSIX compliant <EOL>
                await pfs.writeFile(filename, document, {encoding: 'utf8', mode: 0o600});
            } catch (cause) {
                const exception = bali.exception({
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$queueMessage',
                    $exception: '$unexpected',
                    $queueId: queueId,
                    $message: message,
                    $text: bali.text('An unexpected error occurred while attempting to queue a message.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function removes a message (at random) from the specified queue in the repository.
         * 
         * @param {String} queueId The unique identifier for the queue.
         * @returns {String} The canonical source string for the message.
         */
        dequeueMessage: async function(queueId) {
            try {
                if (this.initializeAPI) await this.initializeAPI();
                const queue = queues + queueId + '/';
                var message;
                while (await doesExist(queue)) {
                    const messages = await pfs.readdir(queue);
                    const count = messages.length;
                    if (count) {
                        // select a message a random since a distributed queue cannot guarantee FIFO
                        const index = bali.random.index(count) - 1;  // convert to zero based indexing
                        const messageFile = messages[index];
                        const filename = queue + messageFile;
                        message = await pfs.readFile(filename);
                        message = message.toString().slice(0, -1);  // remove POSIX compliant <EOL>
                        try {
                            await pfs.unlink(filename);
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
                    $module: '/bali/services/LocalRepository',
                    $procedure: '$dequeueMessage',
                    $exception: '$unexpected',
                    $queueId: queueId,
                    $text: bali.text('An unexpected error occurred while attempting to dequeue a message.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        }

    };
};


// PRIVATE FUNCTIONS

/**
 * This function determines whether or not the specified directory path exists.
 * 
 * @param {String} path The directory path. 
 * @param {Boolean} debug An optional flag that determines whether or not exceptions
 * will be logged to the error console.
 * @returns {Boolean} Whether or not the directory exists.
 */
const doesExist = async function(path, debug) {
    debug = debug || false;
    var exists = true;
    try {
        await pfs.stat(path);
    } catch (exception) {
        if (exception.code === 'ENOENT') {
            // the path does not exist
            exists = false;
        } else {
            // something else went wrong
            if (debug) console.error(exception.toString());
            throw exception;
        }
    }
    // the path exists
    return exists;
};
