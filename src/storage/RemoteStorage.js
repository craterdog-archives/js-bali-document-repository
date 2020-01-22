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
 * This class implements a proxy to a remote RESTful storage mechanism.  It treats
 * documents as UTF-8 encoded strings.
 */
const axios = require('axios');


// DOCUMENT REPOSITORY

/**
 * This function creates a new instance of a remote storage mechanism proxy.
 *
 * @param {DigitalNotary} notary The digital notary to be used to notarize the request credentials.
 * @param {String} uri A string containing the URI for the remote storage mechanism with no
 * trailing slash.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new remote storage mechanism.
 */
const RemoteStorage = function(notary, uri, debug) {
    if (debug === null || debug === undefined) debug = 0;  // default is off
    const bali = require('bali-component-framework').api(debug);
    if (debug > 2) console.log('Initializing the proxy to the remote repository: ' + uri);

    // validate the arguments
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/repositories/RemoteStorage', '$RemoteStorage', '$notary', notary, [
            '/javascript/Object'
        ]);
        validator.validateType('/bali/repositories/RemoteStorage', '$RemoteStorage', '$uri', uri, [
            '/javascript/String'
        ]);
    }

    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/repositories/RemoteStorage',
            $uri: uri
        });
        return catalog.toString();
    };

    this.citationExists = async function(name) {
        try {
            const response = await sendRequest('HEAD', 'citations', name, undefined, undefined);
            return response.status === 200;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$citationExists',
                $exception: '$unexpected',
                $uri: uri,
                $name: name,
                $text: 'An unexpected error occurred while checking whether or not a citation exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readCitation = async function(name) {
        try {
            const response = await sendRequest('GET', 'citations', name, undefined, undefined);
            if (response.status === 200) {
                const source = response.data.toString('utf8');
                return bali.component(source);
            }
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$readCitation',
                $exception: '$unexpected',
                $uri: uri,
                $name: name,
                $text: 'An unexpected error occurred while attempting to read a citation from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeCitation = async function(name, citation) {
        try {
            const response = await sendRequest('POST', 'citations', name, undefined, citation);
            if (response.status > 299) throw Error('Unable to create the named citation: ' + response.status);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$writeCitation',
                $exception: '$unexpected',
                $uri: uri,
                $name: name,
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to write a citation to the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.draftExists = async function(tag, version) {
        try {
            const response = await sendRequest('HEAD', 'drafts', tag, version, undefined);
            return response.status === 200;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$draftExists',
                $exception: '$unexpected',
                $uri: uri,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while checking whether or not a draft exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readDraft = async function(tag, version) {
        try {
            const response = await sendRequest('GET', 'drafts', tag, version, undefined);
            if (response.status === 200) {
                const source = response.data.toString('utf8');
                return bali.component(source);
            }
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$readDraft',
                $exception: '$unexpected',
                $uri: uri,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to read a draft from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeDraft = async function(draft) {
        try {
            const tag = draft.getValue('$content').getParameter('$tag');
            const version = draft.getValue('$content').getParameter('$version');
            const response = await sendRequest('PUT', 'drafts', tag, version, draft);
            if (response.status > 299) throw Error('Unable to save the draft: ' + response.status);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$writeDraft',
                $exception: '$unexpected',
                $uri: uri,
                $draft: draft,
                $text: 'An unexpected error occurred while attempting to write a draft to the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.deleteDraft = async function(tag, version) {
        try {
            const response = await sendRequest('DELETE', 'drafts', tag, version, undefined);
            if (response.status === 200) {
                const source = response.data.toString('utf8');
                return bali.component(source);
            }
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$deleteDraft',
                $exception: '$unexpected',
                $uri: uri,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to delete a draft from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.documentExists = async function(tag, version) {
        try {
            const response = await sendRequest('HEAD', 'documents', tag, version, undefined);
            return response.status === 200;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$documentExists',
                $exception: '$unexpected',
                $uri: uri,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while checking whether or not a document exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readDocument = async function(tag, version) {
        try {
            const response = await sendRequest('GET', 'documents', tag, version, undefined);
            if (response.status === 200) {
                const source = response.data.toString('utf8');
                return bali.component(source);
            }
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$readDocument',
                $exception: '$unexpected',
                $uri: uri,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to read a document from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeDocument = async function(document) {
        try {
            const tag = document.getValue('$content').getParameter('$tag');
            const version = document.getValue('$content').getParameter('$version');
            const response = await sendRequest('POST', 'documents', tag, version, document);
            if (response.status > 299) throw Error('Unable to create the document: ' + response.status);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$writeDocument',
                $exception: '$unexpected',
                $uri: uri,
                $document: document,
                $text: 'An unexpected error occurred while attempting to write a document to the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.queueExists = async function(queue) {
        try {
            const response = await sendRequest('HEAD', 'queues', queue, undefined, undefined);
            return response.status === 200;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$queueExists',
                $exception: '$unexpected',
                $uri: uri,
                $queue: queue,
                $text: 'An unexpected error occurred while attempting to check whether or not a message queue exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.messageCount = async function(queue) {
        try {
            const response = await sendRequest('GET', 'queues', queue, undefined, undefined);
            return Number(response.data.toString('utf8'));
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$messageCount',
                $exception: '$unexpected',
                $uri: uri,
                $queue: queue,
                $text: 'An unexpected error occurred while attempting to check the number of messages that are on a queue.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.addMessage = async function(queue, message) {
        try {
            const response = await sendRequest('PUT', 'queues', queue, undefined, message);
            if (response.status > 299) throw Error('Unable to queue the message: ' + response.status);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$addMessage',
                $exception: '$unexpected',
                $uri: uri,
                $queue: queue,
                $message: message,
                $text: 'An unexpected error occurred while attempting to add a message to a queue.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.removeMessage = async function(queue) {
        try {
            const response = await sendRequest('DELETE', 'queues', queue, undefined, undefined);
            if (response.status === 200) {
                const source = response.data.toString('utf8');
                return bali.component(source);
            }
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$removeMessage',
                $exception: '$unexpected',
                $uri: uri,
                $queue: queue,
                $text: 'An unexpected error occurred while attempting to remove a message from a queue.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };


    // PRIVATE FUNCTIONS

    /**
     * This function sends a RESTful web request to the remote repository with the specified, method,
     * type, resource identifier and version. If a document is included it is sent as the body of the
     * request. The result that is returned by the web service is returned from this function.
     *
     * @param {String} method The HTTP method type of the request.
     * @param {String} type The type of resource being acted upon.
     * @param {Name|Tag} identifier The identifier of the specific resource being acted upon.
     * @param {Version} version The version of the specific resource being acted upon.
     * @param {Catalog} document An optional signed document to be passed to the web service.
     * @returns {Object} The response to the request.
     */
    const sendRequest = async function(method, type, identifier, version, document) {

        // the POSIX end of line character
        const EOL = '\n';

        // generate the credentials
        const credentials = await notary.generateCredentials();

        // setup the request URI and options
        const fullURI = uri + '/' + type + '/' + identifier.toString().slice(1) + (version ? '/' + version : '');
        const options = {
            url: fullURI,
            method: method,
            //timeout: 1000,
            responseType: 'arraybuffer',
            validateStatus: function (status) {
                return status < 400;  // only flag unexpected server errors
            },
            headers: {
                'User-Agent': 'Bali Document Repository API/v2 (NodeJS/v12) Bali Nebula/v2',
                'Nebula-Credentials': encodeURI('"' + EOL + credentials + EOL + '"'),
                'Accept': 'application/bali'
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
            return response;
        } catch (cause) {
            if (cause.response) {
                // the server responded with an error status
                return cause.response;
            }
            if (cause.request) {
                // the request was sent but no response was received
                const exception = bali.exception({
                    $module: '/bali/repositories/RemoteStorage',
                    $procedure: '$sendRequest',
                    $exception: '$serverDown',
                    $uri: bali.reference(fullURI),
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
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$sendRequest',
                $exception: '$malformedRequest',
                $uri: bali.reference(fullURI),
                $method: bali.text(method),
                $document: document,
                $text: bali.text('The request was not formed correctly.')
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    return this;
};
RemoteStorage.prototype.constructor = RemoteStorage;
exports.RemoteStorage = RemoteStorage;
