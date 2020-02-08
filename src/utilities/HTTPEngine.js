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

const HTTPEngine = function(notary, repository, debug) {
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


    // PUBLIC ASPECTS

    this.decodeRequest = function(request) {
        const method = request.httpMethod || request.method;
        const path = request.path;
        if (debug > 0) console.log('Request ' + method + ': ' + path);

        var credentials = request.headers['nebula-credentials'];
        if (credentials) {
            const decoder = bali.decoder(0, debug);
            credentials = Buffer.from(decoder.base32Decode(credentials)).toString('utf8');
            credentials = bali.component(credentials);
        }

        var digest = request.headers['nebula-digest'];
        if (digest) {
            digest = bali.component("'" + digest + "'");
        }

        const resultType = request.headers['accept'] || 'text/html';

        const tokens = path.split('/');
        const service = tokens[1];
        const type = tokens[2];
        const resources = tokens.slice(3);
        const body = !(request.body instanceof Object) ? bali.component(request.body) : undefined;

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


    this.validCredentials = async function(parameters) {
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


    this.encodeError = function(status, resultType, message) {
        const error = bali.catalog(
            {
                $status: status,
                $message: message
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
            return this.encodeError(405, resultType, 'The requested method is not supported by this service.');
        }
        if (!authenticated) {
            if (!exists || !authorized || ![HEAD, GET].includes(method)) {
                // Not Authenticated
                const error = this.encodeError(401, resultType, 'The client must be authenticated to perform the requested method.');
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
                    return this.encodeError(404, resultType, 'The specified resource does not exist.');
            }
        }
        if (!authorized) {
            // Authenticated, Existing Resource, but not Authorized
            return this.encodeError(403, resultType, 'The client is not authorized to access the specified resource.');
        }
        // Authenticated, Existing Resource, and Authorized
        const cacheControl = isMutable ? 'no-store' : 'private, immutable';
        switch (method) {
            case PUT:
                if (isMutable) {
                    return encodeSuccess(200, resultType, citation, 'no-store');
                }
                return this.encodeError(409, resultType, 'The specified resource already exists.');
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

    return this;

};
HTTPEngine.prototype.constructor = HTTPEngine;
exports.HTTPEngine = HTTPEngine;