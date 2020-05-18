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
        return response.status === 200;
    };

    this.readName = async function(name) {
        const response = await sendRequest('GET', 'names', name);
        if (response.status === 200) {
            const source = response.data.toString('utf8');
            const citation = bali.component(source);
            return citation;
        }
    };

    this.writeName = async function(name, citation) {
        const response = await sendRequest('PUT', 'names', name, undefined, citation);
        if (response.status > 299) throw Error('Unable to create the named citation: ' + response.status);
        return citation;
    };

    this.draftExists = async function(citation) {
        const response = await sendRequest('HEAD', 'drafts', citation);
        return response.status === 200;
    };

    this.readDraft = async function(citation) {
        const response = await sendRequest('GET', 'drafts', citation);
        if (response.status === 200) {
            const source = response.data.toString('utf8');
            return bali.component(source);
        }
    };

    this.writeDraft = async function(draft) {
        const citation = await notary.citeDocument(draft);
        const response = await sendRequest('PUT', 'drafts', citation, undefined, draft);
        if (response.status > 299) throw Error('Unable to save the draft: ' + response.status);
        const source = response.data.toString('utf8');
        return bali.component(source);  // return a citation to the new document
    };

    this.deleteDraft = async function(citation) {
        const response = await sendRequest('DELETE', 'drafts', citation);
        if (response.status === 200) {
            const source = response.data.toString('utf8');
            return bali.component(source);
        }
    };

    this.documentExists = async function(citation) {
        const response = await sendRequest('HEAD', 'documents', citation);
        return response.status === 200;
    };

    this.readDocument = async function(citation) {
        const response = await sendRequest('GET', 'documents', citation);
        if (response.status === 200) {
            const source = response.data.toString('utf8');
            return bali.component(source);
        }
    };

    this.writeDocument = async function(document) {
        const citation = await notary.citeDocument(document);
        const response = await sendRequest('PUT', 'documents', citation, undefined, document);
        if (response.status > 299) throw Error('Unable to create the document: ' + response.status);
        const source = response.data.toString('utf8');
        return bali.component(source);  // return a citation to the new document
    };

    this.messageAvailable = async function(bag) {
        const response = await sendRequest('HEAD', 'messages', bag);
        return response.status === 200;
    };

    this.messageCount = async function(bag) {
        const response = await sendRequest('GET', 'messages', bag);
        return Number(response.data.toString('utf8'));
    };

    this.addMessage = async function(bag, message) {
        const response = await sendRequest('POST', 'messages', bag, undefined, message);
        if (response.status > 299) throw Error('Unable to add the message to the bag: ' + response.status);
        const tag = extractTag(message);
        return tag;
    };

    this.borrowMessage = async function(bag) {
        const response = await sendRequest('DELETE', 'messages', bag);
        if (response.status === 200) {
            const source = response.data.toString('utf8');
            return bali.component(source);
        }
    };

    this.returnMessage = async function(bag, message) {
        const tag = extractTag(message);
        const response = await sendRequest('PUT', 'messages', bag, tag, message);
        return response.status === 200;
    };

    this.deleteMessage = async function(bag, tag) {
        const response = await sendRequest('DELETE', 'messages', bag, tag);
        return response.status === 200;
    };


    // PRIVATE FUNCTIONS

    const extractTag = function(message) {
        const content = message.getValue('$content');
        const tag = content.getParameter('$tag');
        return tag;
    };

    const generatePath = function(resource, identifier) {
        var path = '';
        if (resource.isComponent && resource.isType('/bali/collections/Catalog')) {
            path += resource.getValue('$tag').toString().slice(1);  // remove the leading '#'
            path += '/' + resource.getValue('$version').toString();
        } else {
            path += resource.toString().slice(1);  // remove the leading '/'
        }
        if (identifier) {
            path += '/' + identifier.toString().slice(1);  // remove the leading '#'
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
        if (resource.isComponent && resource.isType('/bali/collections/Catalog')) {
            digest += resource.getValue('$digest').toString().slice(1, -1).replace(/\s+/g, '');
        }
        return digest;
    };

    /**
     * This function sends a RESTful web request to the remote repository with the specified, method,
     * type, resource and identifier. If a document is included it is sent as the body of the
     * request. The result that is returned by the web service is returned from this function.
     *
     * @param {String} method The HTTP method type of the request.
     * @param {String} type The type of resource being acted upon.
     * @param {Name|Catalog} resource The resource being acted upon.
     * @param {Tag} identifier An optional tag used to identify a subcomponent of the resource.
     * @param {Catalog} document An optional signed document to be passed to the web service.
     * @returns {Object} The response to the request.
     */
    const sendRequest = async function(method, type, resource, identifier, document) {

        // setup the request URI and options
        const fullURI = uri + '/repository/' + type + '/' + generatePath(resource, identifier);
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
                'nebula-credentials': await generateCredentials(),
                'nebula-digest': generateDigest(resource),
                'accept': 'application/bali'
            }
        };

        // add headers for the data (if applicable)
        const data = document ? document.toString() : undefined;
        if (data) {
            options.data = data;
            options.headers['content-type'] = 'application/bali';
            options.headers['content-length'] = data.length;
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
            throw exception;
        }
    };

    return this;
};
RemoteStorage.prototype = Object.create(StorageMechanism.prototype);
RemoteStorage.prototype.constructor = RemoteStorage;
exports.RemoteStorage = RemoteStorage;
