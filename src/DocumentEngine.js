/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

const HTTPEngine = require('./utilities/HTTPEngine').HTTPEngine;


const DocumentEngine = function(notary, storage, debug) {
    const bali = require('bali-component-framework').api(debug);
    const handlers = {

        names: {
            HEAD: async function(parameters) {
                const name = this.extractName(parameters);
                const existing = await storage.readName(name);
                return await this.encodeResponse(parameters, existing, existing, false);  // body is stripped off
            },

            GET: async function(parameters) {
                const name = this.extractName(parameters);
                const existing = await storage.readName(name);
                return await this.encodeResponse(parameters, existing, existing, false);
            },

            PUT: async function(parameters) {
                const name = this.extractName(parameters);
                const citation = parameters.body;
                const existing = await storage.readName(name);
                const response = await this.encodeResponse(parameters, existing, existing, false);
                if (response.statusCode === 201) await storage.writeName(name, citation);
                return response;
            }
        },

        documents: {
            HEAD: async function(parameters) {
                const citation = this.extractResource(parameters);
                const existing = await storage.readDocument(citation);
                return await this.encodeResponse(parameters, existing, existing, true);  // body is stripped off
            },

            GET: async function(parameters) {
                const citation = this.extractResource(parameters);
                const existing = await storage.readDocument(citation);
                return await this.encodeResponse(parameters, existing, existing, true);
            },

            PUT: async function(parameters) {
                const citation = this.extractResource(parameters);
                const document = parameters.body;
                const existing = await storage.readDocument(citation);
                const response = await this.encodeResponse(parameters, existing, existing, true);
                if (response.statusCode < 300) await storage.writeDocument(document);
                return response;
            },

            DELETE: async function(parameters) {
                const citation = this.extractResource(parameters);
                const existing = await storage.readDocument(citation);
                const response = await this.encodeResponse(parameters, existing, existing, true);
                if (response.statusCode === 200) await storage.deleteDocument(citation);
                return response;
            }
        },

        contracts: {
            HEAD: async function(parameters) {
                const citation = this.extractResource(parameters);
                const existing = await storage.readContract(citation);
                return await this.encodeResponse(parameters, existing, existing, false);  // body is stripped off
            },

            GET: async function(parameters) {
                const citation = this.extractResource(parameters);
                const existing = await storage.readContract(citation);
                return await this.encodeResponse(parameters, existing, existing, false);
            },

            PUT: async function(parameters) {
                const citation = this.extractResource(parameters);
                const document = parameters.body;
                const existing = await storage.readContract(citation);
                const response = await this.encodeResponse(parameters, existing, existing, false);
                if (response.statusCode === 201) {
                    await storage.writeContract(document);
                }
                return response;
            }
        },

        messages: {
            HEAD: async function(parameters) {
                const bag = this.extractResource(parameters);
                const authority = await storage.readContract(bag);
                const count = bali.number(await storage.messageCount(bag));
                return await this.encodeResponse(parameters, authority, count.getMagnitude() > 0 ? count : undefined, true);  // body is stripped off
            },

            GET: async function(parameters) {
                const bag = this.extractResource(parameters);
                const authority = await storage.readContract(bag);
                const count = bali.number(await storage.messageCount(bag));
                return await this.encodeResponse(parameters, authority, count, true);
            },

            PUT: async function(parameters) {
                const bag = this.extractResource(parameters);
                const authority = await storage.readContract(bag);
                const message = parameters.body;
                const response = await this.encodeResponse(parameters, authority, message, true);
                if (response.statusCode === 200) {
                    try {
                        await storage.returnMessage(bag, message);
                    } catch (exception) {
                        return this.encodeError(409, parameters.responseType, 'Resource Conflict');
                    }
                }
                return response;
            },

            POST: async function(parameters) {
                const bag = this.extractResource(parameters);
                const authority = await storage.readContract(bag);
                const message = parameters.body;
                const response = await this.encodeResponse(parameters, authority, message, true);
                if (response.statusCode === 201) {
                    try {
                        await storage.addMessage(bag, message);
                    } catch (exception) {
                        return this.encodeError(409, parameters.responseType, 'Resource Conflict');
                    }
                }
                return response;
            },

            DELETE: async function(parameters) {
                const bag = this.extractResource(parameters);
                const authority = await storage.readContract(bag);
                var message;
                if (authority) {
                    if (parameters.resource.length === 2) {
                        // borrow a random message from the bag identified by the resource
                        message = await storage.removeMessage(bag);
                    } else {
                        // permanently delete the specified message identified by the resource from its bag
                        try {
                            const citation = this.extractSubresource(parameters);
                            message = await storage.deleteMessage(bag, citation);
                        } catch (exception) {
                            return this.encodeError(409, parameters.responseType, 'Resource Conflict');
                        }
                    }
                }
                return await this.encodeResponse(parameters, authority, message, true);
            }
        }

    };
    HTTPEngine.call(this, notary, storage, handlers, debug);
    return this;
};
DocumentEngine.prototype = Object.create(HTTPEngine.prototype);
DocumentEngine.prototype.constructor = DocumentEngine;
exports.DocumentEngine = DocumentEngine;
