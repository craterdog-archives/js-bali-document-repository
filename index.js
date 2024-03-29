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

const CachedStorage = require('./src/storage/CachedStorage').CachedStorage;
const ValidatedStorage = require('./src/storage/ValidatedStorage').ValidatedStorage;
const LocalStorage = require('./src/storage/LocalStorage').LocalStorage;
const RemoteStorage = require('./src/storage/RemoteStorage').RemoteStorage;
const S3Storage = require('./src/storage/S3Storage').S3Storage;
const HTMLEngine = require('./src/HTMLEngine').HTMLEngine;
const WebEngine = require('./src/WebEngine').WebEngine;
const DocumentRepository = require('./src/DocumentRepository').DocumentRepository;


/**
 * This function initializes a cached storage mechanism. The documents are cached locally in memory
 * to increase performance. Since all cached documents are immutable there are no cache consistency
 * issues to worry about.
 *
 * An optional debug argument may be specified that controls the level of debugging that
 * should be applied during execution. The allowed levels are as follows:
 * <pre>
 *   0: no debugging is applied (this is the default value and has the best performance)
 *   1: log any exceptions to console.error before throwing them
 *   2: perform argument validation checks on each call (poor performance)
 *   3: log interesting arguments, states and results to console.log
 * </pre>
 *
 * @param {Object} storage The storage mechanism used to maintain the documents.
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
 * An optional debug argument may be specified that controls the level of debugging that
 * should be applied during execution. The allowed levels are as follows:
 * <pre>
 *   0: no debugging is applied (this is the default value and has the best performance)
 *   1: log any exceptions to console.error before throwing them
 *   2: perform argument validation checks on each call (poor performance)
 *   3: log interesting arguments, states and results to console.log
 * </pre>
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {Object} storage The storage mechanism used to maintain the documents.
 * @returns {Object} The new validating storage mechanism wrapper.
 */
const validated = function(notary, storage, debug) {
    return new ValidatedStorage(notary, storage, debug);
};
exports.validated = validated;

/**
 * This function initializes a local filesystem based storage mechanism. It provides no security
 * around the filesystem and should ONLY be used for local testing.
 *
 * An optional debug argument may be specified that controls the level of debugging that
 * should be applied during execution. The allowed levels are as follows:
 * <pre>
 *   0: no debugging is applied (this is the default value and has the best performance)
 *   1: log any exceptions to console.error before throwing them
 *   2: perform argument validation checks on each call (poor performance)
 *   3: log interesting arguments, states and results to console.log
 * </pre>
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {String} directory The top level directory to be used as a local storage mechanism.
 * @returns {Object} The new file-based storage mechanism instance.
 */
const local = function(notary, directory, debug) {
    return new LocalStorage(notary, directory, debug);
};
exports.local = local;

/**
 * This function initializes a remote storage mechanism proxy implementation. It accesses a
 * remote storage mechanism service via an HTTPS interface exposed at the specified URI.
 *
 * An optional debug argument may be specified that controls the level of debugging that
 * should be applied during execution. The allowed levels are as follows:
 * <pre>
 *   0: no debugging is applied (this is the default value and has the best performance)
 *   1: log any exceptions to console.error before throwing them
 *   2: perform argument validation checks on each call (poor performance)
 *   3: log interesting arguments, states and results to console.log
 * </pre>
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {Resource} uri A resource that defines the URI for the remote storage.
 * @returns {Object} The new remote storage mechanism proxy.
 */
const remote = function(notary, uri, debug) {
    return new RemoteStorage(notary, uri, debug);
};
exports.remote = remote;

/**
 * This function initializes an AWS S3 based storage mechanism proxy implementation. It stores
 * the documents in S3 buckets by type.
 *
 * An optional debug argument may be specified that controls the level of debugging that
 * should be applied during execution. The allowed levels are as follows:
 * <pre>
 *   0: no debugging is applied (this is the default value and has the best performance)
 *   1: log any exceptions to console.error before throwing them
 *   2: perform argument validation checks on each call (poor performance)
 *   3: log interesting arguments, states and results to console.log
 * </pre>
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {Object} configuration An object containing the configuration for the S3 buckets
 * @returns {Object} The new AWS S3-based storage mechanism instance.
 */
const s3 = function(notary, configuration, debug) {
    return new S3Storage(notary, configuration, debug);
};
exports.s3 = s3;

