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

/**
 * This function initializes a cached document repository wrapper for the Bali Nebula™.
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
 * @returns {Object} The new cached document repository wrapper.
 */
exports.cached = function(repository, debug) {
    const wrapper = new require('./src/repositories/CachedRepository').CachedRepository(repository, debug);
    return wrapper;
};

/**
 * This function initializes a validating document repository wrapper for the Bali Nebula™.
 * 
 * @param {Object} notary The digital notary to be used to validate the documents.
 * @param {Object} repository The actual repository that maintains documents.
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
exports.validated = function(notary, repository, debug) {
    const wrapper = new require('./src/repositories/ValidatedRepository').ValidatedRepository(notary, repository, debug);
    return wrapper;
};

/**
 * This function initializes a local document repository for the Bali Nebula™.
 * 
 * @param {String} directory The directory to be used as a local document repository.
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
exports.local = function(directory, debug) {
    const repository = new require('./src/repositories/LocalRepository').LocalRepository(directory, debug);
    return repository;
};

/**
 * This function initializes a remote document repository for the Bali Nebula™.
 * 
 * @param {Object} notary An object that implements the digital notary API.
 * @param {Reference} url A reference that defines the URI for the remote repository.
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
exports.remote = function(notary, url, debug) {
    const repository = new require('./src/repositories/RemoteRepository').RemoteRepository(notary, url, debug);
    return repository;
};

/**
 * This function initializes an S3 document repository for the Bali Nebula™.
 * 
 * @param {Object} configuration An object containing the S3 configuration information. 
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
exports.s3 = function(configuration, debug) {
    const repository = new require('./src/repositories/S3Repository').S3Repository(configuration, debug);
    return repository;
};

