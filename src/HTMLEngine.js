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
 * This class implements an HTTP engine that manages browser access to a document repository.
 */
const bali = require('bali-component-framework').api();
const HTTPEngine = require('./utilities/HTTPEngine').HTTPEngine;


const HTMLEngine = function(notary, storage, debug) {
    const handlers = {
        names: {
            HEAD: async function(parameters) {
                const name = this.extractName(parameters);
                const existing = await storage.readName(name);
                return await this.encodeResponse(parameters, existing, existing, false);  // body is stripped off
            },
            GET: async function(parameters) {
                const name = this.extractName(parameters);
                const citation = await storage.readName(name);
                const existing = await storage.readContract(citation);
                return await this.encodeResponse(parameters, existing, existing, false);
            },
            PUT: async function(parameters) {
                return this.encodeError(parameters, 401, parameters.resultType, 'Not Authenticated');
            }
        },

        documents: {
            HEAD: async function(parameters) {
                return this.encodeError(parameters, 401, parameters.resultType, 'Not Authenticated');
            },
            GET: async function(parameters) {
                return this.encodeError(parameters, 401, parameters.resultType, 'Not Authenticated');
            },
            PUT: async function(parameters) {
                return this.encodeError(parameters, 401, parameters.resultType, 'Not Authenticated');
            },
            DELETE: async function(parameters) {
                return this.encodeError(parameters, 401, parameters.resultType, 'Not Authenticated');
            }
        },

        contracts: {
            HEAD: async function(parameters) {
                return this.encodeError(parameters, 401, parameters.resultType, 'Not Authenticated');
            },
            GET: async function(parameters) {
                return this.encodeError(parameters, 401, parameters.resultType, 'Not Authenticated');
            },
            PUT: async function(parameters) {
                return this.encodeError(parameters, 401, parameters.resultType, 'Not Authenticated');
            }
        },

        messages: {
            HEAD: async function(parameters) {
                return this.encodeError(parameters, 401, parameters.resultType, 'Not Authenticated');
            },
            GET: async function(parameters) {
                return this.encodeError(parameters, 401, parameters.resultType, 'Not Authenticated');
            },
            PUT: async function(parameters) {
                return this.encodeError(parameters, 401, parameters.resultType, 'Not Authenticated');
            },
            POST: async function(parameters) {
                return this.encodeError(parameters, 401, parameters.resultType, 'Not Authenticated');
            },
            DELETE: async function(parameters) {
                return this.encodeError(parameters, 401, parameters.resultType, 'Not Authenticated');
            }
        }

    };
    HTTPEngine.call(this, notary, storage, handlers, debug);
    return this;
};
HTMLEngine.prototype = Object.create(HTTPEngine.prototype);
HTMLEngine.prototype.constructor = HTMLEngine;
exports.HTMLEngine = HTMLEngine;
