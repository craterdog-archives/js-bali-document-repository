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
 * This function initializes a local document repository for the Bali Nebula™.
 * 
 * @param {String} directory The directory to be used as a local document repository.
 * @param {Boolean} debug An optional flag that determines whether or not exceptions
 * will be logged to the error console.
 * @returns {Object} A singleton object containing the initialized document repository.
 */
exports.local = function(directory, debug) {
    const repository = require('./src/LocalRepository').repository(directory, debug);
    return repository;
};

/**
 * This function initializes a remote document repository for the Bali Nebula™.
 * 
 * @param {Object} notary An object that implements the digital notary API.
 * @param {Reference} url A reference that defines the URL for the remote repository.
 * @param {Boolean} debug An optional flag that determines whether or not exceptions
 * will be logged to the error console.
 * @returns {Object} A singleton object containing the initialized document repository.
 */
exports.remote = function(notary, url, debug) {
    const repository = require('./src/RemoteRepository').repository(notary, url, debug);
    return repository;
};

/**
 * This function initializes an S3 document repository for the Bali Nebula™.
 * 
 * @param {Boolean} debug An optional flag that determines whether or not exceptions
 * will be logged to the error console.
 * @returns {Object} A singleton object containing the initialized document repository.
 */
exports.s3 = function(debug) {
    const repository = require('./src/S3Repository').repository(debug);
    return repository;
};

