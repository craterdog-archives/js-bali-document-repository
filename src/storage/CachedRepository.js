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
 * This class implements a document repository wrapper that caches (locally) all documents
 * that have been retrieved from the wrapped document repository.  The documents are assumed
 * to be immutable so no cache consistency issues exist.
 */
const bali = require('bali-component-framework').api();


// DOCUMENT REPOSITORY

/**
 * This function creates a new instance of a cached document repository.  A remote repository
 * is passed in and is used as the persistent store for all documents.
 * 
 * @param {Object} repository The actual repository that maintains documents.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new cached document repository.
 */
const CachedRepository = function(repository, debug) {
    // validate the arguments
    if (debug === null || debug === undefined) debug = 0;  // default is off
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/repositories/CachedRepository', '$CachedRepository', '$repository', repository, [
            '/javascript/Object'
        ]);
    }

    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/repositories/CachedRepository',
            $repository: repository.toString()
        });
        return catalog.toString();
    };

    this.staticExists = async function(resource) {
        try {
            // check the cache first
            const key = generateKey(resource);
            if (cache['statics'] && cache['statics'].read(key)) return true;
            // not found so we must check the backend repository
            return await repository.staticExists(resource);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
                $procedure: '$staticExists',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $resource: resource,
                $text: 'An unexpected error occurred while checking whether or not a static resource exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readStatic = async function(resource) {
        try {
            var object;
            // check the cache first
            const key = generateKey(resource);
            if (cache['statics']) object = cache['statics'].read(key);
            if (!object) {
                // not found so we must read from the backend repository
                object = await repository.readStatic(resource);
                // add the static resource to the cache if it is immutable
                if (object && cache['statics']) cache['statics'].write(resource, object);
            }
            return object;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
                $procedure: '$readStatic',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $resource: resource,
                $text: 'An unexpected error occurred while attempting to read a static resource from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.citationExists = async function(name) {
        try {
            // check the cache first
            const key = generateKey(name);
            if (cache['citations'] && cache['citations'].read(key)) return true;
            // not found so we must check the backend repository
            return await repository.citationExists(name);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
                $procedure: '$citationExists',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $name: name,
                $text: 'An unexpected error occurred while checking whether or not a citation exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readCitation = async function(name) {
        try {
            var citation;
            // check the cache first
            const key = generateKey(name);
            if (cache['citations']) citation = cache['citations'].read(key);
            if (!citation) {
                // not found so we must read from the backend repository
                citation = await repository.readCitation(name);
                // add the citation to the cache if it is immutable
                if (citation && cache['citations']) cache['citations'].write(name, citation);
            }
            return citation;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
                $procedure: '$readCitation',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $name: name,
                $text: 'An unexpected error occurred while attempting to read a citation from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeCitation = async function(name, citation) {
        try {
            // add the citation to the backend repository
            await repository.writeCitation(name, citation);
            // cache the citation
            const key = generateKey(name);
            if (cache['citations']) cache['citations'].write(key, citation);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
                $procedure: '$writeCitation',
                $exception: '$unexpected',
                $repository: repository.toString(),
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
            // check the cache if the document is immutable
            const key = generateKey(tag, version);
            if (cache[type] && cache[type].read(key)) return true;
            // not found so we must check the backend repository
            return await repository.documentExists(type, tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
                $procedure: '$documentExists',
                $exception: '$unexpected',
                $repository: repository.toString(),
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
            var document;
            // check the cache if the document is immutable
            const key = generateKey(tag, version);
            if (cache[type]) document = cache[type].read(key);
            if (!document) {
                // not found so we must read from the backend repository
                document = await repository.readDocument(type, tag, version);
                // add the document to the cache if it is immutable
                if (document && cache[type]) cache[type].write(tag, version, document);
            }
            return document;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
                $procedure: '$readDocument',
                $exception: '$unexpected',
                $repository: repository.toString(),
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
            // add the document to the backend repository
            await repository.writeDocument(type, tag, version, document);
            // cache the document if it is immutable
            const key = generateKey(tag, version);
            if (cache[type]) cache[type].write(key, document);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
                $procedure: '$writeDocument',
                $exception: '$unexpected',
                $repository: repository.toString(),
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
            // pass through, no caching involved since only immutable documents are cached
            return await repository.deleteDocument(type, tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
                $procedure: '$deleteDocument',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $type: type,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to delete a document from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.addMessage = async function(queue, document) {
        try {
            // pass through, messages are not cached
            await repository.addMessage(queue, document);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
                $procedure: '$addMessage',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $queue: queue,
                $identifier: identifier,
                $document: document,
                $text: 'An unexpected error occurred while attempting to add a message to a queue.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.removeMessage = async function(queue) {
        try {
            // pass through, messages are not cached
            return await repository.removeMessage(queue);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/CachedRepository',
                $procedure: '$removeMessage',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $queue: queue,
                $text: 'An unexpected error occurred while attempting to remove a message from a queue.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    const generateKey = function(tag, version) {
        var key = tag.toString().slice(1);
        if (version) key += '/' + version;
        return key;
    };

    return this;
};
CachedRepository.prototype.constructor = CachedRepository;
exports.CachedRepository = CachedRepository;


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

    return this;
};
Cache.prototype.constructor = Cache;

// the maximum cache size
const CACHE_SIZE = 256;

// the actual cache for immutable document types only
const cache = {
    statics: new Cache(CACHE_SIZE),
    citations: new Cache(CACHE_SIZE),
    documents: new Cache(CACHE_SIZE),
    types: new Cache(CACHE_SIZE)
};
