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

const DocumentEngine = require('./src/DocumentEngine').DocumentEngine;
const DocumentRepository = require('./src/DocumentRepository').DocumentRepository;
const CachedStorage = require('./src/storage/CachedStorage').CachedStorage;
const LocalStorage = require('./src/storage/LocalStorage').LocalStorage;
const RemoteStorage = require('./src/storage/RemoteStorage').RemoteStorage;
const S3Storage = require('./src/storage/S3Storage').S3Storage;
const ValidatedStorage = require('./src/storage/ValidatedStorage').ValidatedStorage;


/**
 * This function initializes a cached storage mechanism. The documents are cached locally in memory
 * to increase performance. Since all cached documents are immutable there are no cache consistency
 * issues to worry about.
 *
 * @param {Object} storage The storage mechanism used to maintain the documents.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new cached storage mechanism instance.
 */
const cached = function(storage, debug) {
    return new CachedStorage(storage, debug);
};
exports.cached = cached;

/**
 * This function initializes a validated storage mechanism. Each document is validated before being
 * stored by the backing storage mechanism and after being retrieved from the backing storage
 * mechanism. This is useful when the backing storage mechanism is remote and the documents could be
 * modified intentionally or otherwise during transit. The validation is done using a digital notary
 * which validates the notary seal on each document using the referenced notary certificate.
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {Object} storage The storage mechanism used to maintain the documents.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new validating document repository wrapper.
 */
const validated = function(notary, storage, debug) {
    return new ValidatedStorage(notary, storage, debug);
};
exports.validated = validated;

/**
 * This function initializes a local filesystem based storage mechanism. It provides no security
 * around the filesystem and should ONLY be used for local testing.
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {String} directory The top level directory to be used as a local document repository.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new file-based storage mechanism instance.
 */
const local = function(notary, directory, debug) {
    return new LocalStorage(notary, directory, debug);
};
exports.local = local;

/**
 * This function initializes a remote document repository proxy implementation. It accesses a
 * remote document repository service via an HTTPS interface exposed at the specified URI.
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {Reference} uri A reference that defines the URI for the remote repository.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new remote storage mechanism proxy.
 */
const remote = function(notary, uri, debug) {
    return new RemoteStorage(notary, uri, debug);
};
exports.remote = remote;

/**
 * This function initializes an AWS S3 based document repository proxy implementation. It stores
 * the documents in S3 buckets by type.
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {Object} configuration An object containing the configuration for the S3 buckets
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new AWS S3-based storage mechanism instance.
 */
const s3 = function(notary, configuration, debug) {
    return new S3Storage(notary, configuration, debug);
};
exports.s3 = s3;

/**
 * This function initializes a document repository backed by the specified storage mechanism.
 *
 * @param {Object} storage The storage mechanism used to maintain the documents.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new document repository instance.
 */
const repository = function(storage, debug) {
    return new DocumentRepository(storage, debug);
};
exports.repository = repository;

/**
 * This function initializes a document repository configured with a local, memory-based cache that
 * maintains the files in the local filesystem.  It should ONLY be used for testing purposes.
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {String} directory The top level directory to be used as a local storage mechanism.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new document repository instance.
 */
const test = function(notary, directory, debug) {
    return repository(cached(validated(notary, local(notary, directory, debug), debug), debug), debug);
};
exports.test = test;

/**
 * This function initializes a document repository configured with a local, memory based cache that
 * maintains the documents using a remote storage mechanism.  It performs validation on each document
 * before storing it and after retrieving it from the remote storage mechanism.
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {Reference} uri A reference that defines the URI for the remote repository.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new document repository instance.
 */
const client = function(notary, uri, debug) {
    return repository(cached(validated(notary, remote(notary, uri, debug), debug), debug), debug);
};
exports.client = client;

/**
 * This function initializes a document repository configured with an AWS S3-based storage mechanism.
 * It performs validation on each document before storing it and after retrieving it from the S3-based
 * storage mechanism.
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {Object} configuration An object containing the configuration for the S3-based storage
 * mechanism.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new document repository instance.
 */
const service = function(notary, configuration, debug) {
    return repository(validated(notary, s3(notary, configuration, debug), debug), debug);
};
exports.service = service;

/**
 * This function initializes a document engine with a digital notary and a document repository.
 * It enforces the symantics for HTTP requests involving HEAD, GET, PUT, POST, and DELETE methods.
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {DocumentRepository} repository The document repository maintaining the documents being managed
 * through the HTTP service interface.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {DocumentEngine} The Document engine.
 */
const engine = function(notary, repository, debug) {
    return new DocumentEngine(notary, repository, debug);
};
exports.engine = engine;