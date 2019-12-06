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

const RepositoryAPI = require('./src/RepositoryAPI').RepositoryAPI;
const CachedRepository = require('./src/repositories/CachedRepository').CachedRepository;
const LocalRepository = require('./src/repositories/LocalRepository').LocalRepository;
const RemoteRepository = require('./src/repositories/RemoteRepository').RemoteRepository;
const S3Repository = require('./src/repositories/S3Repository').S3Repository;
const ValidatedRepository = require('./src/repositories/ValidatedRepository').ValidatedRepository;


/**
 * This function initializes a document repository API backed by the specified document
 * repository implementation.
 * 
 * @param {Object} repository The backing document repository that maintains the documents.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new document repository API instance.
 */
const api = function(repository, debug) {
    return new RepositoryAPI(repository, debug);
};
exports.api = api;

/**
 * This function initializes a cached document repository implementation. The documents are
 * cached locally in memory to increase performance. Since all cached documents are immutable
 * there are no cache consistency issues to worry about.
 * 
 * @param {Object} repository The backing document repository that maintains the documents.
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
const cached = function(repository, debug) {
    return new CachedRepository(repository, debug);
};
exports.cached = cached;

/**
 * This function initializes a validated document repository implementation. Each document is
 * validated before being stored in the backing document repository and after being retrieved
 * from the backing document repository. This is useful when the backing repository is remote
 * and the documents could be modified intentionally or otherwise during transit. The validation
 * is done using a digital notary which validates the notary seal on each document using the
 * referenced notary certificate.
 * 
 * @param {Object} repository The backing document repository that maintains the documents.
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
const validated = function(repository, debug) {
    return new ValidatedRepository(repository, debug);
};
exports.validated = validated;

/**
 * This function initializes a local filesystem based document repository implementation. It
 * provides no security around the filesystem and should ONLY be used for local testing.
 * 
 * @param {String} directory The top level directory to be used as a local document repository.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} A singleton object containing the initialized document repository.
 */
const local = function(directory, debug) {
    return new LocalRepository(directory, debug);
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
 * @returns {Object} A singleton object containing the initialized document repository.
 */
const remote = function(notary, uri, debug) {
    return new RemoteRepository(notary, uri, debug);
};
exports.remote = remote;

/**
 * This function initializes an AWS S3 based document repository proxy implementation. It stores
 * the documents in S3 buckets by type.
 * 
 * @param {Object} configuration An object containing the configuration for the S3 buckets
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} A singleton object containing the initialized document repository.
 */
const s3 = function(configuration, debug) {
    return new S3Repository(configuration, debug);
};
exports.s3 = s3;

/**
 * This function initializes a document repository API implementation configured with a local
 * memory based cache and storing the files in the local filesystem.  It should ONLY be used
 * for testing purposes.
 * 
 * @param {String} directory The top level directory to be used as a local document repository.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new document repository API instance.
 */
const test = function(directory, debug) {
    return api(cached(validated(local(directory, debug), debug), debug), debug);
};
exports.test = test;

/**
 * This function initializes a document repository API implementation configured with a local
 * memory based cache and storing the files in a remote document repository.  It performs
 * validation on each document before storing it and after retrieving it from the remote
 * document repository.
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
 * @returns {Object} The new document repository API instance.
 */
const client = function(notary, uri, debug) {
    return api(cached(validated(remote(notary, uri, debug), debug), debug), debug);
};
exports.client = client;

/**
 * This function initializes a document repository API implementation configured with an AWS S3
 * based document repository.  It performs validation on each document before storing it and after
 * retrieving it from the S3 document repository.
 * 
 * @param {Object} configuration An object containing the configuration for the S3 buckets
 * used by the backing document repository.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new document repository API instance.
 */
const service = function(configuration, debug) {
    return api(validated(s3(configuration, debug), debug), debug);
};
exports.service = service;

