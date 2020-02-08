/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

const debug = 2;  // [0..3]
const bali = require('bali-component-framework').api(debug);
const notary = require('bali-digital-notary').service(debug);
const directory = 'test/config/';
const repository = require('../').test(notary, directory, debug);
const engine = require('../').engine(notary, repository, debug);
const express = require("express");
const bodyParser = require('body-parser');


// PRIVATE FUNCTIONS

if (debug > 2) console.log('Loading the Test Repository Service');

const process = async function(request, response) {
    const result = await handler(request);
    response.writeHead(result.statusCode, result.statusMessage, result.headers);
    response.end(result.body);
};


const handler = async function(request) {
    var parameters;
    try {
        // extract the request parameters
        parameters = engine.decodeRequest(request);
        if (!parameters) {
            if (debug > 2) console.log('The service received a badly formed request.');
            return engine.encodeError(400, 'text/html', 'Bad Request');
        }

        // validate the request type
        if (!handleRequest[parameters.type]) {
            if (debug > 2) console.log('The service received an invalid request type: ' + parameters.type);
            return engine.encodeError(400, parameters.responseType, 'Bad Request');
        }

        // validate the request method
        if (!handleRequest[parameters.type][parameters.method]) {
            if (debug > 2) console.log('The service received an invalid request method: ' + parameters.method);
            return engine.encodeError(405, parameters.responseType, 'Method Not Allowed');
        }

        // validate any credentials that were passed with the request (there may not be any)
        if (!(await engine.validCredentials(parameters))) {
            if (debug > 2) console.log('Invalid credentials were passed with the request.');
            return engine.encodeError(401, parameters.responseType, 'Invalid Credentials');
        }

        // handle the request
        const response = await handleRequest[parameters.type][parameters.method](parameters);
        if (debug > 2) console.log('Response: ' + bali.catalog(response));
        return response;

    } catch (cause) {
        if (debug > 0) {
            const exception = bali.exception({
                $module: '/bali/services/TestRepository',
                $procedure: '$handler',
                $exception: '$processingFailed',
                $parameters: parameters,
                $text: 'The processing of the HTTP request failed.'
            }, cause);
            console.log(exception.toString());
            console.log('Response: 503 (Service Unavailable)');
        }
        return engine.encodeError(503, 'Service Unavailable');
    }
};


