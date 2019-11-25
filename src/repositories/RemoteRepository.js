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
 * This class implements a proxy to a remote RESTful document repository.  It treats
 * documents as UTF-8 encoded strings.
 */
const axios = require('axios');
const bali = require('bali-component-framework').api();


// PRIVATE CONSTANTS

// the POSIX end of line character
const EOL = '\n';


// PUBLIC FUNCTIONS

/**
 * This function creates a new instance of a S3 document repository.  If the
 * repository does not yet exist it is created.
 *
 * @param {DigitalNotary} notary The digital notary to be used to notarize the request credentials.
 * @param {String} url A string containing the URI for the remote document repository.
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
const RemoteRepository = function(notary, url, debug) {
    if (debug === null || debug === undefined) debug = 0;  // default is off
    if (debug > 2) console.log('Initializing the proxy to remote repository: ' + url);

    // validate the arguments
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/repositories/RemoteRepository', '$RemoteRepository', '$notary', notary, [
            '/javascript/Object'
        ]);
        validator.validateType('/bali/repositories/RemoteRepository', '$RemoteRepository', '$url', url, [
            '/javascript/String'
        ]);
    }

    // setup the private attributes
    const citations = '/citations/';
    const drafts = '/drafts/';
    const documents = '/documents/';
    const types = '/types/';
    const queues = '/queues/';

    /**
     * This function returns a string providing attributes about this repository.
     *
     * @returns {String} A string providing attributes about this repository.
     */
    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/repositories/RemoteRepository',
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
            return bali.reference(url);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            if (debug > 2) console.log('Checking to see if citation exists: ' + name);

            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RemoteRepository', '$citationExists', '$name', name, [
                    '/javascript/String'
                ]);
            }

            // check for existence
            const credentials = await generateCredentials(notary, debug);
            name = citations + name.slice(1);  // prepend the context and remove redundant slash
            const exists = await sendRequest(credentials, '$citationExists', url, 'HEAD', name);

            if (debug > 2) console.log(exists ? 'It exists.' : 'It does not exist.');
            return exists;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            if (debug > 2) console.log('Fetching citation: ' + name);

            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RemoteRepository', '$fetchCitation', '$name', name, [
                    '/javascript/String'
                ]);
            }

            // fetch the citation
            const credentials = await generateCredentials(notary, debug);
            name = citations + name.slice(1);  // prepend the context and remove redundant slash
            const citation = await sendRequest(credentials, '$fetchCitation', url, 'GET', name);

            if (debug > 2) console.log('Citation: ' + citation);
            return citation;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            if (debug > 2) console.log('Creating citation: ' + name + ' ' + citation);

            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RemoteRepository', '$createCitation', '$name', name, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/RemoteRepository', '$createCitation', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }

            // create the new citation
            const credentials = await generateCredentials(notary, debug);
            name = citations + name.slice(1);  // prepend the context and remove redundant slash
            await sendRequest(credentials, '$createCitation', url, 'POST', name, citation);

            if (debug > 2) console.log('Success.');
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            if (debug > 2) console.log('Checking to see if draft exists: ' + draftId);

            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RemoteRepository', '$draftExists', '$draftId', draftId, [
                    '/javascript/String'
                ]);
            }

            // check for existence
            const credentials = await generateCredentials(notary, debug);
            const name = drafts + draftId;  // prepend the context
            const exists = await sendRequest(credentials, '$draftExists', url, 'HEAD', name);

            if (debug > 2) console.log(exists ? 'It exists.' : 'It does not exist.');
            return exists;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            if (debug > 2) console.log('Fetching draft: ' + draftId);

            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RemoteRepository', '$fetchDraft', '$draftId', draftId, [
                    '/javascript/String'
                ]);
            }

            // fetch the draft document
            const credentials = await generateCredentials(notary, debug);
            const name = drafts + draftId;  // prepend the context
            const draft = await sendRequest(credentials, '$fetchDraft', url, 'GET', name);

            if (debug > 2) console.log('Draft: ' + draft);
            return draft;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            if (debug > 2) console.log('Save draft: ' + draftId + ' ' + draft);

            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RemoteRepository', '$saveDraft', '$draftId', draftId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/RemoteRepository', '$saveDraft', '$draft', draft, [
                    '/bali/collections/Catalog'
                ]);
            }

            // save the draft document
            const credentials = await generateCredentials(notary, debug);
            const name = drafts + draftId;  // prepend the context
            await sendRequest(credentials, '$saveDraft', url, 'PUT', name, draft);

            if (debug > 2) console.log('Success.');
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            if (debug > 2) console.log('Delete draft: ' + draftId);

            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RemoteRepository', '$deleteDraft', '$draftId', draftId, [
                    '/javascript/String'
                ]);
            }

            // delete the draft document
            const credentials = await generateCredentials(notary, debug);
            const name = drafts + draftId;  // prepend the context
            await sendRequest(credentials, '$deleteDraft', url, 'DELETE', name);

            if (debug > 2) console.log('Success.');
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            if (debug > 2) console.log('Checking to see if document exists: ' + documentId);

            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RemoteRepository', '$documentExists', '$documentId', documentId, [
                    '/javascript/String'
                ]);
            }

            // check the existence
            const credentials = await generateCredentials(notary, debug);
            const name = documents + documentId;  // prepend the context
            const exists = await sendRequest(credentials, '$documentExists', url, 'HEAD', name);

            if (debug > 2) console.log(exists ? 'It exists.' : 'It does not exist.');
            return exists;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            if (debug > 2) console.log('Fetching document: ' + documentId);

            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RemoteRepository', '$fetchDocument', '$documentId', documentId, [
                    '/javascript/String'
                ]);
            }

            // fetch the document
            const credentials = await generateCredentials(notary, debug);
            const name = documents + documentId;  // prepend the context
            const document = await sendRequest(credentials, '$fetchDocument', url, 'GET', name);

            if (debug > 2) console.log('Document: ' + document);
            return document;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            if (debug > 2) console.log('Creating document: ' + documentId + ' ' + document);

            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RemoteRepository', '$createDocument', '$documentId', documentId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/RemoteRepository', '$createDocument', '$document', document, [
                    '/bali/collections/Catalog'
                ]);
            }

            // create the new document
            const credentials = await generateCredentials(notary, debug);
            const name = documents + documentId;  // prepend the context
            await sendRequest(credentials, '$createDocument', url, 'POST', name, document);

            if (debug > 2) console.log('Success.');
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            if (debug > 2) console.log('Checking to see if type exists: ' + typeId);

            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RemoteRepository', '$typeExists', '$typeId', typeId, [
                    '/javascript/String'
                ]);
            }

            // check the existence
            const credentials = await generateCredentials(notary, debug);
            const name = types + typeId;  // prepend the context
            const exists = await sendRequest(credentials, '$typeExists', url, 'HEAD', name);

            if (debug > 2) console.log(exists ? 'It exists.' : 'It does not exist.');
            return exists;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            if (debug > 2) console.log('Fetching type: ' + typeId);

            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RemoteRepository', '$fetchType', '$typeId', typeId, [
                    '/javascript/String'
                ]);
            }

            // fetch the type
            const credentials = await generateCredentials(notary, debug);
            const name = types + typeId;  // prepend the context
            const type = await sendRequest(credentials, '$fetchType', url, 'GET', name);

            if (debug > 2) console.log('Type: ' + type);
            return type;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            if (debug > 2) console.log('Creating type: ' + typeId + ' ' + type);

            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RemoteRepository', '$createType', '$typeId', typeId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/RemoteRepository', '$createType', '$type', type, [
                    '/bali/collections/Catalog'
                ]);
            }

            // create the new type
            const credentials = await generateCredentials(notary, debug);
            const name = types + typeId;  // prepend the context
            await sendRequest(credentials, '$createType', url, 'POST', name, type);

            if (debug > 2) console.log('Success.');
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            if (debug > 2) console.log('Queue message: ' + queueId + ' ' + message);

            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RemoteRepository', '$queueMessage', '$queueId', queueId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/RemoteRepository', '$queueMessage', '$message', message, [
                    '/bali/collections/Catalog'
                ]);
            }

            // place the new message on the queue
            const credentials = await generateCredentials(notary, debug);
            const name = queues + queueId;  // prepend the context
            await sendRequest(credentials, '$queueMessage', url, 'PUT', name, message);

            if (debug > 2) console.log('Success.');
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            if (debug > 2) console.log('Dequeue message: ' + queueId);

            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RemoteRepository', '$dequeueMessage', '$queueId', queueId, [
                    '/javascript/String'
                ]);
            }

            // remove a message from the queue
            const credentials = await generateCredentials(notary, debug);
            const name = queues + queueId;  // prepend the context
            const message = await sendRequest(credentials, '$dequeueMessage', url, 'GET', name);

            if (debug > 2) console.log('Message: ' + message);
            return message;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
