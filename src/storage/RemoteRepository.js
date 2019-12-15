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


// DOCUMENT REPOSITORY

/**
 * This function creates a new instance of a remote document repository proxy.
 *
 * @param {DigitalNotary} notary The digital notary to be used to notarize the request credentials.
 * @param {String} uri A string containing the URI for the remote document repository with no
 * trailing slash.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new remote document repository.
 */
const RemoteRepository = function(notary, uri, debug) {
    if (debug > 2) console.log('Initializing the proxy to the remote repository: ' + uri);

    // validate the arguments
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/repositories/RemoteRepository', '$RemoteRepository', '$notary', notary, [
            '/javascript/Object'
        ]);
        validator.validateType('/bali/repositories/RemoteRepository', '$RemoteRepository', '$uri', uri, [
            '/javascript/String'
        ]);
    }

    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/repositories/RemoteRepository',
            $uri: uri
        });
        return catalog.toString();
    };

    this.staticExists = async function(resource) {
        try {
            return await sendRequest('HEAD', 'statics', resource, undefined, undefined);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
                $procedure: '$staticExists',
                $exception: '$unexpected',
                $uri: uri,
                $resource: resource,
                $text: 'An unexpected error occurred while checking whether or not a static resource exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readStatic = async function(resource) {
        try {
            return await sendRequest('GET', 'statics', resource, undefined, undefined);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
                $procedure: '$readStatic',
                $exception: '$unexpected',
                $uri: uri,
                $resource: resource,
                $text: 'An unexpected error occurred while attempting to read a static resource from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.citationExists = async function(name) {
        try {
            return await sendRequest('HEAD', 'citations', name, undefined, undefined);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            return await sendRequest('GET', 'citations', name, undefined, undefined);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            await sendRequest('POST', 'citations', name, undefined, citation);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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

    this.documentExists = async function(type, tag, version) {
        try {
            return await sendRequest('HEAD', type, tag, version, undefined);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
                $procedure: '$documentExists',
                $exception: '$unexpected',
                $uri: uri,
                $type: type,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while checking whether or not a document exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readDocument = async function(type, tag, version) {
        try {
            return await sendRequest('GET', type, tag, version, undefined);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
                $procedure: '$readDocument',
                $exception: '$unexpected',
                $uri: uri,
                $type: type,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to read a document from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeDocument = async function(type, tag, version, document) {
        try {
            const method = (type === 'drafts') ? 'PUT' : 'POST';
            await sendRequest(method, type, tag, version, document);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
                $procedure: '$writeDocument',
                $exception: '$unexpected',
                $uri: uri,
                $type: type,
                $tag: tag,
                $version: version,
                $document: document,
                $text: 'An unexpected error occurred while attempting to write a document to the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.deleteDocument = async function(type, tag, version) {
        try {
            return await sendRequest('DELETE', type, tag, version, undefined);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
                $procedure: '$deleteDocument',
                $exception: '$unexpected',
                $uri: uri,
                $type: type,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to delete a document from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.addMessage = async function(queue, message) {
        try {
            await sendRequest('PUT', 'queues', queue, undefined, message);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
            return await sendRequest('DELETE', 'queues', queue, undefined, undefined);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RemoteRepository',
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
     * @returns {Boolean|Catalog} The result of the request.
     */
    const sendRequest = async function(method, type, identifier, version, document) {
    
        // the POSIX end of line character
        const EOL = '\n';
    
        // generate the credentials
        var citation = await notary.getCitation();
        citation = citation.duplicate();
        citation.setParameter('$type', '/bali/notary/Citation/v1');
        citation.setParameter('$tag', bali.tag());
        citation.setParameter('$version', bali.version());
        citation.setParameter('$permissions', '/bali/permissions/private/v1');
        citation.setParameter('$previous', bali.pattern.NONE);
        const credentials = await notary.notarizeDocument(citation);
    
        // setup the request URI and options
        const fullURI = uri + '/' + type + '/' + identifier.toString().slice(1) + (version ? '/' + version : '');
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
                'Nebula-Credentials': encodeURI('"' + EOL + credentials + EOL + '"')
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
                    return true;  // the document did exist
                default:
                    if (response.data && response.data.length) {
                        result = bali.component(response.data);
                    }
                }
            return result;
        } catch (cause) {
            if (cause.response) {
                // the server responded with an error status
                switch (method) {
                    case 'HEAD':
                        if (cause.response.status === 404) return false;  // the document didn't exist
                    default:
                        // continue with the exception processing
                }
                const exception = bali.exception({
                    $module: '/bali/repositories/RemoteRepository',
                    $procedure: '$sendRequest',
                    $exception: '$invalidRequest',
                    $uri: bali.reference(fullURI),
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
                $module: '/bali/repositories/RemoteRepository',
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
RemoteRepository.prototype.constructor = RemoteRepository;
exports.RemoteRepository = RemoteRepository;
