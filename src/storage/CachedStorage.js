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
 * This class implements a storage mechanism wrapper that caches (in memory) all documents
 * that have been retrieved from the wrapped storage mechanism.  The documents are assumed
 * to be immutable so no cache consistency issues exist.
 */


// DOCUMENT REPOSITORY

/**
 * This function creates a new instance of a cached storage mechanism.  A remote storage
 * mechanism is passed in and is used as the persistent store for all documents.
 *
 * @param {Object} storage The actual storage mechanism that maintains documents.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new cached storage mechanism.
 */
const CachedStorage = function(storage, debug) {
    // validate the arguments
    if (debug === null || debug === undefined) debug = 0;  // default is off
    const bali = require('bali-component-framework').api(debug);
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/repositories/CachedStorage', '$CachedStorage', '$storage', storage, [
            '/javascript/Object'
        ]);
    }

    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/repositories/CachedStorage',
            $storage: storage.toString()
        });
        return catalog.toString();
    };

    this.nameExists = async function(name) {
        // check the cache first
        const key = generateKey(name);
        if (cache.names.read(key)) return true;
        // not found so we must check the backend storage
        return await storage.nameExists(name);
    };

    this.readName = async function(name) {
        // check the cache first
        const key = generateKey(name);
        var document = cache.names.read(key);
        if (!document) {
            // not found so we must read from the backend storage
            document = await storage.readName(name);
            // add the document to the cache
            if (document) cache.names.write(name, document);
        }
        return document;
    };

    this.writeName = async function(name, citation) {
        // pass-through, citations are not cached
        return await storage.writeName(name, citation);
    };

    this.draftExists = async function(citation) {
        // pass-through, drafts are not cached
        return await storage.draftExists(citation);
    };

    this.readDraft = async function(citation) {
        // pass-through, drafts are not cached
        return await storage.readDraft(citation);
    };

    this.writeDraft = async function(draft) {
        // pass-through, drafts are not cached
        return await storage.writeDraft(draft);
    };

    this.deleteDraft = async function(citation) {
        // pass-through, drafts are not cached
        return await storage.deleteDraft(citation);
    };

    this.documentExists = async function(citation) {
        // check the cache
        const key = generateKey(citation);
        if (cache.documents.read(key)) return true;
        // not found so we must check the backend storage
        return await storage.documentExists(citation);
    };

    this.readDocument = async function(citation) {
        // check the cache
        const key = generateKey(citation);
        var document = cache.documents.read(key);
        if (!document) {
            // not found so we must read from the backend storage
            document = await storage.readDocument(citation);
            // add the document to the cache
            if (document) cache.documents.write(key, document);
        }
        return document;
    };

    this.writeDocument = async function(document) {
        // add the document to the backend storage
        const citation = await storage.writeDocument(document);
        // cache the document
        const key = generateKey(citation);
        cache.documents.write(key, document);
        return citation;
    };

    this.messageCount = async function(bag) {
        // pass-through, messages are not cached
        return await storage.messageCount(bag);
    };

    this.addMessage = async function(bag, document) {
        // pass-through, messages are not cached
        return await storage.addMessage(bag, document);
    };

    this.removeMessage = async function(bag) {
        // pass-through, messages are not cached
        return await storage.removeMessage(bag);
    };

    const generateKey = function(identifier) {
        if (identifier.isComponent) {
            const tag = identifier.getValue('$tag');
            const version = identifier.getValue('$version');
            return tag.toString().slice(1) + '/' + version;
        }
        return identifier.toString().slice(1);
    };

    return this;
};
CachedStorage.prototype.constructor = CachedStorage;
exports.CachedStorage = CachedStorage;


// DOCUMENT CACHE

const Cache = function(capacity) {

    const documents = new Map();

    this.read = function(name) {
        return documents.get(name);
    };

    this.write = function(name, document) {
        if (documents.size > capacity) {
            const oldest = documents.keys().next().getValue();
            documents.delete(oldest);
        }
        documents.set(name, document);
    };

    this.delete = function(name) {
        documents.delete(name);
    };

    return this;
};
Cache.prototype.constructor = Cache;

// the maximum cache size
const CACHE_SIZE = 256;

// the actual cache for immutable document types only
const cache = {
    names: new Cache(CACHE_SIZE),
    documents: new Cache(CACHE_SIZE)
};
