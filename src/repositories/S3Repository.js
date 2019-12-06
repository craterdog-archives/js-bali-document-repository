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
 * This class implements an AWS S3 bucket based document repository.  It treats
 * documents as UTF-8 encoded strings.
 */
const aws = new require('aws-sdk/clients/s3');
const s3 = new aws({apiVersion: '2006-03-01'});
const bali = require('bali-component-framework').api();


// PRIVATE CONSTANTS

// the POSIX end of line character
const EOL = '\n';


// DOCUMENT REPOSITORY

/**
 * This function creates a new instance of an S3 document repository proxy.
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
 * @returns {Object} The new S3 document repository proxy.
 */
const S3Repository = function(configuration, debug) {
    // validate the arguments
    if (debug === null || debug === undefined) debug = 0;  // default is off
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/repositories/S3Repository', '$S3Repository', '$configuration', configuration, [
            '/javascript/Object'
        ]);
    }
    const uri = configuration.uri;

    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/repositories/S3Repository',
            $configuration: configuration
        });
        return catalog.toString();
    };

    this.citationExists = async function(name) {
        try {
            const bucket = configuration['citations'];
            const key = generateKey(name);
            return await doesExist(bucket, key);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$citationExists',
                $exception: '$unexpected',
                $uri: uri,
                $name: name,
                $text: 'An unexpected error occurred while checking whether or not a citation exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readCitation = async function(name) {
        try {
            const bucket = configuration['citations'];
            const key = generateKey(name);
            var citation = await getObject(bucket, key);
            if (citation) {
                citation = bali.component(citation);
            }
            return citation;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$readCitation',
                $exception: '$unexpected',
                $uri: uri,
                $name: name,
                $text: 'An unexpected error occurred while attempting to read a citation from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeCitation = async function(name, citation) {
        try {
            const bucket = configuration['citations'];
            const key = generateKey(name);
            if (await doesExist(bucket, key)) throw Error('The citation already exists.');
            const source = citation.toString() + EOL;  // add POSIX compliant <EOL>
            await putObject(bucket, key, source);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$writeCitation',
                $exception: '$unexpected',
                $uri: uri,
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
            const bucket = configuration[type];
            const key = generateKey(tag, version);
            return await doesExist(bucket, key);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$documentExists',
                $exception: '$unexpected',
                $uri: uri,
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
            const bucket = configuration[type];
            const key = generateKey(tag, version);
            var document = await getObject(bucket, key);
            if (document) {
                document = bali.component(document);
            }
            return document;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$readDocument',
                $exception: '$unexpected',
                $uri: uri,
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
            const bucket = configuration[type];
            const key = generateKey(tag, version);
            if (type !== 'drafts' && await doesExist(bucket, key)) throw Error('The document already exists.');
            const source = document.toString() + EOL;  // add POSIX compliant <EOL>
            await putObject(bucket, key, source);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$writeDocument',
                $exception: '$unexpected',
                $uri: uri,
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
            const bucket = configuration[type];
            const key = generateKey(tag, version);
            var document = await getObject(bucket, key);
            if (document) {
                document = bali.component(document);
                await deleteObject(bucket, key);
            }
            return document;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$deleteDocument',
                $exception: '$unexpected',
                $uri: uri,
                $type: type,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to delete a document from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.addMessage = async function(queue, message) {
        const identifier = bali.tag().getValue();
        try {
            const bucket = configuration['queues'];
            const key = generateKey(queue, identifier);
            const source = message.toString() + EOL;  // add POSIX compliant <EOL>
            await putObject(bucket, key, source);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$addMessage',
                $exception: '$unexpected',
                $uri: uri,
                $queue: queue,
                $identifier: identifier,
                $message: message,
                $text: 'An unexpected error occurred while attempting to add a message to a queue.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.removeMessage = async function(queue) {
        try {
            while (true) {
                const bucket = configuration['queues'];
                var key = generatePrefix(queue);
                const list = await listObjects(bucket, key);
                const count = list.length;
                if (count === 0) break;  // no more messages
                const messages = bali.list(list);
                // select a message at random since a distributed queue cannot guarantee FIFO
                const generator = bali.generator();
                const index = generator.generateIndex(count);
                key = messages.getItem(index).getValue();
                var message = await getObject(bucket, key);
                if (message) {
                    message = bali.component(message);
                    await deleteObject(bucket, key);
                    return message;  // we got there first
                }
                // someone else got there first, keep trying
            }
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Repository',
                $procedure: '$removeMessage',
                $exception: '$unexpected',
                $uri: uri,
                $queue: queue,
                $text: 'An unexpected error occurred while attempting to remove a message from a queue.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    return this;
};
S3Repository.prototype.constructor = S3Repository;
exports.S3Repository = S3Repository;


// AWS S3 PROMISIFICATION

const generatePrefix = function(path) {
    return path.toString().slice(1);  // remove the leading '#' or '/'
};


const generateKey = function(path, identifier) {
    var key = path.toString().slice(1);  // remove the leading '#' or '/'
    if (identifier) key += '/' + identifier.toString();
    key += '.bali';
    return key;
};


const listObjects = function(bucket, prefix) {
    return new Promise(function(resolve, reject) {
        try {
            s3.listObjectsV2({Bucket: bucket, Prefix: prefix, MaxKeys: 64}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    const list = [];
                    data.Contents.forEach(function(object) {
                        list.push(object.Key);
                    });
                    resolve(list);
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const doesExist = function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            s3.headObject({Bucket: bucket, Key: key}, function(error, data) {
                if (error || data.DeleteMarker || !data.ContentLength) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const getObject = function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            s3.getObject({Bucket: bucket, Key: key}, function(error, data) {
                if (error || data.DeleteMarker || !data.ContentLength) {
                    resolve(undefined);
                } else {
                    resolve(data.Body.toString());
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const putObject = function(bucket, key, object) {
    return new Promise(function(resolve, reject) {
        try {
            s3.putObject({Bucket: bucket, Key: key, Body: object.toString()}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const deleteObject = function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            s3.deleteObject({Bucket: bucket, Key: key}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};