RemoteRepository.prototype.constructor = RemoteRepository;
exports.RemoteRepository = RemoteRepository;


// PRIVATE FUNCTIONS

/**
 * This function generates a set of signed credentials for the client making a request on
 * the cloud repository. The credentials can be used by the cloud repository to authenticate
 * the client and verify their permissions.
 *
 * @param {Object} notary An object that implements the API for the digital notary.
 * @param {Boolean} debug An optional flag that determines whether or not exceptions
 * will be logged to the error console.
 * @returns {Catalog} The newly generated credentials.
 */
const generateCredentials = async function(notary, debug) {
    debug = debug || false;
    try {
        const citation = await notary.getCitation();
        const copy = citation.duplicate();
        copy.setParameter('$type', '/bali/notary/Citation/v1');
        copy.setParameter('$tag', bali.tag());
        copy.setParameter('$version', bali.version());
        copy.setParameter('$permissions', '/bali/permissions/private/v1');
        copy.setParameter('$previous', bali.pattern.NONE);
        const credentials = await notary.notarizeComponent(copy);
        return credentials;
    } catch (cause) {
        const exception = bali.exception({
            $module: '/bali/services/RemoteRepository',
            $procedure: '$generateCredentials',
            $exception: '$unexpected',
            $text: bali.text('An unexpected error occurred while attempting to generate credentials.')
        }, cause);
        if (debug) console.error(exception.toString());
        throw exception;
    }
};


