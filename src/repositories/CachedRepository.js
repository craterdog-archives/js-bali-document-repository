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

/*
 * This class implements a document repository that acts as a cache in front of
 * a remote document repository.  Each document is validated prior to being stored
 * in the cache to ensure no modifications occurred during transit.
 */
const bali = require('bali-component-framework').api();


// PRIVATE CONSTANTS

// the POSIX end of line character
const EOL = '\n';

// the cache size
const CACHE_SIZE = 256;


// PUBLIC FUNCTIONS

/**
 * This function creates a new instance of a cached document repository.  A remote repository
 * is passed in and is used as the persistent store for all documents.
 * 
 * @param {Object} repository The actual repository that maintains documents.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new cached document repository.
 */
const CachedRepository = function(repository, debug) {
    // validate the arguments
    if (debug === null || debug === undefined) debug = 0;  // default is off
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/repositories/CachedRepository', '$CachedRepository', '$repository', repository, [
            '/javascript/Object'
        ]);
    }

    // setup the private attributes
    const citations = new Cache(CACHE_SIZE);
    const documents = new Cache(CACHE_SIZE);
    const types = new Cache(CACHE_SIZE);

    /**
     * This function returns a string providing attributes about this repository.
     * 
     * @returns {String} A string providing attributes about this repository.
     */
    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/repositories/CachedRepository',
            $url: this.getURL()
        });
        return catalog.toString();
    };

    /**
     * This function returns a reference to this document repository.
     * 
     * @returns {Reference} A reference to this document repository.
     */
    this.getURL = async function() {
        try {
            return await repository.getURL();
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
                $procedure: '$getURL',
                $exception: '$unexpected',
                $text: bali.text('An unexpected error occurred while attempting to retrieve the URL for the repository.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function checks to see whether or not a document citation is associated
     * with the specified name.
     * 
     * @param {String} name The unique name for the document citation being checked.
     * @returns {Boolean} Whether or not the document citation exists.
     */
    this.citationExists = async function(name) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/CachedRepository', '$citationExists', '$name', name, [
                    '/javascript/String'
                ]);
            }

            // check for existence
            if (citations.exists(name)) return true;
            return await repository.citationExists(name);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
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
     * @param {String} name The unique name for the document citation being fetched.
     * @returns {Catalog} A catalog containing the document citation or <code>undefined</code>
     * if it doesn't exist.
     */
    this.fetchCitation = async function(name) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/CachedRepository', '$fetchCitation', '$name', name, [
                    '/javascript/String'
                ]);
            }

            // fetch the citation
            var citation = citations.fetch(name);
            if (!citation) {
                citation = await repository.fetchCitation(name);
                citations.store(name, citation);
            }

            return citation;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
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
     * @param {String} name The unique name for the specified document citation.
     * @param {Catalog} citation A catalog containing the document citation.
     */
    this.createCitation = async function(name, citation) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/CachedRepository', '$createCitation', '$name', name, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/CachedRepository', '$createCitation', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }

            // make sure the citation doesn't already exist
            if (citations.exists(name) || await repository.citationExists(name)) {
                const exception = bali.exception({
                    $module: '/bali/repositories/CachedRepository',
                    $procedure: '$createCitation',
                    $exception: '$citationExists',
                    $name: name,
                    $text: bali.text('The citation to be created already exists.')
                });
                if (debug) console.error(exception.toString());
                throw exception;
            }

            // create the new citation
            await repository.createCitation(name, citation);
            citations.store(name, citation);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
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
                validator.validateType('/bali/repositories/CachedRepository', '$draftExists', '$draftId', draftId, [
                    '/javascript/String'
                ]);
            }

            // check for existence
            return await repository.draftExists(draftId);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
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
                validator.validateType('/bali/repositories/CachedRepository', '$fetchDraft', '$draftId', draftId, [
                    '/javascript/String'
                ]);
            }

            // fetch the draft document
            const draft = await repository.fetchDraft(draftId);

            return draft;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
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
                validator.validateType('/bali/repositories/CachedRepository', '$saveDraft', '$draftId', draftId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/CachedRepository', '$saveDraft', '$draft', draft, [
                    '/bali/collections/Catalog'
                ]);
            }

            // make sure the committed document doesn't already exist
            if (documents.exists(draftId) || await repository.documentExists(draftId)) {
                const exception = bali.exception({
                    $module: '/bali/repositories/CachedRepository',
                    $procedure: '$saveDraft',
                    $exception: '$documentExists',
                    $draftId: draftId,
                    $text: bali.text('A committed version of the draft to be saved already exists.')
                });
                if (debug) console.error(exception.toString());
                throw exception;
            }

            // save the draft document
            await repository.saveDraft(draftId, draft);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
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
                validator.validateType('/bali/repositories/CachedRepository', '$deleteDraft', '$draftId', draftId, [
                    '/javascript/String'
                ]);
            }

            // delete the draft document
            await repository.deleteDraft(draftId);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
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
                validator.validateType('/bali/repositories/CachedRepository', '$documentExists', '$documentId', documentId, [
                    '/javascript/String'
                ]);
            }

            // check for existence
            if (documents.exists(documentId)) return true;
            return await repository.documentExists(documentId);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
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
                validator.validateType('/bali/repositories/CachedRepository', '$fetchDocument', '$documentId', documentId, [
                    '/javascript/String'
                ]);
            }

            // fetch the document
            var document = documents.fetch(documentId);
            if (!document) {
                document = await repository.fetchDocument(documentId);
                documents.store(documentId, document);
            }

            return document;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
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
                validator.validateType('/bali/repositories/CachedRepository', '$createDocument', '$documentId', documentId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/CachedRepository', '$createDocument', '$document', document, [
                    '/bali/collections/Catalog'
                ]);
            }

            // make sure the document doesn't already exist
            if (documents.exists(documentId) || await repository.documentExists(documentId)) {
                const exception = bali.exception({
                    $module: '/bali/repositories/CachedRepository',
                    $procedure: '$createDocument',
                    $exception: '$documentExists',
                    $documentId: documentId,
                    $text: bali.text('The document to be created already exists.')
                });
                if (debug) console.error(exception.toString());
                throw exception;
            }

            // create the new document
            await repository.createDocument(documentId, document);
            documents.store(documentId, document);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
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
                validator.validateType('/bali/repositories/CachedRepository', '$typeExists', '$typeId', typeId, [
                    '/javascript/String'
                ]);
            }

            // check for existence
            if (types.exists(typeId)) return true;
            return await repository.typeExists(typeId);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
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
                validator.validateType('/bali/repositories/CachedRepository', '$fetchType', '$typeId', typeId, [
                    '/javascript/String'
                ]);
            }

            // fetch the type
            var type = types.fetch(typeId);
            if (!type) {
                type = await repository.fetchType(typeId);
                types.store(typeId, type);
            }

            return type;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
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
                validator.validateType('/bali/repositories/CachedRepository', '$createType', '$typeId', typeId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/CachedRepository', '$createType', '$type', type, [
                    '/bali/collections/Catalog'
                ]);
            }

            // make sure the type doesn't already exist
            if (types.exists(typeId) || await repository.typeExists(typeId)) {
                const exception = bali.exception({
                    $module: '/bali/repositories/CachedRepository',
                    $procedure: '$createType',
                    $exception: '$typeExists',
                    $typeId: typeId,
                    $text: bali.text('The type to be created already exists.')
                });
                if (debug) console.error(exception.toString());
                throw exception;
            }

            // create the new type
            await repository.createType(typeId, type);
            types.store(typeId, type);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
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
                validator.validateType('/bali/repositories/CachedRepository', '$queueMessage', '$queueId', queueId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/CachedRepository', '$queueMessage', '$message', message, [
                    '/bali/collections/Catalog'
                ]);
            }

            // place the new message on the queue
            await repository.queueMessage(queueId, message);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
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
                validator.validateType('/bali/repositories/CachedRepository', '$dequeueMessage', '$queueId', queueId, [
                    '/javascript/String'
                ]);
            }

            // remove a message from the queue
            const message = await repository.dequeueMessage(queueId);

            return message;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
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
CachedRepository.prototype.constructor = CachedRepository;
exports.CachedRepository = CachedRepository;


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
                $module: '/bali/repositories/CachedRepository',
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
            $module: '/bali/repositories/CachedRepository',
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
            $module: '/bali/repositories/CachedRepository',
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
            $module: '/bali/repositories/CachedRepository',
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
            $module: '/bali/repositories/CachedRepository',
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
            $module: '/bali/repositories/CachedRepository',
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


/*
 * This function creates a new document cache with the specified maximum capacity.  All
 * documents that are stored in the cache are assumed to be immutable so there are no
 * cache consistency issues.
 * 
 * @param {Number} capacity The maximum number of documents that can be cached before
 * the oldest document will be removed to make room for a new document.
 */
const Cache = function(capacity) {

    const documents = new Map();

    this.exists = function(documentId) {
        return documents.has(documentId);
    };

    this.fetch = function(documentId) {
        return documents.get(documentId);
    };

    this.store = function(documentId, document) {
        if (documents.size > capacity) {
            // delete the first (oldest) cached document
            const key = documents.keys().next().getValue();
            documents.delete(key);
        }
        documents.set(documentId, document);
    };

};
Cache.prototype.constructor = Cache;
