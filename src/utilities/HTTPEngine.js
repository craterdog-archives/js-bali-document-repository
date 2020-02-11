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

// PUBLIC CLASSES

const HTTPEngine = function(notary, repository, handlers, debug) {
    if (debug === null || debug === undefined) debug = 0;  // default is off
    const bali = require('bali-component-framework').api(debug);
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
            if (!parameters) {
                if (debug > 2) console.log('The service received a badly formed request.');
                return this.encodeError(400, 'text/html', 'Bad Request');
            }

            // validate the request type
            if (!handlers[parameters.type]) {
                if (debug > 2) console.log('The service received an invalid request type: ' + parameters.type);
                return this.encodeError(400, parameters.responseType, 'Bad Request');
            }

            // validate the request method
            if (!handlers[parameters.type][parameters.method]) {
                if (debug > 2) console.log('The service received an invalid request method: ' + parameters.method);
                return this.encodeError(405, parameters.responseType, 'Method Not Allowed');
            }

            // validate any credentials that were passed with the request (there may not be any)
            if (!(await validCredentials(parameters))) {
                if (debug > 2) console.log('Invalid credentials were passed with the request.');
                return this.encodeError(401, parameters.responseType, 'Invalid Credentials');
            }

            // handle the request (must explicitly pass in 'this')
            const response = await handlers[parameters.type][parameters.method].call(this, parameters);
            if (debug > 2) console.log('Response: ' + bali.catalog(response));
            return response;

        } catch (cause) {
            if (debug > 0) {
                const exception = bali.exception({
                    $module: '/bali/services/HTTPEngine',
                    $procedure: '$processRequest',
                    $exception: '$serverBug',
                    $parameters: parameters,
                    $text: 'The processing of the HTTP request failed.'
                }, cause);
                console.log(exception.toString());
                console.log('Response: 503 (Service Unavailable)');
            }
            return this.encodeError(503, 'Service Unavailable');
        }
    };


    this.extractName = function(parameters) {
        const name = bali.component('/' + parameters.resources.join('/'));
        return name;
    };


    this.extractCitation = function(parameters) {
        const tag = bali.component('#' + parameters.resources[0]);
        const version = bali.component(parameters.resources[1]);
        const digest = parameters.digest;
        const citation = bali.catalog({
            $protocol: protocol,
            $tag: tag,
            $version: version,
            $digest: digest
        }, {
            $type: '/bali/notary/Citation/v1'
        });
        return citation;
    };


    this.extractSecondCitation = function(parameters) {
        const tag = bali.component('#' + parameters.resources[2]);
        const version = bali.version();
        const digest = parameters.digest2;
        const citation = bali.catalog({
            $protocol: protocol,
            $tag: tag,
            $version: version,
            $digest: digest
        }, {
            $type: '/bali/notary/Citation/v1'
        });
        return citation;
    };


    this.encodeError = function(status, resultType, message) {
        const error = bali.catalog(
            {
                $status: status,
                $message: message
            }, {
                $type: '/bali/services/Error/v1'
            }
        );
        const response = {
            headers: {
            },
            statusCode: status,
            body: (resultType === 'text/html') ? error.toHTML(STYLE) : error.toBDN()
        };
        response.headers['content-length'] = response.body.length;
        response.headers['content-type'] = resultType;
        response.headers['cache-control'] = 'no-store';
        if (status === 401) {
            response.headers['www-authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
        }
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
            return this.encodeError(405, parameters.responseType, 'Method Not Allowed');
        }
        if (!authenticated) {
            if (!exists || !authorized || ![HEAD, GET].includes(method)) {
                // Not Authenticated
                const error = this.encodeError(401, resultType, 'Not Authenticated');
                return error;
            }
            // Existing Public Resource
            switch (method) {
                case HEAD:
                    const response = encodeSuccess(200, resultType, result, 'public, immutable');
                    response.body = undefined;
                    return response;
                case GET:
                    return encodeSuccess(200, resultType, result, 'public, immutable');
            }
        }
        if (!exists) {
            switch (method) {
                // Authenticated and no Existing Resource
                case PUT:
                    const tag = citation.getValue('$tag').toString().slice(1);  // remove leading '#'
                    const version = citation.getValue('$version');
                    const response = encodeSuccess(201, resultType, citation, 'no-store');
                    return response;
                default:
                    return this.encodeError(404, resultType, 'Not Found');
            }
        }
        if (!authorized) {
            // Authenticated, Existing Resource, but not Authorized
            return this.encodeError(403, resultType, 'Not Authorized');
        }
        // Authenticated, Existing Resource, and Authorized
        const cacheControl = isMutable ? 'no-store' : 'private, immutable';
        switch (method) {
            case PUT:
                if (isMutable) {
                    return encodeSuccess(200, resultType, citation, 'no-store');
                }
                return this.encodeError(409, resultType, 'Resource Conflict');
            case POST:
                // post a new document to the parent resource specified by the URI
                const tag = citation.getValue('$tag').toString().slice(1);  // remove leading '#'
                const version = citation.getValue('$version');
                var response = encodeSuccess(201, resultType, citation, 'no-store');
                return response;
            case HEAD:
                response = encodeSuccess(200, resultType, result, cacheControl);
                response.body = undefined;
                return response;
            case GET:
                return encodeSuccess(200, resultType, result, cacheControl);
            case DELETE:
                return encodeSuccess(200, resultType, result, 'no-store');
        }
    };


    // PRIVATE FUNCTIONS

    const decodeRequest = function(request) {
        const method = request.httpMethod || request.method;
        const path = request.path;
        if (debug > 1) console.log('Request ' + method + ': ' + path);

        var credentials = request.headers['nebula-credentials'] || request.headers['Nebula-Credentials'];
        if (credentials) {
            const decoder = bali.decoder(0, debug);
            credentials = Buffer.from(decoder.base32Decode(credentials)).toString('utf8');
            credentials = bali.component(credentials);
        }

        var digest = request.headers['nebula-digest'] || request.headers['Nebula-Digest'];
        if (digest) {
            digest = bali.component("'" + digest + "'");
        }

        const resultType = request.headers['accept'] || request.headers['Accept'] || 'text/html';

        const tokens = path.split('/');
        const service = tokens[1];
        const type = tokens[2];
        const resources = tokens.slice(3);
        const body = (request.body && (request.body.constructor.name === 'String')) ? bali.component(request.body) : undefined;

        const parameters = {
            credentials: credentials,
            method: method,
            resultType: resultType,
            service: service,
            type: type,
            resources: resources,
            digest: digest,
            body: body
        };
        if (debug > 2) console.log('Parameters: ' + bali.catalog(parameters));
        return parameters;
    };


    const validCredentials = async function(parameters) {
        const credentials = parameters.credentials;
        if (credentials) {
            if (credentials.isType('/bali/collections/Catalog')) {
                const citation = credentials.getValue('$certificate');
                // if the certificate doesn't yet exist, there is a self-signed certificate in the body
                var certificate = (await repository.readDocument(citation)) || parameters.body;
                if (await notary.validDocument(credentials, certificate)) {
                    parameters.account = certificate.getValue('$account');
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
            // check the account of the authority
            const account = authority.getValue('$account');
            if (account && account.isEqualTo(parameters.account)) return true;  // the authority is always authorized

            // check for a citation rather than a notarized document
            const content = authority.getValue('$content');
            if (!content) return true;  // all citations are public by default

            // check the permissions on the notarized document
            const permissions = content.getParameter('$permissions');
            if (permissions.toString() === '/bali/permissions/public/v1') return true;  // publicly available
            // TODO: load in the real permissions and check them
        }
        return false;  // otherwise the account is not authorized to perform the request
    };


    const encodeSuccess = function(status, resultType, component, cacheControl) {
        const response = {
            headers: {
            },
            statusCode: status
        };
        response.body = (resultType === 'text/html') ? component.toHTML(STYLE) : component.toBDN();
        response.headers['content-length'] = response.body.length;
        response.headers['content-type'] = resultType;
        response.headers['cache-control'] = cacheControl;
        return response;
    };


    const citeComponent = async function(component) {
        if (component.isType('/bali/collections/Catalog') && component.getValue('$content')) {
            component = await notary.citeDocument(component);
        }
        return component;
    };

    return this;

};
HTTPEngine.prototype.constructor = HTTPEngine;
exports.HTTPEngine = HTTPEngine;
