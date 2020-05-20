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
const StorageMechanism = require('../StorageMechanism').StorageMechanism;


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
    StorageMechanism.call(this, debug);
    debug = this.debug;
    const bali = this.bali;
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

    this.citeDocument = async function(document) {
        return await notary.citeDocument(document);
    };

    this.nameExists = async function(name) {
        const response = await sendRequest('HEAD', 'names', name);
        if (response.status !== 200 && response.status !== 404) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$nameExists',
                $exception: '$status' + response.status,
                $name: name,
                $text: 'Unable to access the named citation.'
            });
            throw exception;
        }
        return response.status === 200;
    };

    this.readName = async function(name) {
        const response = await sendRequest('GET', 'names', name);
        if (response.status !== 200 && response.status !== 404) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$readName',
                $exception: '$status' + response.status,
                $name: name,
                $text: 'Unable to access the named citation.'
            });
            throw exception;
        }
        if (response.status === 200) {
            const source = response.data.toString('utf8');
            const citation = bali.component(source);
            return citation;
        }
    };

    this.writeName = async function(name, citation) {
        const response = await sendRequest('PUT', 'names', name, undefined, citation);
        if (response.status !== 201) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$writeName',
                $exception: '$status' + response.status,
                $name: name,
                $citation: citation,
                $text: 'Unable to create the named citation.'
            });
            throw exception;
        }
        return citation;
    };

    this.draftExists = async function(citation) {
        const response = await sendRequest('HEAD', 'drafts', citation);
        if (response.status !== 200 && response.status !== 404) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$draftExists',
                $exception: '$status' + response.status,
                $citation: citation,
                $text: 'Unable to access the draft document.'
            });
            throw exception;
        }
        return response.status === 200;
    };

    this.readDraft = async function(citation) {
        const response = await sendRequest('GET', 'drafts', citation);
        if (response.status !== 200 && response.status !== 404) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$readDraft',
                $exception: '$status' + response.status,
                $citation: citation,
                $text: 'Unable to access the draft document.'
            });
            throw exception;
        }
        if (response.status === 200) {
            const source = response.data.toString('utf8');
            return bali.component(source);
        }
    };

    this.writeDraft = async function(draft) {
        const citation = await notary.citeDocument(draft);
        const response = await sendRequest('PUT', 'drafts', citation, undefined, draft);
        if (response.status !== 200 && response.status !== 201) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$writeDraft',
                $exception: '$status' + response.status,
                $draft: draft,
                $text: 'Unable to create or update the draft document.'
            });
            throw exception;
        }
        const source = response.data.toString('utf8');
        return bali.component(source);  // return a citation to the new document
    };

    this.deleteDraft = async function(citation) {
        const response = await sendRequest('DELETE', 'drafts', citation);
        if (response.status !== 200 && response.status !== 404) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$deleteDraft',
                $exception: '$status' + response.status,
                $citation: citation,
                $text: 'Unable to access the draft document.'
            });
            throw exception;
        }
        if (response.status === 200) {
            const source = response.data.toString('utf8');
            return bali.component(source);
        }
    };

    this.documentExists = async function(citation) {
        const response = await sendRequest('HEAD', 'documents', citation);
        if (response.status !== 200 && response.status !== 404) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$documentExists',
                $exception: '$status' + response.status,
                $citation: citation,
                $text: 'Unable to access the document.'
            });
            throw exception;
        }
        return response.status === 200;
    };

    this.readDocument = async function(citation) {
        const response = await sendRequest('GET', 'documents', citation);
        if (response.status !== 200 && response.status !== 404) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$readDocument',
                $exception: '$status' + response.status,
                $citation: citation,
                $text: 'Unable to access the document.'
            });
            throw exception;
        }
        if (response.status === 200) {
            const source = response.data.toString('utf8');
            return bali.component(source);
        }
    };

    this.writeDocument = async function(document) {
        const citation = await notary.citeDocument(document);
        const response = await sendRequest('PUT', 'documents', citation, undefined, document);
        if (response.status !== 201) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$writeDocument',
                $exception: '$status' + response.status,
                $document: document,
                $text: 'Unable to create the document.'
            });
            throw exception;
        }
        const source = response.data.toString('utf8');
        return bali.component(source);  // return a citation to the new document
    };

    this.messageAvailable = async function(bag) {
        const response = await sendRequest('HEAD', 'messages', bag);
        if (response.status !== 200 && response.status !== 404) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$messageAvailable',
                $exception: '$status' + response.status,
                $bag: bag,
                $text: 'Unable to access the message bag.'
            });
            throw exception;
        }
        return response.status === 200;
    };

    this.messageCount = async function(bag) {
        const response = await sendRequest('GET', 'messages', bag);
        if (response.status !== 200 && response.status !== 404) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$messageCount',
                $exception: '$status' + response.status,
                $bag: bag,
                $text: 'Unable to access the message bag.'
            });
            throw exception;
        }
        const count = response.status === 200 ? response.data : 0;
        return Number(count.toString('utf8'));
    };

    this.addMessage = async function(bag, message) {
        const response = await sendRequest('POST', 'messages', bag, undefined, message);
        if (response.status !== 201) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$addMessage',
                $exception: '$status' + response.status,
                $bag: bag,
                $message: message,
                $text: 'Unable to add the message to the bag.'
            });
            throw exception;
        }
    };

    this.borrowMessage = async function(bag) {
        const response = await sendRequest('DELETE', 'messages', bag);
        if (response.status !== 200 && response.status !== 404) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$borrowMessage',
                $exception: '$status' + response.status,
                $bag: bag,
                $text: 'Unable to borrow a message from the bag.'
            });
            throw exception;
        }
        if (response.status === 200) {
            const source = response.data.toString('utf8');
            return bali.component(source);
        }
    };

    this.returnMessage = async function(bag, message) {
        const citation = await notary.citeDocument(message);
        const response = await sendRequest('PUT', 'messages', bag, citation, message);
        if (response.status !== 200) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$returnMessage',
                $exception: '$status' + response.status,
                $bag: bag,
                $message: message,
                $text: 'Unable to return the message to the bag.'
            });
            throw exception;
        }
    };

    this.deleteMessage = async function(bag, citation) {
        const response = await sendRequest('DELETE', 'messages', bag, citation);
        if (response.status !== 200) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$deleteMessage',
                $exception: '$status' + response.status,
                $bag: bag,
                $citation: citation,
                $text: 'Unable to delete the message from the bag.'
            });
            throw exception;
        }
        const source = response.data.toString('utf8');
        return bali.component(source);
    };


    // PRIVATE FUNCTIONS

    const generatePath = function(resource, subresource) {
        var path = '';
        if (resource.isComponent && resource.isType('/bali/collections/Catalog')) {
            path += resource.getValue('$tag').toString().slice(1);  // remove the leading '#'
            path += '/' + resource.getValue('$version').toString();
        } else {
            path += resource.toString().slice(1);  // remove the leading '/'
        }
        if (subresource) {
            path += '/' + subresource.getValue('$tag').toString().slice(1);  // remove the leading '#'
            path += '/' + subresource.getValue('$version').toString();
        } else {
        }
        return path;
    };

    const generateCredentials = async function() {
        const decoder = bali.decoder(0, debug);
        var credentials = (await notary.generateCredentials()).toString();
        credentials = decoder.base32Encode(Buffer.from(credentials, 'utf8')).replace(/\s+/g, '');
        return credentials;
    };

    const generateDigest = function(resource) {
        var digest = '';
        if (resource && resource.isComponent && resource.isType('/bali/collections/Catalog')) {
            digest += resource.getValue('$digest').toString().slice(1, -1).replace(/\s+/g, '');
        }
        return digest;
    };

    /**
     * This function sends a RESTful web request to the remote repository with the specified,
     * method, type, resource and optional subresource.  An optional body of the request may be
     * included as well.  Any result that is returned in the body of the response is returned
     * from this function.
     *
     * @param {String} method The HTTP method type of the request.
     * @param {String} type The type of resource being acted upon.
     * @param {Name|Catalog} resource The name of or a citation to the resource being acted upon.
     * @param {Catalog} subresource An optional citation to a subresource of the main resource.
     * @param {Catalog} body An optional catalog to be passed as the body of the request.
     * @returns {Object} An optional response to the request.
     */
    const sendRequest = async function(method, type, resource, subresource, body) {

        // setup the request URI and options
        const fullURI = uri + '/repository/' + type + '/' + generatePath(resource, subresource);
        const options = {
            url: fullURI,
            method: method,
            //timeout: 1000,
            responseType: 'arraybuffer',
            validateStatus: function (status) {
                return status < 400;  // only flag unexpected server errors
            },
            headers: {
                'user-agent': 'Bali Document Repository API/v2 (NodeJS/v12) Bali Nebula/v2',
                'accept': 'application/bali'
            }
        };

        // add headers for the data (if applicable)
        const data = body ? body.toString() : undefined;
        if (data) {
            options.headers['content-type'] = 'application/bali';
            options.headers['content-length'] = data.length;
            options.data = data;
        }

        // add nebula specific headers
        options.headers['nebula-credentials'] = await generateCredentials();
        options.headers['nebula-digest'] = generateDigest(resource);
        options.headers['nebula-subdigest'] = generateDigest(subresource);

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
                throw exception;
            }
            // the request could not be sent
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteStorage',
                $procedure: '$sendRequest',
                $exception: '$malformedRequest',
                $uri: bali.reference(fullURI),
                $method: bali.text(method),
                $body: body,
                $text: bali.text('The request was not formed correctly.')
            }, cause);
            throw exception;
        }
    };

    return this;
};
RemoteStorage.prototype = Object.create(StorageMechanism.prototype);
RemoteStorage.prototype.constructor = RemoteStorage;
exports.RemoteStorage = RemoteStorage;
