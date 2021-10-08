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
 * This class enforces the relatively standard HTTP web API semantics documented here:
 * https://github.com/craterdog-bali/js-bali-nebula-services/wiki/HTTP-Method-Semantics
 */
const bali = require('bali-component-framework').api();


// PUBLIC CLASSES

const HTTPEngine = function(notary, storage, handlers, debug) {
    this.debug = debug || 0;  // default is off
    const protocol = notary.getProtocols().getItem(-1);  // most recent protocol

    // PRIVATE ASPECTS

    const PUT = 'PUT';
    const POST = 'POST';
    const HEAD = 'HEAD';
    const GET = 'GET';
    const DELETE = 'DELETE';

    const STYLE = 'https://bali-nebula.net/static/styles/BDN.css';


    // PUBLIC ASPECTS

    this.processRequest = async function(request) {
        var parameters;
        try {
            // extract the request parameters
            parameters = decodeRequest(request);
            if (this.debug > 2) console.log('Request: ' + bali.catalog(parameters));
            if (!parameters) {
                if (this.debug > 2) console.log('The service received a badly formed request.');
                return this.encodeError(parameters, 400, 'application/bali', 'Bad Request');
            }

            // validate the request type
            if (!handlers[parameters.type]) {
                if (this.debug > 2) console.log('The service received an invalid request type: ' + parameters.type);
                return this.encodeError(parameters, 400, parameters.resultType, 'Bad Request');
            }

            // validate the request method
            if (!handlers[parameters.type][parameters.method]) {
                if (this.debug > 2) console.log('The service received an invalid request method: ' + parameters.method);
                return this.encodeError(parameters, 405, parameters.resultType, 'Method Not Allowed');
            }

            // validate any credentials that were passed with the request (there may not be any)
            if (!(await validCredentials(parameters))) {
                if (this.debug > 2) console.log('Invalid credentials were passed with the request.');
                return this.encodeError(parameters, 401, parameters.resultType, 'Invalid Credentials');
            }

            // handle the request (must explicitly pass in 'this')
            const response = await handlers[parameters.type][parameters.method].call(this, parameters);
            if (this.debug > 2) console.log('Response: ' + bali.catalog(response));
            return response;

        } catch (cause) {
            if (this.debug > 0) {
                const exception = bali.exception({
                    $module: '/bali/services/HTTPEngine',
                    $procedure: '$processRequest',
                    $exception: '$badRequest',
                    $parameters: parameters,
                    $text: 'The processing of the HTTP request failed.'
                }, cause);
                console.log('Response: 400 (Bad Request)');
                console.log(exception.toString());
            }
            return this.encodeError(parameters, 400, parameters.resultType, 'Bad Request');
        }
    };


    this.extractName = function(parameters) {
        const name = bali.component('/' + parameters.resource.join('/'));
        return name;
    };


    this.extractResource = function(parameters) {
        const tag = bali.component('#' + parameters.resource[0]);
        const version = bali.component(parameters.resource[1]);
        const digest = parameters.digest;
        const citation = bali.catalog({
            $protocol: protocol,
            $tag: tag,
            $version: version,
            $digest: digest
        }, {
            $type: '/nebula/notary/Citation/v1'
        });
        return citation;
    };


    this.extractSubresource = function(parameters) {
        const tag = bali.component('#' + parameters.resource[2]);
        const version = bali.component(parameters.resource[3]);
        const digest = parameters.subdigest;
        const citation = bali.catalog({
            $protocol: protocol,
            $tag: tag,
            $version: version,
            $digest: digest
        }, {
            $type: '/nebula/notary/Citation/v1'
        });
        return citation;
    };


    this.encodeError = function(parameters, status, resultType, message) {
        const error = bali.exception({
            $module: '/bali/services/HTTPEngine',
            $status: status,
            $text: message
        }, bali.pattern.NONE);
        resultType = resultType || 'application/bali';
        const response = {
            headers: {
            },
            statusCode: status,
            body: (resultType === 'text/html') ?
                bali.html(error, this.extractName(parameters), STYLE) : error.toString()
        };
        response.headers['content-length'] = response.body.length;
        response.headers['content-type'] = resultType;
        response.headers['cache-control'] = 'no-store';
        if (status === 401) {
            response.headers['www-authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
        }
        return response;
    };


    this.encodeSuccess = function(parameters, status, resultType, component, cacheControl) {
        const response = {
            headers: {
            },
            statusCode: status
        };
        resultType = resultType || 'application/bali';
        response.body = (resultType === 'text/html') ?
            bali.html(component, this.extractName(parameters), STYLE) : component.toString();
        response.headers['content-length'] = response.body.length;
        response.headers['content-type'] = resultType;
        response.headers['cache-control'] = cacheControl;
        return response;
    };


    /*
     * This method enforces strict symantics on the five methods supported by all resources that
     * are managed by the Bali Nebula™ services.  For details on the symantics see this page:
     * https://github.com/craterdog-bali/js-bali-nebula-services/wiki/HTTP-Method-Semantics
     */
    this.encodeResponse = async function(parameters, authority, result, isMutable) {
        const exists = !!result;
        const authenticated = isAuthenticated(parameters);
        const authorized = await isAuthorized(parameters, authority);
        const method = parameters.method;
        const resultType = parameters.resultType || 'application/bali';
        const document = parameters.body;
        var citation = document ? await citeComponent(document) : undefined;
        if (![PUT, POST, HEAD, GET, DELETE].includes(method)) {
            // Unsupported Method
            return this.encodeError(parameters, 405, parameters.resultType, 'Method Not Allowed');
        }
        if (!authenticated) {
            if (!exists || !authorized || ![HEAD, GET].includes(method)) {
                // Not Authenticated
                const error = this.encodeError(parameters, 401, resultType, 'Not Authenticated');
                return error;
            }
            // Existing Public Resource
            switch (method) {
                case HEAD:
                    const response = this.encodeSuccess(parameters, 200, resultType, result, 'public, immutable');
                    response.body = undefined;
                    return response;
                case GET:
                    return this.encodeSuccess(parameters, 200, resultType, result, 'public, immutable');
            }
        }
        if (!exists) {
            switch (method) {
                // Authenticated and no Existing Resource
                case PUT:
                    const tag = citation.getAttribute('$tag').toString().slice(1);  // remove leading '#'
                    const version = citation.getAttribute('$version');
                    const response = this.encodeSuccess(parameters, 201, resultType, citation, 'no-store');
                    return response;
                default:
                    return this.encodeError(parameters, 404, resultType, 'Not Found');
            }
        }
        if (!authorized) {
            // Authenticated, Existing Resource, but not Authorized
            return this.encodeError(parameters, 403, resultType, 'Not Authorized');
        }
        // Authenticated, Existing Resource, and Authorized
        const cacheControl = isMutable ? 'no-store' : 'private, immutable';
        switch (method) {
            case PUT:
                if (isMutable) {
                    return this.encodeSuccess(parameters, 200, resultType, citation, 'no-store');
                }
                return this.encodeError(parameters, 409, resultType, 'Resource Conflict');
            case POST:
                // post a new document to the parent resource specified by the URI
                var response = this.encodeSuccess(parameters, 201, resultType, citation, 'no-store');
                return response;
            case HEAD:
                response = this.encodeSuccess(parameters, 200, resultType, result, cacheControl);
                response.body = undefined;
                return response;
            case GET:
                return this.encodeSuccess(parameters, 200, resultType, result, cacheControl);
            case DELETE:
                return this.encodeSuccess(parameters, 200, resultType, result, 'no-store');
        }
    };


    // PRIVATE FUNCTIONS

    const decodeRequest = function(request) {
        const method = request.httpMethod || request.method;
        const path = request.path;
        var credentials = request.headers['nebula-credentials'] || request.headers['Nebula-Credentials'];
        if (credentials) {
            const decoder = bali.decoder();
            credentials = Buffer.from(decoder.base32Decode(credentials)).toString('utf8');
            credentials = bali.component(credentials);
        }

        var digest = request.headers['nebula-digest'] || request.headers['Nebula-Digest'];
        if (digest) {
            digest = bali.component("'" + digest + "'");
        }

        var subdigest = request.headers['nebula-subdigest'] || request.headers['Nebula-Subdigest'];
        if (subdigest) {
            subdigest = bali.component("'" + subdigest + "'");
        }

        var resultType = request.headers['accept'] || request.headers['Accept'];
        if (resultType !== 'application/bali') resultType = 'text/html';  // for a browser

        const tokens = path.split('/');
        const service = tokens[1];
        const type = tokens[2];
        const resource = tokens.slice(3);
        const body = (request.body && (request.body.constructor.name === 'String')) ? bali.component(request.body) : undefined;

        const parameters = {
            credentials: credentials,
            method: method,
            resultType: resultType,
            service: service,
            type: type,
            resource: resource,
            digest: digest,
            subdigest: subdigest,
            body: body
        };
        return parameters;
    };


    const validCredentials = async function(parameters) {
        const credentials = parameters.credentials;
        if (credentials) {
            if (credentials.isType('/bali/collections/Catalog')) {
                const citation = credentials.getAttribute('$certificate');
                // if the certificate doesn't yet exist, there is a self-signed certificate in the body
                var certificate = (await storage.readContract(citation)) || parameters.body;
                if (await notary.validContract(credentials, certificate)) {
                    parameters.account = certificate.getAttribute('$account');
                    return true;  // the credentials are valid
                }
            }
            return false;  // the credentials are invalid
        }
        return true;  // no credentials were passed in, proceed anonymously
    };


    const isAuthenticated = function(parameters) {
        return !!parameters.account;
    };


    const isAuthorized = async function(parameters, authority) {
        if (authority && authority.isComponent && authority.isType('/bali/collections/Catalog')) {
            // check for a citation rather than a document
            const type = authority.getParameter('$type');
            if (type.toString() === '/nebula/notary/Citation/v1') {
                return true;  // all citations are public by default
            }

            // check the account of the authority
            const account = authority.getAttribute('$account');
            if (account && bali.areEqual(account, parameters.account)) {
                return true;  // the authority is always authorized
            }

            // check the permissions on the notarized document
            const document = authority.getAttribute('$document');
            if (document) authority = document;
            const permissions = authority.getParameter('$permissions');
            if (permissions.toString() === '/nebula/permissions/public/v1') {
                return true;  // publicly available
            }
            // TODO: load in the real permissions and check them
        }
        return false;  // otherwise the account is not authorized to perform the request
    };


    const citeComponent = async function(component) {
        const document = component.getAttribute('$document');
        if (document) {
            component = document;
        }
        const type = component.getParameter('$type');
        if (type.toString() !== '/nebula/notary/Citation/v1') {
            component = await notary.citeDocument(component);
        }
        return component;
    };

    return this;

};
HTTPEngine.prototype.constructor = HTTPEngine;
exports.HTTPEngine = HTTPEngine;
