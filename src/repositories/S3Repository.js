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
 * This class implements an AWS S3 bucket based document repository.  It treats
 * documents as UTF-8 encoded strings.
 */
const aws = new require('aws-sdk/clients/s3');
const s3 = new aws({apiVersion: '2006-03-01'});
const bali = require('bali-component-framework').api();


// PRIVATE CONSTANTS

// the POSIX end of line character
const EOL = '\n';


// PUBLIC FUNCTIONS

/**
 * This function creates a new instance of a S3 document repository.  If the
 * repository does not yet exist it is created.
 * 
 * @param {Object} configuration An object containing the S3 configuration information. 
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new S3 document repository.
 */
const S3Repository = function(configuration, debug) {
    // validate the arguments
    if (debug === null || debug === undefined) debug = 0;  // default is off
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/repositories/S3Repository', '$S3Repository', '$configuration', configuration, [
            '/javascript/Object'
        ]);
    }

    // setup the private attributes
    const citations = 'citations/';
    const drafts = 'drafts/';
    const documents = 'documents/';
    const types = 'types/';
    const queues = 'queues/';

    /**
     * This function returns a string providing attributes about this repository.
     * 
     * @returns {String} A string providing attributes about this repository.
     */
    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/repositories/S3Repository',
            $url: this.getURI()
        });
        return catalog.toString();
    };

    /**
     * This function returns a reference to this document repository.
     * 
     * @returns {Reference} A reference to this document repository.
     */
    this.getURI = function() {
        try {
            return bali.reference(configuration.url);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$getURI',
                $exception: '$unexpected',
                $text: 'An unexpected error occurred while attempting to retrieve the URI for the repository.'
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
                validator.validateType('/bali/repositories/S3Repository', '$citationExists', '$name', name, [
                    '/javascript/String'
                ]);
            }

            // check for existence
            name = citations + name.slice(1);  // prepend the context and remove redundant slash
            const exists = await componentExists(configuration.citationBucket, name, debug);

            return exists;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$citationExists',
                $exception: '$unexpected',
                $name: name,
                $text: 'An unexpected error occurred while attempting to verify the existence of a citation.'
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
                validator.validateType('/bali/repositories/S3Repository', '$fetchCitation', '$name', name, [
                    '/javascript/String'
                ]);
            }

            // fetch the citation
            name = citations + name.slice(1);  // prepend the context and remove redundant slash
            const citation = await readComponent(configuration.citationBucket, name, debug);

            return citation;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$fetchCitation',
                $exception: '$unexpected',
                $name: name,
                $text: 'An unexpected error occurred while attempting to fetch a citation.'
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
                validator.validateType('/bali/repositories/S3Repository', '$createCitation', '$name', name, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/S3Repository', '$createCitation', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }

            // make sure the citation doesn't already exist
            name = citations + name.slice(1);  // prepend the context and remove redundant slash
            if (await componentExists(configuration.citationBucket, name, debug)) {
                const exception = bali.exception({
                    $module: '/bali/repositories/S3Repository',
                    $procedure: '$createCitation',
                    $exception: '$citationExists',
                    $name: name,
                    $text: 'The citation to be created already exists.'
                });
                if (debug) console.error(exception.toString());
                throw exception;
            }

            // create the new citation
            await writeComponent(configuration.citationBucket, name, citation, debug);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$createCitation',
                $exception: '$unexpected',
                $name: name,
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to create a citation.'
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
                validator.validateType('/bali/repositories/S3Repository', '$draftExists', '$draftId', draftId, [
                    '/javascript/String'
                ]);
            }

            // check for existence
            const name = drafts + draftId;  // prepend the context
            const exists = await componentExists(configuration.draftBucket, name, debug);

            return exists;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$draftExists',
                $exception: '$unexpected',
                $draftId: draftId,
                $text: 'An unexpected error occurred while attempting to verify the existence of a draft.'
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
                validator.validateType('/bali/repositories/S3Repository', '$fetchDraft', '$draftId', draftId, [
                    '/javascript/String'
                ]);
            }

            // fetch the draft document
            const name = drafts + draftId;  // prepend the context
            const draft = await readComponent(configuration.draftBucket, name, debug);

            return draft;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$fetchDraft',
                $exception: '$unexpected',
                $draftId: draftId,
                $text: 'An unexpected error occurred while attempting to fetch a draft.'
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
                validator.validateType('/bali/repositories/S3Repository', '$saveDraft', '$draftId', draftId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/S3Repository', '$saveDraft', '$draft', draft, [
                    '/bali/collections/Catalog'
                ]);
            }

            // save the draft document
            const name = drafts + draftId;  // prepend the context
            await writeComponent(configuration.draftBucket, name, draft, debug);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$saveDraft',
                $exception: '$unexpected',
                $draftId: draftId,
                $draft: draft,
                $text: 'An unexpected error occurred while attempting to save a draft.'
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
                validator.validateType('/bali/repositories/S3Repository', '$deleteDraft', '$draftId', draftId, [
                    '/javascript/String'
                ]);
            }

            // delete the draft document
            const name = drafts + draftId;  // prepend the context
            await deleteComponent(configuration.draftBucket, name, debug);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$deleteDraft',
                $exception: '$unexpected',
                $draftId: draftId,
                $text: 'An unexpected error occurred while attempting to delete a draft.'
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
                validator.validateType('/bali/repositories/S3Repository', '$documentExists', '$documentId', documentId, [
                    '/javascript/String'
                ]);
            }

            // check the existence
            const name = documents + documentId;  // prepend the context
            const exists = await componentExists(configuration.documentBucket, name, debug);

            return exists;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$documentExists',
                $exception: '$unexpected',
                $documentId: documentId,
                $text: 'An unexpected error occurred while attempting to verify the existence of a document.'
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
                validator.validateType('/bali/repositories/S3Repository', '$fetchDocument', '$documentId', documentId, [
                    '/javascript/String'
                ]);
            }

            // fetch the document
            const name = documents + documentId;  // prepend the context
            const document = await readComponent(configuration.documentBucket, name, debug);

            return document;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$fetchDocument',
                $exception: '$unexpected',
                $documentId: documentId,
                $text: 'An unexpected error occurred while attempting to fetch a document.'
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
                validator.validateType('/bali/repositories/S3Repository', '$createDocument', '$documentId', documentId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/S3Repository', '$createDocument', '$document', document, [
                    '/bali/collections/Catalog'
                ]);
            }

            // make sure the document doesn't already exist
            const name = documents + documentId;  // prepend the context
            if (await componentExists(configuration.documentBucket, name, debug)) {
                const exception = bali.exception({
                    $module: '/bali/repositories/S3Repository',
                    $procedure: '$createDocument',
                    $exception: '$documentExists',
                    $name: name,
                    $text: 'The document to be created already exists.'
                });
                if (debug) console.error(exception.toString());
                throw exception;
            }

            // create the new document
            await writeComponent(configuration.documentBucket, name, document, debug);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$createDocument',
                $exception: '$unexpected',
                $documentId: documentId,
                $document: document,
                $text: 'An unexpected error occurred while attempting to create a document.'
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
                validator.validateType('/bali/repositories/S3Repository', '$typeExists', '$typeId', typeId, [
                    '/javascript/String'
                ]);
            }

            // check the existence
            const name = types + typeId;  // prepend the context
            const exists = await componentExists(configuration.typeBucket, name, debug);

            return exists;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$typeExists',
                $exception: '$unexpected',
                $typeId: typeId,
                $text: 'An unexpected error occurred while attempting to verify the existence of a type.'
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
                validator.validateType('/bali/repositories/S3Repository', '$fetchType', '$typeId', typeId, [
                    '/javascript/String'
                ]);
            }

            // fetch the type
            const name = types + typeId;  // prepend the context
            const type = await readComponent(configuration.typeBucket, name, debug);

            return type;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$fetchType',
                $exception: '$unexpected',
                $typeId: typeId,
                $text: 'An unexpected error occurred while attempting to fetch a type.'
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
                validator.validateType('/bali/repositories/S3Repository', '$createType', '$typeId', typeId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/S3Repository', '$createType', '$type', type, [
                    '/bali/collections/Catalog'
                ]);
            }

            // make sure the type doesn't already exist
            const name = types + typeId;  // prepend the context
            if (await componentExists(configuration.typeBucket, name, debug)) {
                const exception = bali.exception({
                    $module: '/bali/repositories/S3Repository',
                    $procedure: '$createType',
                    $exception: '$typeExists',
                    $name: name,
                    $text: 'The type to be created already exists.'
                });
                if (debug) console.error(exception.toString());
                throw exception;
            }

            // create the new type
            await writeComponent(configuration.typeBucket, name, type, debug);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$createType',
                $exception: '$unexpected',
                $typeId: typeId,
                $type: type,
                $text: 'An unexpected error occurred while attempting to create a type.'
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
                validator.validateType('/bali/repositories/S3Repository', '$queueMessage', '$queueId', queueId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/S3Repository', '$queueMessage', '$message', message, [
                    '/bali/collections/Catalog'
                ]);
            }

            // place the new message on the queue
            const queue = queues + queueId + '/';
            const messageId = bali.tag().getValue();
            const name = queue + messageId;  // prepend the context
            await writeComponent(configuration.queueBucket, name, message, debug);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$queueMessage',
                $exception: '$unexpected',
                $queueId: queueId,
                $message: message,
                $text: 'An unexpected error occurred while attempting to queue a message.'
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
                validator.validateType('/bali/repositories/S3Repository', '$dequeueMessage', '$queueId', queueId, [
                    '/javascript/String'
                ]);
            }

            // remove a message from the queue
            const queue = queues + queueId + '/';
            var message;
            while (true) {
                const messages = await listDirectory(configuration.queueBucket, queue, debug);
                const count = messages.length;
                if (count) {
                    // select a message at random since a distributed queue cannot guarantee FIFO
                    const generator = bali.generator();
                    const index = generator.generateIndex(count) - 1;  // convert to zero based indexing
                    const name = messages[index];
                    message = await readComponent(configuration.queueBucket, name, debug);
                    try {
                        await deleteComponent(configuration.queueBucket, name, debug);
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
                $module: '/bali/repositories/S3Repository',
                $procedure: '$dequeueMessage',
                $exception: '$unexpected',
                $queueId: queueId,
                $text: 'An unexpected error occurred while attempting to dequeue a message.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    return this;
};
S3Repository.prototype.constructor = S3Repository;
exports.S3Repository = S3Repository;


// PRIVATE FUNCTIONS

/**
 * This function returns a list of the names of the components contained in the specified
 * directory.
 * 
 * @param {String} bucket The name of the s3 bucket.
 * @param {String} directory The directory to be listed.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Array} An array containing the names of the components in the directory.
 */
const listDirectory = async function(bucket, directory, debug) {
    try {
        const list = await listObjects(bucket, directory);
        const names = [];
        list.forEach(function(item) {
            names.push(item.Key.slice(0,-5));  // remove the file suffix
        });
        return names;
    } catch (cause) {
        const exception = bali.exception({
            $module: '/bali/repositories/S3Repository',
            $procedure: '$listDirectory',
            $exception: '$unexpected',
            $directory: directory,
            $text: 'An unexpected error occurred while attempting to list a directory.'
        }, cause);
        if (debug > 0) console.error(exception.toString());
        throw exception;
    }
};


/**
 * This function determines whether or not the specified component exists.
 * 
 * @param {String} bucket The name of the s3 bucket.
 * @param {String} name The name of the component.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Boolean} Whether or not the component exists.
 */
const componentExists = async function(bucket, name, debug) {
    try {
        const file = name + '.bali';  // append the file suffix
        const exists = await doesExist(bucket, file);
        return exists;
    } catch (cause) {
        const exception = bali.exception({
            $module: '/bali/repositories/S3Repository',
            $procedure: '$componentExists',
            $exception: '$unexpected',
            $name: name,
            $text: 'An unexpected error occurred while attempting to look for a component.'
        }, cause);
        if (debug > 0) console.error(exception.toString());
        throw exception;
    }
};


/**
 * This function returns the specified component, or as <code>undefined</code> if it does
 * not exist.
 * 
 * @param {String} bucket The name of the s3 bucket.
 * @param {String} name The name of the component to be read.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Component} The component.
 */
const readComponent = async function(bucket, name, debug) {
    try {
        var component;
        if (await componentExists(bucket, name, debug)) {
            const file = name + '.bali';  // append the file suffix
            const source = await getObject(bucket, file);
            component = bali.component(source, debug);
        }
        return component;
    } catch (cause) {
        const exception = bali.exception({
            $module: '/bali/repositories/S3Repository',
            $procedure: '$readComponent',
            $exception: '$unexpected',
            $name: name,
            $text: 'An unexpected error occurred while attempting to read a component from a file.'
        }, cause);
        if (debug > 0) console.error(exception.toString());
        throw exception;
    }
};


/**
 * This function stores the specified component in a file with the specified name.
 * 
 * @param {String} bucket The name of the s3 bucket.
 * @param {String} name The name of the component.
 * @param {Component} component The component to be stored.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 */
const writeComponent = async function(bucket, name, component, debug) {
    try {
        const file = name + '.bali';  // append the file suffix
        const source = component.toString() + EOL;  // add POSIX compliant <EOL>
        await putObject(bucket, file, source);
    } catch (cause) {
        const exception = bali.exception({
            $module: '/bali/repositories/S3Repository',
            $procedure: '$writeComponent',
            $exception: '$unexpected',
            $name: name,
            $component: component,
            $text: 'An unexpected error occurred while attempting to write a component to a file.'
        }, cause);
        if (debug > 0) console.error(exception.toString());
        throw exception;
    }
};


/**
 * This function deletes the specified component if it exists.
 * 
 * @param {String} bucket The name of the s3 bucket.
 * @param {String} name The name of the component.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 */
const deleteComponent = async function(bucket, name, debug) {
    try {
        if (await componentExists(bucket, name, debug)) {
            const file = name + '.bali';  // append the file suffix
            await deleteObject(bucket, file);
        }
    } catch (cause) {
        const exception = bali.exception({
            $module: '/bali/repositories/S3Repository',
            $procedure: '$deleteComponent',
            $exception: '$unexpected',
            $name: name,
            $text: 'An unexpected error occurred while attempting to delete a component.'
        }, cause);
        if (debug > 0) console.error(exception.toString());
        throw exception;
    }
};


// AWS S3 PROMISIFICATION

const listObjects = async function(bucket, prefix) {
    return new Promise(function(resolve, reject) {
        try {
            s3.listObjectsV2({Bucket: bucket, Prefix: prefix, MaxKeys: 64}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    resolve(data.Contents);
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const doesExist = async function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            s3.headObject({Bucket: bucket, Key: key}, function(error, data) {
                if (error || data.DeleteMarker || !data.ContentLength) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const getObject = async function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            s3.getObject({Bucket: bucket, Key: key}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    resolve(data.Body.toString());
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const putObject = async function(bucket, key, object) {
    return new Promise(function(resolve, reject) {
        try {
            s3.putObject({Bucket: bucket, Key: key, Body: object.toString()}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const deleteObject = async function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            s3.deleteObject({Bucket: bucket, Key: key}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};