/**
 * This function initializes a storage mechanism configured with a local, memory-based cache that
 * maintains the files in the local filesystem.  It should ONLY be used for testing purposes.
 *
 * An optional debug argument may be specified that controls the level of debugging that
 * should be applied during execution. The allowed levels are as follows:
 * <pre>
 *   0: no debugging is applied (this is the default value and has the best performance)
 *   1: log any exceptions to console.error before throwing them
 *   2: perform argument validation checks on each call (poor performance)
 *   3: log interesting arguments, states and results to console.log
 * </pre>
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {String} directory The top level directory to be used as a local storage mechanism.
 * @returns {Object} The new storage mechanism instance.
 */
const test = function(notary, directory, debug) {
    return cached(validated(notary, local(notary, directory, debug), debug), debug);
};
exports.test = test;

/**
 * This function initializes a storage mechanism configured with a local, memory based cache that
 * maintains the documents using a remote storage mechanism.  It performs validation on each document
 * before storing it and after retrieving it from the remote storage mechanism.
 *
 * An optional debug argument may be specified that controls the level of debugging that
 * should be applied during execution. The allowed levels are as follows:
 * <pre>
 *   0: no debugging is applied (this is the default value and has the best performance)
 *   1: log any exceptions to console.error before throwing them
 *   2: perform argument validation checks on each call (poor performance)
 *   3: log interesting arguments, states and results to console.log
 * </pre>
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {Resource} uri A resource that defines the URI for the remote storage.
 * @returns {Object} The new storage mechanism instance.
 */
const client = function(notary, uri, debug) {
    return cached(validated(notary, remote(notary, uri, debug), debug), debug);
};
exports.client = client;

/**
 * This function initializes a storage mechanism configured with an AWS S3-based storage mechanism.
 * It performs validation on each document before storing it and after retrieving it from the S3-based
 * storage mechanism.
 *
 * An optional debug argument may be specified that controls the level of debugging that
 * should be applied during execution. The allowed levels are as follows:
 * <pre>
 *   0: no debugging is applied (this is the default value and has the best performance)
 *   1: log any exceptions to console.error before throwing them
 *   2: perform argument validation checks on each call (poor performance)
 *   3: log interesting arguments, states and results to console.log
 * </pre>
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {Object} configuration An object containing the configuration for the S3-based storage
 * mechanism.
 * @returns {Object} The new storage mechanism instance.
 */
const service = function(notary, configuration, debug) {
    return validated(notary, s3(notary, configuration, debug), debug);
};
exports.service = service;

/**
 * This function initializes an HTML engine with a digital notary and a storage mechanism.
 * It enforces the symantics for HTTP requests involving HEAD, GET, PUT, POST, and DELETE methods.
 *
 * An optional debug argument may be specified that controls the level of debugging that
 * should be applied during execution. The allowed levels are as follows:
 * <pre>
 *   0: no debugging is applied (this is the default value and has the best performance)
 *   1: log any exceptions to console.error before throwing them
 *   2: perform argument validation checks on each call (poor performance)
 *   3: log interesting arguments, states and results to console.log
 * </pre>
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {Object} storage The storage mechanism maintaining the documents being managed
 * through the HTTP service interface.
 * @returns {HTMLEngine} The HTML engine.
 */
const html = function(notary, storage, debug) {
    return new HTMLEngine(notary, storage, debug);
};
exports.html = html;

/**
 * This function initializes a web service engine with a digital notary and a storage mechanism.
 * It enforces the symantics for HTTP requests involving HEAD, GET, PUT, POST, and DELETE methods.
 *
 * An optional debug argument may be specified that controls the level of debugging that
 * should be applied during execution. The allowed levels are as follows:
 * <pre>
 *   0: no debugging is applied (this is the default value and has the best performance)
 *   1: log any exceptions to console.error before throwing them
 *   2: perform argument validation checks on each call (poor performance)
 *   3: log interesting arguments, states and results to console.log
 * </pre>
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {Object} storage The storage mechanism maintaining the documents being managed
 * through the HTTP service interface.
 * @returns {WebEngine} The web service engine.
 */
const web = function(notary, storage, debug) {
    return new WebEngine(notary, storage, debug);
};
exports.web = web;

/**
 * This function initializes a document repository backed by the specified storage mechanism.
 *
 * An optional debug argument may be specified that controls the level of debugging that
 * should be applied during execution. The allowed levels are as follows:
 * <pre>
 *   0: no debugging is applied (this is the default value and has the best performance)
 *   1: log any exceptions to console.error before throwing them
 *   2: perform argument validation checks on each call (poor performance)
 *   3: log interesting arguments, states and results to console.log
 * </pre>
 *
 * @param {DigitalNotary} notary An object that implements the digital notary API.
 * @param {Object} storage The storage mechanism used to maintain the documents.
 * @returns {DocumentRepository} The new document repository instance.
 */
const repository = function(notary, storage, debug) {
    return new DocumentRepository(notary, storage, debug);
};
exports.repository = repository;

