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
 * This class implements a storage mechanism wrapper that caches (in memory) all contracts
 * that have been retrieved from the wrapped storage mechanism.  The contracts are assumed
 * to be immutable so no cache consistency issues exist.
 */
const StorageMechanism = require('../StorageMechanism').StorageMechanism;


// DOCUMENT REPOSITORY

/**
 * This function creates a new instance of a cached storage mechanism.  A remote storage
 * mechanism is passed in and is used as the persistent store for all documents.
 *
 * @param {StorageMechanism} storage The actual storage mechanism that maintains documents.
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
    StorageMechanism.call(this, debug);
    debug = this.debug;
    const bali = this.bali;

    // validate the arguments
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
        var citation = cache.names.read(key);
        if (!citation) {
            // not found so we must read from the backend storage
            citation = await storage.readName(name);
            // add the citation to the cache
            if (citation) cache.names.write(name, citation);
        }
        return citation;
    };

    this.writeName = async function(name, citation) {
        // add the name to the backend storage
        await storage.writeName(name, citation);
        // add the name to the cache
        cache.names.write(name, citation);
        return citation;
    };

    this.documentExists = async function(citation) {
        // pass-through, documents are not cached
        return await storage.documentExists(citation);
    };

    this.readDocument = async function(citation) {
        // pass-through, documents are not cached
        return await storage.readDocument(citation);
    };

    this.writeDocument = async function(document) {
        // pass-through, documents are not cached
        return await storage.writeDocument(document);
    };

    this.deleteDocument = async function(citation) {
        // pass-through, documents are not cached
        return await storage.deleteDocument(citation);
    };

    this.contractExists = async function(citation) {
        // check the cache
        const key = generateKey(citation);
        if (cache.contracts.read(key)) return true;
        // not found so we must check the backend storage
        return await storage.contractExists(citation);
    };

    this.readContract = async function(citation) {
        // check the cache
        const key = generateKey(citation);
        var contract = cache.contracts.read(key);
        if (!contract) {
            // not found so we must read from the backend storage
            contract = await storage.readContract(citation);
            // add the contract to the cache
            if (contract) cache.contracts.write(key, contract);
        }
        return contract;
    };

    this.writeContract = async function(contract) {
        // add the contract to the backend storage
        const citation = await storage.writeContract(contract);
        // cache the contract
        const key = generateKey(citation);
        cache.contracts.write(key, contract);
        return citation;
    };

    this.messageAvailable = async function(bag) {
        // pass-through, messages are not cached
        return await storage.messageAvailable(bag);
    };

    this.messageCount = async function(bag) {
        // pass-through, messages are not cached
        return await storage.messageCount(bag);
    };

    this.addMessage = async function(bag, message) {
        // pass-through, messages are not cached
        return await storage.addMessage(bag, message);
    };

    this.removeMessage = async function(bag) {
        // pass-through, messages are not cached
        return await storage.removeMessage(bag);
    };

    this.returnMessage = async function(bag, message) {
        // pass-through, messages are not cached
        return await storage.returnMessage(bag, message);
    };

    this.deleteMessage = async function(bag, citation) {
        // pass-through, messages are not cached
        return await storage.deleteMessage(bag, citation);
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
CachedStorage.prototype = Object.create(StorageMechanism.prototype);
CachedStorage.prototype.constructor = CachedStorage;
exports.CachedStorage = CachedStorage;


// DOCUMENT CACHE

const Cache = function(capacity) {

    const contracts = new Map();

    this.read = function(name) {
        return contracts.get(name);
    };

    this.write = function(name, contract) {
        if (contracts.size > capacity) {
            const oldest = contracts.keys().next().getValue();
            contracts.delete(oldest);
        }
        contracts.set(name, contract);
    };

    this.delete = function(name) {
        contracts.delete(name);
    };

    return this;
};
Cache.prototype.constructor = Cache;

// the maximum cache size
const CACHE_SIZE = 256;

// the actual cache for immutable contract types only
const cache = {
    names: new Cache(CACHE_SIZE),
    contracts: new Cache(CACHE_SIZE)
};