const handleRequest = {

    names: {
        HEAD: async function(parameters) {
            const name = engine.extractName(parameters);
            const existing = await repository.readName(name);
            return await engine.encodeResponse(parameters, existing, existing, false);  // body is stripped off
        },

        GET: async function(parameters) {
            const name = engine.extractName(parameters);
            const existing = await repository.readName(name);
            return await engine.encodeResponse(parameters, existing, existing, false);
        },

        PUT: async function(parameters) {
            const name = engine.extractName(parameters);
            const citation = parameters.body;
            const existing = await repository.readName(name);
            const response = await engine.encodeResponse(parameters, existing, existing, false);
            if (response.statusCode === 201) await repository.writeName(name, citation);
            return response;
        },

        POST: async function(parameters) {
            return engine.encodeError(405, parameters.responseType, 'Method Not Allowed');
        },

        DELETE: async function(parameters) {
            return engine.encodeError(405, parameters.responseType, 'Method Not Allowed');
        }
    },

    drafts: {
        HEAD: async function(parameters) {
            const citation = engine.extractCitation(parameters);
            const existing = await repository.readDraft(citation);
            return await engine.encodeResponse(parameters, existing, existing, true);  // body is stripped off
        },

        GET: async function(parameters) {
            const citation = engine.extractCitation(parameters);
            const existing = await repository.readDraft(citation);
            return await engine.encodeResponse(parameters, existing, existing, true);
        },

        PUT: async function(parameters) {
            const citation = engine.extractCitation(parameters);
            const draft = parameters.body;
            const existing = await repository.readDraft(citation);
            const response = await engine.encodeResponse(parameters, existing, existing, true);
            if (response.statusCode < 300) await repository.writeDraft(draft);
            return response;
        },

        POST: async function(parameters) {
            return engine.encodeError(405, parameters.responseType, 'Method Not Allowed');
        },

        DELETE: async function(parameters) {
            const citation = engine.extractCitation(parameters);
            const existing = await repository.readDraft(citation);
            const response = await engine.encodeResponse(parameters, existing, existing, true);
            if (response.statusCode === 200) await repository.deleteDraft(citation);
            return response;
        }
    },

    documents: {
        HEAD: async function(parameters) {
            const citation = engine.extractCitation(parameters);
            const existing = await repository.readDocument(citation);
            return await engine.encodeResponse(parameters, existing, existing, false);  // body is stripped off
        },

        GET: async function(parameters) {
            const citation = engine.extractCitation(parameters);
            const existing = await repository.readDocument(citation);
            return await engine.encodeResponse(parameters, existing, existing, false);
        },

        PUT: async function(parameters) {
            const citation = engine.extractCitation(parameters);
            const document = parameters.body;
            const existing = await repository.readDocument(citation);
            const response = await engine.encodeResponse(parameters, existing, existing, false);
            if (response.statusCode === 201) {
                await repository.writeDocument(document);
            }
            return response;
        },

        POST: async function(parameters) {
            return engine.encodeError(405, parameters.responseType, 'Method Not Allowed');
        },

        DELETE: async function(parameters) {
            return engine.encodeError(405, parameters.responseType, 'Method Not Allowed');
        }
    },

    messages: {
        HEAD: async function(parameters) {
            const bag = engine.extractCitation(parameters);
            const authority = await repository.readDocument(bag);
            const count = bali.number(await repository.messageCount(bag));
            return await engine.encodeResponse(parameters, authority, count.getMagnitude() > 0 ? count : undefined, true);  // body is stripped off
        },

        GET: async function(parameters) {
            const bag = engine.extractCitation(parameters);
            const authority = await repository.readDocument(bag);
            const count = bali.number(await repository.messageCount(bag));
            return await engine.encodeResponse(parameters, authority, count, true);
        },

        PUT: async function(parameters) {
            const bag = engine.extractCitation(parameters);
            const authority = await repository.readDocument(bag);
            const message = parameters.body;
            const response = await engine.encodeResponse(parameters, authority, message, true);
            if (response.statusCode === 200) {
                await repository.returnMessage(bag, message);
            } else if (response.statusCode === 201) {
                return engine.encodeError(404, parameters.responseType, 'The bag does not exist.');
            }
            return response;
        },

        POST: async function(parameters) {
            const bag = engine.extractCitation(parameters);
            const authority = await repository.readDocument(bag);
            const message = parameters.body;
            const response = await engine.encodeResponse(parameters, authority, message, true);
            if (response.statusCode === 201) {
                await repository.addMessage(bag, message);
            }
            return response;
        },

        DELETE: async function(parameters) {
            const bag = engine.extractCitation(parameters);
            const authority = await repository.readDocument(bag);
            var result;
            if (authority) {
                if (parameters.resources.length === 2) {
                    // borrow a random message from the bag
                    result = await repository.borrowMessage(bag);
                } else {
                    // permanently delete the specified message from the bag
                    const citation = engine.extractSecondCitation(parameters);
                    result = bali.probability(await repository.deleteMessage(bag, citation));
                }
            }
            return await engine.encodeResponse(parameters, authority, result, true);
        }
    }

};


// SERVICE INITIALIZATION

const router = express.Router();
router.all(':identifier([a-zA-Z0-9/\\.]+)', process);

const service = express();
service.use(bodyParser.text({ type: 'application/bali' }));
service.use('', router);

service.listen(3000, function() {
    var message = 'Service: Server running on port 3000';
    if (debug > 1) console.log(message);
});