/**
 * This function sends a RESTful web request to the web service specified by the url,
 * method, and resource name. If a document is included it is sent as the body of the
 * request. The result that is returned by the web service is returned from this function.
 *
 * @param {Catalog} credentials The signed credentials for the client making the request.
 * @param {String} functionName The name of the API function sending the request.
 * @param {String} url A string containing the URI of the web service.
 * @param {String} method The HTTP method type of the request.
 * @param {String} name The name of the specific resource being acted upon.
 * @param {Catalog} document An optional signed document to be passed to the web service.
 * @param {Boolean} debug An optional flag that determines whether or not exceptions
 * will be logged to the error console.
 * @returns {Boolean|Catalog} The result of the request.
 */
const sendRequest = async function(credentials, functionName, url, method, name, document, debug) {
    debug = debug || false;

    const encoded = encodeURI('"' + EOL + credentials + EOL + '"');
    // setup the request URI and options
    const fullURI = url + name;
    const options = {
        url: fullURI,
        method: method,
        //timeout: 1000,
        responseType: 'text',
        validateStatus: function (status) {
            return status < 400;  // only flag unexpected server errors
        },
        headers: {
            //'User-Agent': 'Bali Nebula™ API 1.0',
            'Nebula-Credentials': encoded
        }
    };

    // add headers for the data (if applicable)
    const data = document ? document.toString() : undefined;
    if (data) {
        options.data = data;
        options.headers['Content-Type'] = 'application/bali';
        options.headers['Content-Length'] = data.length;
    }

    // send the request
    try {
        const response = await axios(options);
        var result;
        switch (method) {
            case 'HEAD':
            case 'DELETE':
                return true;  // the document did exist
            default:
                if (response.data && response.data.length) {
                    result = bali.component(response.data, debug);
                }
            }
        return result;
    } catch (cause) {
        if (cause.response) {
            // the server responded with an error status
            switch (method) {
                case 'HEAD':
                case 'DELETE':
                    if (cause.response.status === 404) return false;  // the document didn't exist
                default:
                    // continue with the exception processing
            }
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
                $procedure: functionName,
                $exception: '$invalidRequest',
                $url: bali.reference(options.url),
                $method: bali.text(method),
                $status: cause.response.status,
                $details: bali.text(cause.response.statusText),
                $text: bali.text('The request was rejected by the Bali Nebula™.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
        if (cause.request) {
            // the request was sent but no response was received
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
                $procedure: functionName,
                $exception: '$serverDown',
                $url: bali.reference(options.url),
                $method: bali.text(method),
                $status: cause.request.status,
                $details: bali.text(cause.request.statusText),
                $text: bali.text('The request received no response.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
        // the request could not be sent
        const exception = bali.exception({
            $module: '/bali/repositories/RemoteRepository',
            $procedure: functionName,
            $exception: '$malformedRequest',
            $url: bali.reference(options.url),
            $method: bali.text(options.method),
            $document: document,
            $text: bali.text('The request was not formed correctly.')
        }, cause);
        if (debug) console.error(exception.toString());
        throw exception;
    }
};
