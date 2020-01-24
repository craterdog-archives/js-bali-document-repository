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
        try {
            // check the cache first
            const key = generateKey(name);
            if (cache.names && cache.names.read(key)) return true;
            // not found so we must check the backend storage
            return await storage.nameExists(name);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedStorage',
                $procedure: '$nameExists',
                $exception: '$unexpected',
                $storage: storage.toString(),
                $name: name,
                $text: 'An unexpected error occurred while checking whether or not a citation exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readName = async function(name) {
        try {
            var citation;
            // check the cache first
            const key = generateKey(name);
            if (cache.names) citation = cache.names.read(key);
            if (!citation) {
                // not found so we must read from the backend storage
                citation = await storage.readName(name);
                // add the citation to the cache if it is immutable
                if (citation && cache.names) cache.names.write(name, citation);
            }
            return citation;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedStorage',
                $procedure: '$readName',
                $exception: '$unexpected',
                $storage: storage.toString(),
                $name: name,
                $text: 'An unexpected error occurred while attempting to read a citation from the storage.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeName = async function(name, citation) {
        try {
            // pass-through, citations are not cached
            return await storage.writeName(name, citation);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedStorage',
                $procedure: '$writeName',
                $exception: '$unexpected',
                $storage: storage.toString(),
                $name: name,
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to write a citation to the storage.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.draftExists = async function(tag, version) {
        try {
            // pass-through, drafts are not cached
            return await storage.draftExists(tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedStorage',
                $procedure: '$draftExists',
                $exception: '$unexpected',
                $storage: storage.toString(),
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while checking whether or not a draft exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readDraft = async function(tag, version) {
        try {
            // pass-through, drafts are not cached
            return await storage.readDraft(tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedStorage',
                $procedure: '$readDraft',
                $exception: '$unexpected',
                $storage: storage.toString(),
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to read a draft from the storage.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeDraft = async function(draft) {
        try {
            // pass-through, drafts are not cached
            return await storage.writeDraft(draft);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedStorage',
                $procedure: '$writeDraft',
                $exception: '$unexpected',
                $storage: storage.toString(),
                $tag: tag,
                $version: version,
                $draft: draft,
                $text: 'An unexpected error occurred while attempting to write a draft to the storage.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.deleteDraft = async function(tag, version) {
        try {
            // pass-through, drafts are not cached
            return await storage.deleteDraft(tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedStorage',
                $procedure: '$deleteDraft',
                $exception: '$unexpected',
                $storage: storage.toString(),
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to delete a draft from the storage.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.documentExists = async function(tag, version) {
        try {
            // check the cache
            const key = generateKey(tag, version);
            if (cache.documents.read(key)) return true;
            // not found so we must check the backend storage
            return await storage.documentExists(tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedStorage',
                $procedure: '$documentExists',
                $exception: '$unexpected',
                $storage: storage.toString(),
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while checking whether or not a document exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readDocument = async function(tag, version) {
        try {
            var document;
            // check the cache
            const key = generateKey(tag, version);
            document = cache.documents.read(key);
            if (!document) {
                // not found so we must read from the backend storage
                document = await storage.readDocument(tag, version);
                // add the document to the cache
                if (document) cache.documents.write(key, document);
            }
            return document;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedStorage',
                $procedure: '$readDocument',
                $exception: '$unexpected',
                $storage: storage.toString(),
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to read a document from the storage.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeDocument = async function(document) {
        try {
            // add the document to the backend storage
            const citation = await storage.writeDocument(document);
            // cache the document
            const tag = document.getValue('$content').getParameter('$tag');
            const version = document.getValue('$content').getParameter('$version');
            const key = generateKey(tag, version);
            cache.documents.write(key, document);
            return citation;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedStorage',
                $procedure: '$writeDocument',
                $exception: '$unexpected',
                $storage: storage.toString(),
                $tag: tag,
                $version: version,
                $document: document,
                $text: 'An unexpected error occurred while attempting to write a document to the storage.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.messageCount = async function(bag) {
        try {
            // pass-through, messages are not cached
            return await storage.messageCount(bag);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedStorage',
                $procedure: '$messageCount',
                $exception: '$unexpected',
                $storage: storage.toString(),
                $bag: bag,
                $text: 'An unexpected error occurred while attempting to check the number of messages that are in a bag.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.addMessage = async function(bag, document) {
        try {
            // pass-through, messages are not cached
            return await storage.addMessage(bag, document);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedStorage',
                $procedure: '$addMessage',
                $exception: '$unexpected',
                $storage: storage.toString(),
                $bag: bag,
                $identifier: identifier,
                $document: document,
                $text: 'An unexpected error occurred while attempting to add a message to a bag.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.removeMessage = async function(bag) {
        try {
            // pass-through, messages are not cached
            return await storage.removeMessage(bag);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedStorage',
                $procedure: '$removeMessage',
                $exception: '$unexpected',
                $storage: storage.toString(),
                $bag: bag,
                $text: 'An unexpected error occurred while attempting to remove a message from a bag.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    const generateKey = function(identifier, version) {
        var key = identifier.toString().slice(1);
        if (version) key += '/' + version;
        return key;
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
